import { useMemo, useState } from 'react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Callout, cx, DateInput, Field, KV, Money, NumInput, Segmented, Sheet, Textarea, useUi } from '../../components/ui'
import { recordSale } from '../../db/repo'
import { PriceHint } from '../../components/PriceHint'
import { priceHistory, priceStats } from '../../lib/calc/priceHistory'
import { saleResult } from '../../lib/calc/pricing'
import { today } from '../../lib/dates'
import { formatNum, pct } from '../../lib/money'
import type { ID } from '../../db/types'

type Mode = 'live' | 'meat' | 'head'

/** Hayvon(lar) yoki guruh qismini sotish: foyda/zarar darhol ko'rinadi */
export function SaleSheet({ animalIds, groupId, onClose }: { animalIds?: ID[]; groupId?: ID; onClose: (done: boolean) => void }) {
  const f = useFarm()
  const { t, farmId, money } = useSettings()
  const { toast } = useUi()
  const group = groupId ? f.groupMap.get(groupId) : undefined
  const animals = (animalIds ?? []).map((id) => f.animalMap.get(id)!).filter(Boolean)
  const speciesId = group?.speciesId ?? animals[0]?.speciesId
  const sp = f.speciesMap.get(speciesId ?? '')

  const groupHeads = group ? f.headsOf(group) : 0
  const [count, setCount] = useState<number | undefined>(group ? groupHeads : undefined)
  const heads = group ? Math.min(count ?? 0, groupHeads) : animals.length

  const cost = useMemo(() => {
    if (group) {
      const total = f.groupCost(group).total
      return groupHeads ? (total * heads) / groupHeads : 0
    }
    return animals.reduce((s, a) => s + f.costOf(a.id).total, 0)
  }, [group, animals, f, heads, groupHeads])

  const initialWeight = group
    ? (f.groupWeightOf(group.id) ?? 0) * heads
    : animals.reduce((s, a) => s + (f.weightOf(a.id) ?? 0), 0)

  const [mode, setMode] = useState<Mode>('live')
  const [weight, setWeight] = useState<number | undefined>(initialWeight ? Math.round(initialWeight * 10) / 10 : undefined)
  const [dressing, setDressing] = useState<number | undefined>(sp?.dressingPct)
  const [pricePerKg, setPricePerKg] = useState<number | undefined>()
  const [total, setTotal] = useState<number | undefined>()
  const [extra, setExtra] = useState<number | undefined>()
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  // Shu turdagi oldingi sotuvlar: 1 kg narxi (tirik yoki go'sht)
  const priceInfo = useMemo(() => {
    const cat = mode === 'meat' ? 'in_meat_sale' : 'in_animal_sale'
    const points = f.incomes
      .filter((i) => i.categoryId === cat && i.weightKg && i.weightKg > 0)
      .filter((i) => {
        const sid = i.animalIds?.length ? f.animalMap.get(i.animalIds[0])?.speciesId : f.groupMap.get(i.targetId ?? '')?.speciesId
        return sid === speciesId
      })
      .map((i) => ({ id: i.id, date: i.date, createdAt: i.createdAt, categoryId: cat, amount: i.amount, qty: i.weightKg, unit: 'kg' }))
    return priceStats(priceHistory(points, { categoryId: cat }))
  }, [f.incomes, f.animalMap, f.groupMap, speciesId, mode])

  const meatKg = (weight ?? 0) * ((dressing ?? 0) / 100)
  const saleKg = mode === 'meat' ? meatKg : weight ?? 0
  const revenue = mode === 'head' ? total ?? 0 : Math.round((pricePerKg ?? 0) * saleKg)
  const fullCost = cost + (extra ?? 0)
  const r = saleResult(revenue, fullCost)
  const bePerKg = saleKg > 0 ? fullCost / saleKg : undefined

  const submit = async () => {
    if (revenue <= 0 || heads <= 0) return
    setBusy(true)
    try {
      await recordSale({
        farmId,
        date,
        amount: revenue,
        categoryId: mode === 'meat' ? 'in_meat_sale' : 'in_animal_sale',
        animalIds: group ? undefined : animals.map((a) => a.id),
        groupId: group?.id,
        headCount: group ? heads : undefined,
        weightKg: saleKg || undefined,
        extraCost: extra,
        note: note.trim() || undefined,
        slaughter: mode === 'meat',
      })
      toast(r.isLoss ? t('Sotildi (zarar bilan)', 'Продано (с убытком)') : t('Sotildi! Foyda yozildi', 'Продано! Прибыль учтена'))
      onClose(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={() => onClose(false)} title={`${t('Sotish', 'Продажа')} · ${group ? group.name : animals.length === 1 ? animals[0].tag : t(`${animals.length} bosh`, `${animals.length} гол.`)}`}>
      {group && (
        <Field label={t(`Necha bosh sotiladi (jami ${groupHeads})`, `Сколько голов (всего ${groupHeads})`)}>
          <NumInput value={count} onChange={setCount} suffix={t('bosh', 'гол.')} />
        </Field>
      )}
      <div className="mb-3 rounded-2xl bg-stone-100 p-3 dark:bg-stone-800">
        <KV label={t('Tannarx (sarflangan pul)', 'Себестоимость (вложено)')} value={money(cost)} strong />
        {heads > 1 && <KV label={t('1 bosh uchun', 'На 1 голову')} value={money(cost / heads)} />}
      </div>

      <Segmented
        className="mb-3"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'live', label: t('Tirik vazn', 'Живой вес') },
          { value: 'meat', label: t("So'yib, go'sht", 'Мясом') },
          { value: 'head', label: t('Kelishilgan narx', 'Общая цена') },
        ]}
      />

      {mode !== 'head' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Tirik vazn (jami)', 'Живой вес (всего)')}>
            <NumInput value={weight} onChange={setWeight} decimals suffix="kg" />
          </Field>
          {mode === 'meat' ? (
            <Field label={t("Go'sht chiqimi", 'Выход мяса')}>
              <NumInput value={dressing} onChange={setDressing} decimals suffix="%" />
            </Field>
          ) : (
            <Field label={t('1 kg narxi', 'Цена 1 кг')}>
              <NumInput value={pricePerKg} onChange={setPricePerKg} suffix={t("so'm", 'сум')} />
            </Field>
          )}
          {mode === 'meat' && (
            <>
              <div className="mb-3 flex items-center rounded-xl bg-stone-100 px-3 text-sm dark:bg-stone-800">
                {t("Go'sht", 'Мясо')}: <b className="ml-1">{formatNum(meatKg)} kg</b>
              </div>
              <Field label={t("1 kg go'sht narxi", 'Цена 1 кг мяса')}>
                <NumInput value={pricePerKg} onChange={setPricePerKg} suffix={t("so'm", 'сум')} />
              </Field>
            </>
          )}
        </div>
      )}
      {mode !== 'head' && priceInfo && (
        <PriceHint
          stats={priceInfo}
          kind="income"
          currentUnitPrice={pricePerKg}
          currentUnit="kg"
          onApply={() => setPricePerKg(Math.round(priceInfo.last.unitPrice ?? 0))}
        />
      )}
      {mode === 'head' && (
        <Field label={t('Umumiy sotish narxi', 'Общая сумма продажи')}>
          <NumInput value={total} onChange={setTotal} suffix={t("so'm", 'сум')} />
        </Field>
      )}

      <Field
        label={mode === 'meat' ? t("So'yish / tashish xarajati", 'Расходы на убой / доставку') : t("Bozor yig'imi, transport", 'Рыночный сбор, транспорт')}
        hint={t('Ixtiyoriy. Tannarxga qo\'shiladi', 'Необязательно. Добавится к себестоимости')}
      >
        <NumInput value={extra} onChange={setExtra} suffix={t("so'm", 'сум')} placeholder="0" />
      </Field>

      {bePerKg !== undefined && mode !== 'head' && (
        <Callout tone="info">
          {t('Zararsiz sotish uchun minimal narx', 'Минимальная цена без убытка')}:{' '}
          <b>{money(bePerKg)} / kg</b>
          {mode === 'live' ? ` (${t('tirik vazn', 'живой вес')})` : ` (${t("go'sht", 'мясо')})`}
        </Callout>
      )}

      {revenue > 0 && (
        <div className={cx('my-3 rounded-2xl p-4', r.isLoss ? 'bg-red-50 dark:bg-red-950/40' : 'bg-brand-50 dark:bg-brand-950/40')}>
          <KV label={t('Tushum', 'Выручка')} value={money(revenue)} />
          <KV label={t('Tannarx + xarajat', 'Себестоимость + расходы')} value={money(fullCost)} />
          <div className="my-1 border-t border-black/10 dark:border-white/10" />
          <KV label={r.isLoss ? t('ZARAR', 'УБЫТОК') : t('FOYDA', 'ПРИБЫЛЬ')} value={<Money value={r.profit} tone="auto" className="text-lg font-bold" />} />
          <KV label={t('Rentabellik (ROI)', 'Рентабельность (ROI)')} value={pct(r.roiPct)} />
        </div>
      )}

      <Field label={t('Sana', 'Дата')}>
        <DateInput value={date} onChange={setDate} />
      </Field>
      <Field label={t('Izoh (xaridor, bozor)', 'Примечание (покупатель, рынок)')}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button full size="lg" disabled={busy || revenue <= 0 || heads <= 0} onClick={submit}>
        {t('Sotishni tasdiqlash', 'Подтвердить продажу')}
      </Button>
    </Sheet>
  )
}
