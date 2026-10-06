import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Baby, Heart, MoreVertical, Pencil, Plus, Scale, SearchX, ShoppingCart } from 'lucide-react'
import { SpeciesAvatar } from '../../components/icons'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import {
  Badge, Button, Callout, Card, DateInput, Empty, Field, IconButton, KV, List, ListRow, Money, NumInput, Page, Section, Sheet, Textarea, useUi,
} from '../../components/ui'
import { ageText, healthLabel, sexLabel, statusLabel, statusTone } from '../../components/labels'
import { WeightChart } from '../../components/Sparkline'
import { WeightSheet } from '../../components/WeightSheet'
import { SaleSheet } from './SaleSheet'
import { BreedingSheet } from '../breeding/BreedingSheet'
import { TxRow } from '../finance/TxRow'
import { deleteAnimal, setAnimalExit } from '../../db/repo'
import { db } from '../../db/db'
import { allocateCosts } from '../../lib/calc/costBasis'
import { breakEven, saleResult } from '../../lib/calc/pricing'
import { adg, holdOrSell } from '../../lib/calc/growth'
import { addDays, ageMonths, diffDays, formatDate, today } from '../../lib/dates'
import { formatNum, pct } from '../../lib/money'
import type { AnimalStatus } from '../../db/types'

export function AnimalPage() {
  const { id = '' } = useParams()
  const f = useFarm()
  const { t, lt, money, settings } = useSettings()
  const { confirm, toast } = useUi()
  const nav = useNavigate()
  const a = f.animalMap.get(id)
  const [menu, setMenu] = useState(false)
  const [sale, setSale] = useState(false)
  const [weightOpen, setWeightOpen] = useState(false)
  const [breedOpen, setBreedOpen] = useState(false)
  const [exit, setExit] = useState<AnimalStatus | null>(null)
  const [exitDate, setExitDate] = useState(today())
  const [exitNote, setExitNote] = useState('')
  const [margin, setMargin] = useState<number | undefined>(20)

  const weights = useMemo(() => f.weights.filter((w) => w.animalId === id).sort((x, y) => x.date.localeCompare(y.date)), [f.weights, id])

  // so'nggi 30 kunlik xarajat — "boqish yoki sotish" tavsiyasi uchun
  const daily = useMemo(() => {
    if (!a) return 0
    const from = addDays(today(), -30)
    const r = allocateCosts(
      { animals: f.animals, groups: f.groups, species: f.species, movements: f.movements, expenses: f.expenses.filter((e) => e.categoryId !== 'ex_purchase') },
      { from },
    )
    const days = Math.max(1, Math.min(30, diffDays(a.acquiredDate > from ? a.acquiredDate : from, today())))
    return (r.units.get(a.id)?.total ?? 0) / days
  }, [a, f.animals, f.groups, f.species, f.movements, f.expenses])

  if (!a) return <Page back="/herd" title="—"><Empty icon={<SearchX size={30} />} title={t('Topilmadi', 'Не найдено')} /></Page>

  const sp = f.speciesMap.get(a.speciesId)
  const cost = f.costOf(a.id)
  const w = f.weightOf(a.id)
  const be = breakEven({ cost: cost.total, weightKg: w, dressingPct: sp?.dressingPct, targetMarginPct: margin ?? 0 })
  const value = f.valueOfAnimal(a)
  const g = adg(weights)
  const marketKg = settings.marketPrices[a.speciesId]?.perKg
  const hold = g !== undefined && marketKg ? holdOrSell({ adgKg: g, dailyCost: daily, pricePerKgLive: marketKg }) : undefined
  const sale_ = a.saleIncomeId ? f.incomes.find((i) => i.id === a.saleIncomeId) : undefined
  const saleShare = sale_ ? sale_.amount / Math.max(1, sale_.animalIds?.length ?? 1) : 0
  const directTx = f.expenses.filter((e) => e.scope === 'animal' && e.targetId === a.id)
  const kids = f.animals.filter((k) => k.motherId === a.id || k.fatherId === a.id)
  const breedings = f.breedings.filter((b) => b.femaleId === a.id).sort((x, y) => y.date.localeCompare(x.date))
  const births = f.births.filter((b) => b.motherId === a.id)
  const health = f.health.filter((h) => h.scope === 'animal' && h.targetId === a.id)
  const mother = a.motherId ? f.animalMap.get(a.motherId) : undefined
  const father = a.fatherId ? f.animalMap.get(a.fatherId) : undefined
  const canBreed = a.sex === 'f' && (sp?.gestationDays ?? 0) > 0

  const cats = Object.entries(cost.byCategory).sort((x, y) => y[1] - x[1])

  const doExit = async () => {
    if (!exit) return
    await setAnimalExit(a.id, exit, exitDate, exitNote.trim() || undefined)
    setExit(null)
    toast(t('Saqlandi', 'Сохранено'))
  }

  return (
    <Page
      back
      title={`${a.tag}${a.name ? ' · ' + a.name : ''}`}
      actions={
        <>
          <IconButton onClick={() => nav(`/animal/${a.id}/edit`)} aria-label="edit"><Pencil size={20} /></IconButton>
          <IconButton onClick={() => setMenu(true)} aria-label="menu"><MoreVertical size={20} /></IconButton>
        </>
      }
    >
      <Card className="mb-3">
        <div className="flex items-center gap-4">
          {a.photo ? <img src={a.photo} className="size-20 rounded-2xl object-cover" alt="" /> : <SpeciesAvatar s={sp} size="lg" />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-bold">{a.tag}</span>
              <Badge tone={statusTone(a.status)}>{statusLabel(t, a.status)}</Badge>
            </div>
            <div className="text-sm text-stone-500">
              {[lt(sp?.name), sexLabel(t, a.sex), a.breed].filter(Boolean).join(' · ')}
            </div>
            <div className="text-sm text-stone-500">
              {a.birthDate && <>{ageText(t, ageMonths(a.birthDate))} · </>}
              {w ? `${formatNum(w)} kg` : t("vazn yo'q", 'вес не указан')}
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 text-sm">
          <KV label={a.origin === 'born' ? t("Tug'ilgan", 'Родилось') : t('Olingan', 'Куплено')} value={formatDate(a.acquiredDate)} />
          <KV label={t('Guruh', 'Группа')} value={a.groupId ? f.groupMap.get(a.groupId)?.name : '—'} />
          {mother && <KV label={t('Onasi', 'Мать')} value={<button className="text-brand-700 dark:text-brand-400" onClick={() => nav('/animal/' + mother.id)}>{mother.tag}</button>} />}
          {father && <KV label={t('Otasi', 'Отец')} value={<button className="text-brand-700 dark:text-brand-400" onClick={() => nav('/animal/' + father.id)}>{father.tag}</button>} />}
          {a.exitDate && <KV label={t('Chiqib ketgan', 'Выбыло')} value={formatDate(a.exitDate)} />}
        </div>
        {a.note && <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{a.note}</p>}
      </Card>

      {a.status === 'active' && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Button variant="primary" onClick={() => setSale(true)} icon={<ShoppingCart size={18} />}>{t('Sotish', 'Продать')}</Button>
          <Button variant="secondary" onClick={() => setWeightOpen(true)} icon={<Scale size={18} />}>{t('Vazn', 'Вес')}</Button>
          <Button variant="secondary" onClick={() => nav(`/expense/new?scope=animal&target=${a.id}`)} icon={<Plus size={18} />}>{t('Xarajat', 'Расход')}</Button>
        </div>
      )}

      {sale_ && (
        <Section title={t('Sotuv natijasi', 'Итог продажи')}>
          {(() => {
            const r = saleResult(saleShare, cost.total)
            return (
              <Card className={r.isLoss ? 'border-red-200 dark:border-red-900' : 'border-brand-200 dark:border-brand-900'}>
                <KV label={t('Sotilgan narx', 'Цена продажи')} value={money(saleShare)} />
                <KV label={t('Tannarx', 'Себестоимость')} value={money(cost.total)} />
                <KV label={r.isLoss ? t('Zarar', 'Убыток') : t('Foyda', 'Прибыль')} value={<Money value={r.profit} tone="auto" className="font-bold" />} />
                <KV label="ROI" value={pct(r.roiPct)} />
              </Card>
            )
          })()}
        </Section>
      )}

      <Section title={t('Tannarx', 'Себестоимость')}>
        <Card>
          <div className="text-sm text-stone-500">{t('Shu hayvonga sarflangan jami pul', 'Всего вложено в это животное')}</div>
          <div className="mb-2 text-2xl font-bold"><Money value={cost.total} /></div>
          <KV label={t("To'g'ridan-to'g'ri xarajat", 'Прямые расходы')} value={money(cost.direct)} />
          <KV label={t('Umumiy xarajatlardan ulushi', 'Доля общих расходов')} value={money(cost.shared)} />
          {cats.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {cats.map(([cid, v]) => {
                const c = f.catMap.get(cid)
                return (
                  <div key={cid}>
                    <div className="flex justify-between text-sm">
                      <span>{lt(c?.name)}</span>
                      <span className="tabular-nums">{money(v)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-stone-100 dark:bg-stone-800">
                      <div className="h-1.5 rounded-full" style={{ width: `${(v / cost.total) * 100}%`, background: c?.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </Section>

      {a.status === 'active' && (
        <Section title={t('Necha pulga sotish kerak?', 'За сколько продавать?')}>
          <Card>
            <KV label={t('Zararsiz narx (1 bosh)', 'Цена без убытка (1 гол.)')} value={money(be.perHead)} strong />
            {be.perKgLive !== undefined && <KV label={t('Zararsiz: 1 kg tirik vazn', 'Без убытка: 1 кг живого веса')} value={money(be.perKgLive)} />}
            {be.perKgMeat !== undefined && <KV label={t(`Zararsiz: 1 kg go'sht (~${formatNum(be.meatKg ?? 0)} kg)`, `Без убытка: 1 кг мяса (~${formatNum(be.meatKg ?? 0)} кг)`)} value={money(be.perKgMeat)} />}
            <div className="my-3 border-t border-stone-100 dark:border-stone-800" />
            <Field label={t('Qancha foyda istaysiz?', 'Желаемая прибыль')}>
              <NumInput value={margin} onChange={setMargin} decimals suffix="%" />
            </Field>
            <KV label={t('Sotish narxi (1 bosh)', 'Цена продажи (1 гол.)')} value={<b className="text-brand-700 dark:text-brand-400">{money(be.targetPerHead)}</b>} />
            {be.targetPerKgLive !== undefined && <KV label={t('yoki 1 kg tirik vazn', 'или 1 кг живого веса')} value={money(be.targetPerKgLive)} />}
            {be.targetPerKgMeat !== undefined && <KV label={t("yoki 1 kg go'sht", 'или 1 кг мяса')} value={money(be.targetPerKgMeat)} />}
            {value !== undefined && (
              <Callout tone={value >= cost.total ? 'good' : 'bad'}>
                {t('Bozor narxida hozirgi qiymati', 'Сейчас по рыночной цене')}: <b>{money(value)}</b>.{' '}
                {value >= cost.total
                  ? t(`Hozir sotsangiz ~${money(value - cost.total)} foyda`, `Если продать сейчас, прибыль ~${money(value - cost.total)}`)
                  : t(`Hozir sotsangiz ~${money(cost.total - value)} zarar`, `Если продать сейчас, убыток ~${money(cost.total - value)}`)}
              </Callout>
            )}
            {!w && <p className="mt-2 text-xs text-stone-500">{t("1 kg narxini ko'rish uchun vaznini kiriting", 'Укажите вес, чтобы увидеть цену за кг')}</p>}
          </Card>
        </Section>
      )}

      <Section title={t("Vazn va o'sish", 'Вес и привес')} action={<Button size="sm" variant="ghost" onClick={() => setWeightOpen(true)}><Plus size={16} />{t('Vazn', 'Вес')}</Button>}>
        <Card>
          {weights.length >= 2 ? <WeightChart points={weights} /> : <p className="text-sm text-stone-500">{t("O'sishni ko'rish uchun kamida 2 marta vazn yozing", 'Для графика нужно минимум 2 взвешивания')}</p>}
          {g !== undefined && (
            <>
              <KV label={t("O'rtacha kunlik o'sish", 'Среднесуточный привес')} value={`${formatNum(g * 1000, 0)} g / ${t('kun', 'сут')}`} strong />
              <KV label={t('Kunlik xarajat (30 kun)', 'Расход в день (30 дн.)')} value={money(daily)} />
              {g > 0 && daily > 0 && <KV label={t("1 kg o'sish tannarxi", 'Себестоимость 1 кг привеса')} value={money(daily / g)} />}
            </>
          )}
          {hold && a.status === 'active' && (
            <Callout tone={hold.recommend === 'hold' ? 'good' : 'warn'}>
              {hold.recommend === 'hold'
                ? t(
                    `Boqishda davom eting: keyingi 30 kunda ~${formatNum(hold.gainKg)} kg qo'shadi (${money(hold.gainValue)}), xarajat ~${money(hold.cost)}. Qo'shimcha foyda ~${money(hold.net)}.`,
                    `Продолжайте откорм: за 30 дней +${formatNum(hold.gainKg)} кг (${money(hold.gainValue)}), расходы ~${money(hold.cost)}. Доп. прибыль ~${money(hold.net)}.`,
                  )
                : t(
                    `Sotish vaqti keldi: keyingi 30 kunlik xarajat (${money(hold.cost)}) vazn o'sishidan (${money(hold.gainValue)}) ko'proq.`,
                    `Пора продавать: расходы за 30 дней (${money(hold.cost)}) больше прироста стоимости (${money(hold.gainValue)}).`,
                  )}
            </Callout>
          )}
        </Card>
      </Section>

      {(canBreed || kids.length > 0) && (
        <Section
          title={t("Ko'payish", 'Воспроизводство')}
          action={canBreed && a.status === 'active' && (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setBreedOpen(true)}><Heart size={16} />{t('Qochirish', 'Случка')}</Button>
              <Button size="sm" variant="ghost" onClick={() => nav('/birth/new?mother=' + a.id)}><Baby size={16} />{t("Tug'di", 'Роды')}</Button>
            </div>
          )}
        >
          {canBreed && (
            <div className="mb-2 grid grid-cols-3 gap-2 text-center text-sm">
              <Card className="p-2"><div className="font-bold">{births.length}</div><div className="text-xs text-stone-500">{t("tug'ish", 'родов')}</div></Card>
              <Card className="p-2"><div className="font-bold">{births.reduce((s, b) => s + b.alive, 0)}</div><div className="text-xs text-stone-500">{t('tirik bola', 'живых')}</div></Card>
              <Card className="p-2"><div className="font-bold">{births.length ? formatNum(births.reduce((s, b) => s + b.alive + b.dead, 0) / births.length) : '—'}</div><div className="text-xs text-stone-500">{t("o'rtacha", 'в среднем')}</div></Card>
            </div>
          )}
          {breedings.filter((b) => b.status === 'pending').map((b) => (
            <Callout key={b.id} tone="info" icon={<Baby size={18} />}>
              {t("Bo'g'oz. Kutilayotgan tug'ish", 'Беременна. Ожидаемые роды')}: <b>{formatDate(b.expectedDate)}</b> ({t(`${diffDays(today(), b.expectedDate)} kun qoldi`, `осталось ${diffDays(today(), b.expectedDate)} дн.`)})
            </Callout>
          ))}
          {kids.length > 0 && (
            <List className="mt-2">
              {kids.map((k) => (
                <ListRow key={k.id} onClick={() => nav('/animal/' + k.id)} left={<SpeciesAvatar s={sp} />} title={k.tag} sub={`${sexLabel(t, k.sex)} · ${formatDate(k.birthDate)}`} right={<Badge tone={statusTone(k.status)}>{statusLabel(t, k.status)}</Badge>} />
              ))}
            </List>
          )}
        </Section>
      )}

      {health.length > 0 && (
        <Section title={t("Sog'liq", 'Здоровье')}>
          <List>
            {health.map((h) => (
              <ListRow key={h.id} title={`${healthLabel(t, h.type)}: ${h.title}`} sub={formatDate(h.date) + (h.nextDate ? ` → ${formatDate(h.nextDate)}` : '')} right={h.cost ? money(h.cost) : undefined} onClick={() => nav('/health')} />
            ))}
          </List>
        </Section>
      )}

      <Section title={t("To'g'ridan-to'g'ri xarajatlar", 'Прямые расходы')}>
        {directTx.length ? (
          <List>{directTx.map((e) => <TxRow key={e.id} kind="expense" e={e} />)}</List>
        ) : (
          <Card className="text-sm text-stone-500">{t("Faqat shu hayvonga yozilgan xarajat yo'q. Umumiy xarajatlar ulushi yuqorida hisoblangan.", 'Нет расходов только на это животное. Доля общих расходов учтена выше.')}</Card>
        )}
      </Section>

      <Sheet open={menu} onClose={() => setMenu(false)} title={t('Amallar', 'Действия')}>
        <div className="space-y-2">
          {a.status === 'active' ? (
            <>
              <Button full variant="secondary" onClick={() => { setMenu(false); setSale(true) }}>{t("Sotish / so'yish", 'Продать / забить')}</Button>
              <Button full variant="secondary" onClick={() => { setMenu(false); setExit('slaughtered') }}>{t("O'zimiz uchun so'yildi", 'Забито для себя')}</Button>
              <Button full variant="secondary" onClick={() => { setMenu(false); setExit('dead') }}>{t("O'ldi", 'Пало')}</Button>
              <Button full variant="secondary" onClick={() => { setMenu(false); setExit('lost') }}>{t("Yo'qoldi / o'g'irlandi", 'Потерялось / украдено')}</Button>
            </>
          ) : (
            !a.saleIncomeId && (
              <Button full variant="secondary" onClick={async () => { await setAnimalExit(a.id, 'active'); setMenu(false) }}>{t('Faol holatga qaytarish', 'Вернуть в активные')}</Button>
            )
          )}
          {a.saleIncomeId && (
            <Button full variant="secondary" onClick={() => nav('/income/' + a.saleIncomeId)}>{t('Sotuv yozuvini ochish', 'Открыть запись продажи')}</Button>
          )}
          <Button
            full
            variant="danger"
            onClick={async () => {
              setMenu(false)
              const ok = await confirm({
                title: t("Hayvonni butunlay o'chirasizmi?", 'Удалить животное полностью?'),
                text: t("Unga yozilgan xarajatlar, vazn va qochirish yozuvlari ham o'chadi. Agar sotilgan yoki o'lgan bo'lsa, o'chirmasdan holatini o'zgartiring.", 'Удалятся также его расходы, взвешивания и случки. Если животное продано или пало — лучше измените статус.'),
                ok: t("O'chirish", 'Удалить'),
                danger: true,
              })
              if (!ok) return
              await deleteAnimal(a.id)
              await db.births.filter((b) => b.kidIds.includes(a.id)).modify((b) => {
                b.kidIds = b.kidIds.filter((k) => k !== a.id)
                b.alive = b.kidIds.length
              })
              toast(t("O'chirildi", 'Удалено'))
              nav('/herd', { replace: true })
            }}
          >
            {t("O'chirish", 'Удалить')}
          </Button>
        </div>
      </Sheet>

      <Sheet open={!!exit} onClose={() => setExit(null)} title={exit ? statusLabel(t, exit) : ''}>
        <Field label={t('Sana', 'Дата')}><DateInput value={exitDate} onChange={setExitDate} /></Field>
        <Field label={t('Sababi / izoh', 'Причина / примечание')}><Textarea value={exitNote} onChange={(e) => setExitNote(e.target.value)} /></Field>
        {exit === 'dead' && <Callout tone="warn">{t(`Bu hayvonga sarflangan ${money(cost.total)} zarar sifatida hisobotda qoladi.`, `Вложенные ${money(cost.total)} останутся в отчёте как убыток.`)}</Callout>}
        <Button full className="mt-3" onClick={doExit}>{t('Saqlash', 'Сохранить')}</Button>
      </Sheet>

      {sale && <SaleSheet animalIds={[a.id]} onClose={() => setSale(false)} />}
      {weightOpen && <WeightSheet animalId={a.id} onClose={() => setWeightOpen(false)} />}
      {breedOpen && <BreedingSheet femaleId={a.id} onClose={() => setBreedOpen(false)} />}
    </Page>
  )
}
