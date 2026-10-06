import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckSquare, Square, Tags, TrendingUp, Wand2, Wheat } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Callout, cx, Empty, List, Page, Section, useUi } from '../../components/ui'
import { IconTile, SpeciesIcon } from '../../components/icons'
import { db, uid } from '../../db/db'
import { COMMON_TEMPLATE, TEMPLATES, tplCategoryId, type TplCategory, type TplFeed } from '../../db/templates'
import { SPECIES_SEED } from '../../db/seed'
import type { LText, Species } from '../../db/types'
import { addDays, formatDate, today } from '../../lib/dates'
import { formatNum } from '../../lib/money'

type Item =
  | { id: string; kind: 'category'; cat: TplCategory; type: 'expense' | 'income'; species?: Species }
  | { id: string; kind: 'feed'; feed: TplFeed }
  | { id: string; kind: 'ration'; feed: TplFeed; species: Species }
  | { id: string; kind: 'health'; title: string; type: string; date: string; species: Species }
  | { id: string; kind: 'price'; species: Species; perKg: number }

const norm = (s: string) => s.trim().toLowerCase()

/** Tanlangan turlar uchun kategoriya, yem, ratsion, emlash va narxlarni taklif qiladi */
export function SetupPage() {
  const f = useFarm()
  const { t, lt, money, settings, update, farmId } = useSettings()
  const { toast } = useUi()
  const nav = useNavigate()

  const templSpecies = f.species.filter((s) => s.key && TEMPLATES[s.key])
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(templSpecies.filter((s) => s.enabled || f.headsBySpecies.has(s.id)).map((s) => s.id)),
  )
  const [off, setOff] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const feedByName = useMemo(() => {
    const m = new Map<string, string>()
    for (const x of f.feedItems) m.set(norm(x.name), x.id)
    return m
  }, [f.feedItems])
  const findFeed = (fd: TplFeed) => feedByName.get(norm(fd.name.uz)) ?? feedByName.get(norm(fd.name.ru))

  // Tanlangan turlar bo'yicha takliflar (mavjudlari chiqarib tashlanadi)
  const items = useMemo(() => {
    const out: Item[] = []
    const seen = new Set<string>()
    const push = (it: Item) => {
      if (seen.has(it.id)) return
      seen.add(it.id)
      out.push(it)
    }
    const species = templSpecies.filter((s) => picked.has(s.id))
    const addCats = (cats: TplCategory[], type: 'expense' | 'income', sp?: Species) => {
      for (const c of cats) {
        const id = tplCategoryId(type, c.key)
        if (f.catMap.has(id)) continue
        push({ id: 'cat:' + id, kind: 'category', cat: c, type, species: sp })
      }
    }
    for (const sp of species) {
      const tpl = TEMPLATES[sp.key!]
      addCats(tpl.expense, 'expense', sp)
      addCats(tpl.income, 'income', sp)
    }
    if (species.length) {
      addCats(COMMON_TEMPLATE.expense, 'expense')
      addCats(COMMON_TEMPLATE.income, 'income')
    }
    for (const sp of species) {
      for (const fd of TEMPLATES[sp.key!].feeds) if (!findFeed(fd)) push({ id: 'feed:' + fd.key, kind: 'feed', feed: fd })
    }
    for (const sp of species) {
      for (const fd of TEMPLATES[sp.key!].feeds) {
        if (!fd.perHeadDay) continue
        const fid = findFeed(fd)
        if (fid && f.rations.some((r) => r.feedItemId === fid && r.scope === 'species' && r.targetId === sp.id)) continue
        push({ id: `ration:${sp.id}:${fd.key}`, kind: 'ration', feed: fd, species: sp })
      }
    }
    for (const sp of species) {
      for (const h of TEMPLATES[sp.key!].health) {
        const title = `${lt(h.title)} — ${lt(sp.name)}`
        if (f.reminders.some((r) => !r.done && r.title === title)) continue
        push({ id: `health:${sp.id}:${h.key}`, kind: 'health', title, type: h.type, date: addDays(today(), h.inDays), species: sp })
      }
    }
    for (const sp of species) {
      if (settings.marketPrices[sp.id]?.perKg || settings.marketPrices[sp.id]?.perHead) continue
      const perKg = SPECIES_SEED.find((x) => 'sp_' + x.key === sp.id)?.perKg
      if (perKg) push({ id: 'price:' + sp.id, kind: 'price', species: sp, perKg })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, f.catMap, f.feedItems, f.rations, f.reminders, settings.marketPrices, lt])

  const selected = items.filter((i) => !off.has(i.id))
  const toggle = (id: string) => {
    const n = new Set(off)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    setOff(n)
  }
  const toggleGroup = (ids: string[]) => {
    const n = new Set(off)
    const allOn = ids.every((id) => !n.has(id))
    for (const id of ids) {
      if (allOn) n.add(id)
      else n.delete(id)
    }
    setOff(n)
  }

  const apply = async () => {
    if (!selected.length) return
    setBusy(true)
    try {
      const now = Date.now()
      const prices = { ...settings.marketPrices }
      await db.transaction('rw', [db.categories, db.feedItems, db.rations, db.reminders], async () => {
        const feedIds = new Map<string, string>()
        const ensureFeed = async (fd: TplFeed) => {
          const existing = feedIds.get(fd.key) ?? findFeed(fd)
          if (existing) return existing
          const id = uid()
          await db.feedItems.add({ id, farmId, name: lt(fd.name), unit: fd.unit, stock: 0, avgPrice: fd.price, createdAt: now })
          feedIds.set(fd.key, id)
          return id
        }
        for (const it of selected) {
          if (it.kind === 'category')
            await db.categories.put({ id: tplCategoryId(it.type, it.cat.key), kind: it.type, name: it.cat.name, color: it.cat.color, builtin: false })
          else if (it.kind === 'feed') await ensureFeed(it.feed)
          else if (it.kind === 'ration') {
            const fid = await ensureFeed(it.feed)
            await db.rations.add({ id: uid(), farmId, feedItemId: fid, scope: 'species', targetId: it.species.id, perHeadDay: it.feed.perHeadDay! })
          } else if (it.kind === 'health')
            await db.reminders.add({ id: uid(), farmId, date: it.date, title: it.title, note: t('Avtomatik sozlashdan (taxminiy sana)', 'Из автонастройки (примерная дата)'), done: false, createdAt: now })
          else if (it.kind === 'price') prices[it.species.id] = { ...prices[it.species.id], perKg: it.perKg }
        }
      })
      await update({ marketPrices: prices, setupDone: true })
      toast(t(`${selected.length} ta narsa qo'shildi`, `Добавлено: ${selected.length}`))
      setOff(new Set())
    } finally {
      setBusy(false)
    }
  }

  const groups: { key: Item['kind'] | 'income'; title: string; icon: ReactNode; list: Item[] }[] = [
    { key: 'category', title: t('Xarajat turlari', 'Статьи расходов'), icon: <IconTile icon={Tags} color="#dc2626" size="sm" />, list: items.filter((i) => i.kind === 'category' && i.type === 'expense') },
    { key: 'income', title: t('Daromad turlari', 'Статьи доходов'), icon: <IconTile icon={Tags} color="#16a34a" size="sm" />, list: items.filter((i) => i.kind === 'category' && i.type === 'income') },
    { key: 'feed', title: t('Yem omboriga (taxminiy narx)', 'Корма на склад (примерная цена)'), icon: <IconTile icon={Wheat} color="#a16207" size="sm" />, list: items.filter((i) => i.kind === 'feed') },
    { key: 'ration', title: t('Kunlik ratsion (1 bosh)', 'Суточный рацион (1 гол.)'), icon: <IconTile icon={Wheat} color="#65a30d" size="sm" />, list: items.filter((i) => i.kind === 'ration') },
    { key: 'health', title: t('Emlash va ishlov eslatmalari', 'Напоминания о вакцинации и обработке'), icon: <IconTile icon={Bell} color="#ea580c" size="sm" />, list: items.filter((i) => i.kind === 'health') },
    { key: 'price', title: t('Bozor narxlari (1 kg tirik vazn)', 'Рыночные цены (1 кг живого веса)'), icon: <IconTile icon={TrendingUp} color="#2563eb" size="sm" />, list: items.filter((i) => i.kind === 'price') },
  ]

  const label = (it: Item): { title: ReactNode; sub?: ReactNode } => {
    const nm = (x: LText) => lt(x)
    switch (it.kind) {
      case 'category':
        return {
          title: (
            <span className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: it.cat.color }} />
              {nm(it.cat.name)}
            </span>
          ),
          sub: it.species ? lt(it.species.name) : t('Umumiy', 'Общее'),
        }
      case 'feed':
        return { title: nm(it.feed.name), sub: `≈ ${money(it.feed.price)} / ${it.feed.unit}` }
      case 'ration':
        return { title: `${lt(it.species.name)}: ${nm(it.feed.name)}`, sub: `${formatNum(it.feed.perHeadDay!, 2)} ${it.feed.unit} / ${t('kun', 'день')}` }
      case 'health':
        return { title: it.title, sub: `${t('Eslatma', 'Напоминание')}: ${formatDate(it.date)}` }
      case 'price':
        return { title: lt(it.species.name), sub: `≈ ${money(it.perKg)} / kg` }
    }
  }

  return (
    <Page back title={t('Avtomatik sozlash', 'Автонастройка')}>
      <Callout tone="info" icon={<Wand2 size={18} />}>
        {t(
          "Boqadigan hayvonlaringizni tanlang — ularga mos xarajat va daromad turlari, yem ro'yxati (taxminiy narx bilan), kunlik ratsion, emlash eslatmalari va bozor narxlari taklif qilinadi. Keraksizini belgidan olib tashlang. Hammasini keyin o'zgartirish mumkin.",
          'Выберите своих животных — предложим подходящие статьи расходов и доходов, корма (с примерной ценой), рацион, напоминания о вакцинации и рыночные цены. Снимите галочку с ненужного. Всё можно изменить потом.',
        )}
      </Callout>

      <Section title={t('Hayvon turlari', 'Виды животных')} className="mt-4">
        <div className="flex flex-wrap gap-2">
          {templSpecies.map((s) => {
            const on = picked.has(s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  const n = new Set(picked)
                  if (on) n.delete(s.id)
                  else n.add(s.id)
                  setPicked(n)
                }}
                className={cx(
                  'flex h-10 items-center gap-2 rounded-xl border-2 px-3 text-sm font-medium transition',
                  on ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200' : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900',
                )}
              >
                <SpeciesIcon s={s} size={18} />
                {lt(s.name)}
              </button>
            )
          })}
        </div>
      </Section>

      {items.length === 0 ? (
        <Empty
          icon={<CheckSquare size={30} />}
          title={picked.size ? t("Hammasi allaqachon qo'shilgan", 'Всё уже добавлено') : t('Hayvon turini tanlang', 'Выберите вид животных')}
          text={picked.size ? t("Tanlangan turlar uchun yangi taklif yo'q.", 'Для выбранных видов новых предложений нет.') : undefined}
          action={picked.size ? <Button variant="secondary" onClick={() => nav(-1)}>{t('Orqaga', 'Назад')}</Button> : undefined}
        />
      ) : (
        groups
          .filter((g) => g.list.length)
          .map((g) => {
            const ids = g.list.map((i) => i.id)
            const allOn = ids.every((id) => !off.has(id))
            return (
              <Section
                key={g.key}
                title={<span className="flex items-center gap-2">{g.icon}{g.title}</span>}
                action={
                  <button className="text-sm font-medium text-brand-700 dark:text-brand-400" onClick={() => toggleGroup(ids)}>
                    {allOn ? t('Hech biri', 'Снять все') : t('Hammasi', 'Выбрать все')}
                  </button>
                }
              >
                <List>
                  {g.list.map((it) => {
                    const on = !off.has(it.id)
                    const l = label(it)
                    return (
                      <button key={it.id} type="button" onClick={() => toggle(it.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50">
                        {on ? <CheckSquare size={22} className="shrink-0 text-brand-600" /> : <Square size={22} className="shrink-0 text-stone-400" />}
                        <span className="min-w-0 flex-1">
                          <span className={cx('block truncate font-medium', !on && 'text-stone-400')}>{l.title}</span>
                          {l.sub && <span className="block truncate text-sm text-stone-500">{l.sub}</span>}
                        </span>
                      </button>
                    )
                  })}
                </List>
              </Section>
            )
          })
      )}

      {items.length > 0 && (
        <div className="pb-safe sticky bottom-20 z-10 mt-2 md:bottom-4">
          <Button full size="lg" disabled={busy || !selected.length} onClick={apply} icon={<Wand2 size={20} />} className="shadow-lg">
            {t(`Tanlanganlarni qo'shish (${selected.length})`, `Добавить выбранное (${selected.length})`)}
          </Button>
        </div>
      )}
    </Page>
  )
}
