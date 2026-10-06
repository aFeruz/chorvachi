import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Baby, CheckSquare, FolderInput, Layers, PawPrint, Plus, Search, Square, X } from 'lucide-react'
import { IconTile, SpeciesAvatar, SpeciesIcon } from '../../components/icons'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import {
  Badge, Button, Card, Chips, cx, Empty, Fab, Field, IconButton, Input, List, ListRow, Page, Segmented, Select, Sheet, useUi,
} from '../../components/ui'
import { ageText, purposeLabel, sexLabel, statusLabel, statusTone } from '../../components/labels'
import { ageMonths } from '../../lib/dates'
import { formatNum } from '../../lib/money'
import { moveAnimalsToGroup } from '../../db/repo'
import { SaleSheet } from './SaleSheet'

type Tab = 'animals' | 'groups'
type StatusF = 'active' | 'out' | 'all'

export function HerdPage() {
  const f = useFarm()
  const { t, lt, short } = useSettings()
  const { toast } = useUi()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get('tab') as Tab) || 'animals'
  const species = sp.get('species') ?? ''
  const [status, setStatus] = useState<StatusF>('active')
  const [groupF, setGroupF] = useState('')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string> | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveTo, setMoveTo] = useState('')
  const [saleOpen, setSaleOpen] = useState(false)

  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    if (v) n.set(k, v)
    else n.delete(k)
    setSp(n, { replace: true })
  }

  const usedSpecies = useMemo(() => {
    const ids = new Set([...f.animals.map((a) => a.speciesId), ...f.groups.map((g) => g.speciesId)])
    return f.species.filter((s) => ids.has(s.id))
  }, [f.animals, f.groups, f.species])

  const animals = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return f.animals.filter(
      (a) =>
        (!species || a.speciesId === species) &&
        (!groupF || a.groupId === groupF || (groupF === '-' && !a.groupId)) &&
        (status === 'all' || (status === 'active' ? a.status === 'active' : a.status !== 'active')) &&
        (!qq || a.tag.toLowerCase().includes(qq) || (a.name ?? '').toLowerCase().includes(qq) || (a.breed ?? '').toLowerCase().includes(qq)),
    )
  }, [f.animals, species, groupF, status, q])

  const groups = f.groups.filter((g) => (!species || g.speciesId === species))
  const selected = sel ? animals.filter((a) => sel.has(a.id)) : []

  const toggle = (id: string) => {
    if (!sel) return
    const n = new Set(sel)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    setSel(n)
  }

  return (
    <Page
      title={t('Poda', 'Стадо')}
      actions={
        tab === 'animals' &&
        (sel ? (
          <IconButton onClick={() => setSel(null)} aria-label="cancel"><X /></IconButton>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setSel(new Set())}>{t('Tanlash', 'Выбрать')}</Button>
        ))
      }
    >
      <Segmented
        className="mb-3"
        value={tab}
        onChange={(v) => setParam('tab', v === 'animals' ? '' : v)}
        options={[
          { value: 'animals', label: `${t('Hayvonlar', 'Животные')} (${f.activeAnimals.length})` },
          { value: 'groups', label: `${t('Guruhlar', 'Группы')} (${f.groups.filter((g) => g.status === 'active').length})` },
        ]}
      />
      {usedSpecies.length > 1 && (
        <Chips
          value={species}
          onChange={(v) => setParam('species', v)}
          options={[{ value: '', label: t('Barchasi', 'Все') }, ...usedSpecies.map((s) => ({ value: s.id, label: <span className="flex items-center gap-1.5"><SpeciesIcon s={s} size={16} />{lt(s.name)}</span> }))]}
        />
      )}

      {tab === 'animals' ? (
        <>
          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Raqam, nom, zot...', 'Номер, кличка, порода...')} className="pl-10" />
            </div>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusF)}
              className="w-32"
              options={[
                { value: 'active', label: t('Faol', 'Активные') },
                { value: 'out', label: t('Chiqib ketgan', 'Выбывшие') },
                { value: 'all', label: t('Hammasi', 'Все') },
              ]}
            />
          </div>
          {f.groups.length > 0 && (
            <Select
              className="mb-3"
              value={groupF}
              onChange={(e) => setGroupF(e.target.value)}
              placeholder={t('Barcha guruhlar', 'Все группы')}
              options={[
                ...f.groups.filter((g) => !f.isGroupMode(g)).map((g) => ({ value: g.id, label: g.name })),
                { value: '-', label: t('Guruhsiz', 'Без группы') },
              ]}
            />
          )}
          {animals.length === 0 ? (
            <Empty
              icon={<PawPrint size={30} />}
              title={f.animals.length ? t('Hech narsa topilmadi', 'Ничего не найдено') : t("Hali hayvon yo'q", 'Животных пока нет')}
              text={t(
                "Qo'y, sigir, echki kabi hayvonlarni alohida qo'shing. Tovuq, baliq kabi ko'p sonli hayvonlar uchun «Guruh» yarating.",
                'Овец, коров, коз добавляйте поштучно. Для кур, рыбы и т.п. создайте «Группу».',
              )}
              action={<Button onClick={() => nav('/animal/new')} icon={<Plus size={18} />}>{t("Hayvon qo'shish", 'Добавить животное')}</Button>}
            />
          ) : (
            <List>
              {animals.map((a) => {
                const s = f.speciesMap.get(a.speciesId)
                const w = f.weightOf(a.id)
                const cost = f.costOf(a.id).total
                const sub = [
                  sexLabel(t, a.sex),
                  a.breed,
                  a.birthDate ? ageText(t, ageMonths(a.birthDate)) : '',
                  w ? `${formatNum(w)} kg` : '',
                  a.groupId ? f.groupMap.get(a.groupId)?.name : '',
                ].filter(Boolean).join(' · ')
                return (
                  <ListRow
                    key={a.id}
                    onClick={() => (sel ? toggle(a.id) : nav('/animal/' + a.id))}
                    left={
                      sel ? (
                        <span className="grid size-11 place-items-center text-brand-700">{sel.has(a.id) ? <CheckSquare /> : <Square className="text-stone-400" />}</span>
                      ) : a.photo ? (
                        <img src={a.photo} className="size-11 rounded-xl object-cover" alt="" />
                      ) : (
                        <SpeciesAvatar s={s} />
                      )
                    }
                    title={
                      <span className="flex items-center gap-2">
                        {a.tag}
                        {a.name && <span className="font-normal text-stone-500">{a.name}</span>}
                        {a.status !== 'active' && <Badge tone={statusTone(a.status)}>{statusLabel(t, a.status)}</Badge>}
                      </span>
                    }
                    sub={sub}
                    right={
                      <div>
                        <div className="text-sm font-semibold tabular-nums">{short(cost)}</div>
                        <div className="text-[11px] text-stone-500">{t('tannarx', 'себест.')}</div>
                      </div>
                    }
                  />
                )
              })}
            </List>
          )}
        </>
      ) : groups.length === 0 ? (
        <Empty
          icon={<Layers size={30} />}
          title={t("Guruhlar yo'q", 'Групп нет')}
          text={t(
            "Guruh — bu poda yoki partiya. Masalan: «Bo'rdoqi qo'chqorlar» yoki «Broyler 300 bosh». Parranda va baliqlar faqat guruh sifatida hisoblanadi.",
            'Группа — это стадо или партия. Например: «Бычки на откорм» или «Бройлер 300 голов». Птица и рыба учитываются группами.',
          )}
          action={<Button onClick={() => nav('/group/new')} icon={<Plus size={18} />}>{t('Guruh yaratish', 'Создать группу')}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => {
            const s = f.speciesMap.get(g.speciesId)
            const heads = f.headsOf(g)
            const cost = f.groupCost(g).total
            return (
              <Card key={g.id} onClick={() => nav('/group/' + g.id)} className={cx(g.status === 'closed' && 'opacity-60')}>
                <div className="flex items-start gap-3">
                  <SpeciesAvatar s={s} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{g.name}</div>
                    <div className="text-sm text-stone-500">{purposeLabel(t, g.purpose)}</div>
                  </div>
                  {g.status === 'closed' && <Badge>{t('Yopilgan', 'Закрыта')}</Badge>}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-xl bg-stone-100 p-2 dark:bg-stone-800">
                    <div className="font-bold">{formatNum(heads, 0)}</div>
                    <div className="text-xs text-stone-500">{t('bosh', 'гол.')}</div>
                  </div>
                  <div className="rounded-xl bg-stone-100 p-2 dark:bg-stone-800">
                    <div className="font-bold">{short(cost)}</div>
                    <div className="text-xs text-stone-500">{t('xarajat', 'затраты')}</div>
                  </div>
                  <div className="rounded-xl bg-stone-100 p-2 dark:bg-stone-800">
                    <div className="font-bold">{heads ? short(cost / heads) : '—'}</div>
                    <div className="text-xs text-stone-500">{t('1 bosh', '1 гол.')}</div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {sel ? (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white p-3 md:left-60 dark:border-stone-800 dark:bg-stone-900">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <button className="text-sm font-medium text-brand-700" onClick={() => setSel(sel.size === animals.length ? new Set() : new Set(animals.map((a) => a.id)))}>
              {sel.size === animals.length ? t('Bekor', 'Снять') : t('Hammasi', 'Все')}
            </button>
            <span className="flex-1 text-center text-sm text-stone-500">{t(`${sel.size} ta tanlandi`, `Выбрано: ${sel.size}`)}</span>
            <Button variant="secondary" size="sm" disabled={!sel.size} onClick={() => setMoveOpen(true)} icon={<FolderInput size={16} />}>
              {t('Guruhga', 'В группу')}
            </Button>
            <Button size="sm" disabled={!selected.some((a) => a.status === 'active')} onClick={() => setSaleOpen(true)}>
              {t('Sotish', 'Продать')}
            </Button>
          </div>
        </div>
      ) : (
        <Fab
          onClick={() => (tab === 'groups' ? nav('/group/new') : setAddOpen(true))}
          icon={<Plus />}
          label={tab === 'groups' ? t('Guruh', 'Группа') : t("Qo'shish", 'Добавить')}
        />
      )}

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title={t("Nima qo'shamiz?", 'Что добавить?')}>
        <div className="space-y-2">
          <ListRow left={<IconTile icon={PawPrint} color="#9a3412" />} title={t('Bitta hayvon', 'Одно животное')} sub={t("Sigir, qo'y, echki, ot...", 'Корова, овца, коза, лошадь...')} onClick={() => nav('/animal/new')} className="rounded-2xl bg-stone-100 dark:bg-stone-800" />
          <ListRow left={<IconTile icon={Baby} color="#db2777" />} title={t("Tug'ilgan bola(lar)", 'Приплод')} sub={t("Onasini tanlang — bolalar avtomatik qo'shiladi", 'Выберите мать — приплод добавится автоматически')} onClick={() => nav('/birth/new')} className="rounded-2xl bg-stone-100 dark:bg-stone-800" />
          <ListRow left={<IconTile icon={Layers} color="#0369a1" />} title={t('Guruh / partiya', 'Группа / партия')} sub={t('Tovuq, baliq, quyon yoki poda', 'Птица, рыба, кролики или стадо')} onClick={() => nav('/group/new')} className="rounded-2xl bg-stone-100 dark:bg-stone-800" />
        </div>
      </Sheet>

      <Sheet open={moveOpen} onClose={() => setMoveOpen(false)} title={t("Guruhga o'tkazish", 'Перевести в группу')}>
        <Field label={t('Guruh', 'Группа')}>
          <Select
            value={moveTo}
            onChange={(e) => setMoveTo(e.target.value)}
            placeholder={t('— guruhsiz —', '— без группы —')}
            options={f.groups.filter((g) => !f.isGroupMode(g) && g.status === 'active').map((g) => ({ value: g.id, label: g.name }))}
          />
        </Field>
        <Button
          full
          onClick={async () => {
            await moveAnimalsToGroup([...(sel ?? [])], moveTo || undefined)
            setMoveOpen(false)
            setSel(null)
            toast(t("O'tkazildi", 'Переведено'))
          }}
        >
          {t("O'tkazish", 'Перевести')}
        </Button>
      </Sheet>

      {saleOpen && (
        <SaleSheet
          animalIds={selected.filter((a) => a.status === 'active').map((a) => a.id)}
          onClose={(done) => {
            setSaleOpen(false)
            if (done) setSel(null)
          }}
        />
      )}
    </Page>
  )
}
