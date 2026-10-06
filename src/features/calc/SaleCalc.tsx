import { useState } from 'react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Callout, Card, cx, Field, KV, Money, NumInput, Page, Section, Select } from '../../components/ui'
import { formatNum, pct } from '../../lib/money'

/** Mustaqil kalkulyator: sotib olish → boqish → sotish */
export function SaleCalc() {
  const f = useFarm()
  const { t, lt, money } = useSettings()
  const indiv = f.species.filter((s) => s.enabled && s.dressingPct > 0)
  const [speciesId, setSpeciesId] = useState(indiv[0]?.id ?? 'sp_sheep')
  const sp = f.speciesMap.get(speciesId)
  const market = f.marketPerKg(speciesId)

  const [heads, setHeads] = useState<number | undefined>(10)
  const [buyPrice, setBuyPrice] = useState<number | undefined>(2_000_000)
  const [startW, setStartW] = useState<number | undefined>(30)
  const [days, setDays] = useState<number | undefined>(120)
  const [adg, setAdg] = useState<number | undefined>(200)
  const [feedDay, setFeedDay] = useState<number | undefined>(7_000)
  const [vet, setVet] = useState<number | undefined>(30_000)
  const [other, setOther] = useState<number | undefined>(1_000_000)
  const [mortality, setMortality] = useState<number | undefined>(2)
  const [price, setPrice] = useState<number | undefined>(market)
  const [dressing, setDressing] = useState<number | undefined>(sp?.dressingPct)

  const n = heads ?? 0
  const endW = (startW ?? 0) + ((adg ?? 0) / 1000) * (days ?? 0)
  const alive = n * (1 - (mortality ?? 0) / 100)
  const buy = n * (buyPrice ?? 0)
  const feed = n * (feedDay ?? 0) * (days ?? 0)
  const vetT = n * (vet ?? 0)
  const totalCost = buy + feed + vetT + (other ?? 0)
  const revenue = alive * endW * (price ?? 0)
  const profit = revenue - totalCost
  const roi = totalCost ? (profit / totalCost) * 100 : 0
  const beKg = alive * endW > 0 ? totalCost / (alive * endW) : 0
  const meatKg = endW * ((dressing ?? 0) / 100)
  const beMeat = alive * meatKg > 0 ? totalCost / (alive * meatKg) : 0
  const gainKg = alive * endW - n * (startW ?? 0)
  const costPerGain = gainKg > 0 ? (feed + vetT + (other ?? 0)) / gainKg : 0
  const perMonth = days ? profit / (days / 30.4) : 0

  return (
    <Page back title={t("Bo'rdoqi kalkulyatori", 'Калькулятор откорма')}>
      <Field label={t('Hayvon turi', 'Вид')}>
        <Select
          value={speciesId}
          onChange={(e) => {
            setSpeciesId(e.target.value)
            const s = f.speciesMap.get(e.target.value)
            setDressing(s?.dressingPct)
            const m = f.marketPerKg(e.target.value)
            if (m) setPrice(m)
          }}
          options={indiv.map((s) => ({ value: s.id, label: lt(s.name) }))}
        />
      </Field>
      <Section title={t('Sotib olish', 'Покупка')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Bosh soni', 'Голов')}><NumInput value={heads} onChange={setHeads} /></Field>
          <Field label={t('1 bosh narxi', 'Цена 1 гол.')}><NumInput value={buyPrice} onChange={setBuyPrice} suffix={t("so'm", 'сум')} /></Field>
          <Field label={t('Boshlang\'ich vazn', 'Начальный вес')}><NumInput value={startW} onChange={setStartW} decimals suffix="kg" /></Field>
          <Field label={t('Boqish muddati', 'Срок откорма')}><NumInput value={days} onChange={setDays} suffix={t('kun', 'дн.')} /></Field>
        </div>
      </Section>
      <Section title={t('Boqish', 'Откорм')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Kunlik o'sish", 'Привес в сутки')}><NumInput value={adg} onChange={setAdg} suffix="g" /></Field>
          <Field label={t('Yem: 1 bosh / kun', 'Корм: 1 гол./день')}><NumInput value={feedDay} onChange={setFeedDay} suffix={t("so'm", 'сум')} /></Field>
          <Field label={t('Vet / dori: 1 bosh', 'Ветеринария: 1 гол.')}><NumInput value={vet} onChange={setVet} suffix={t("so'm", 'сум')} /></Field>
          <Field label={t('Boshqa xarajat (jami)', 'Прочие (всего)')} hint={t("ish haqi, transport, ijara", 'зарплата, транспорт, аренда')}><NumInput value={other} onChange={setOther} suffix={t("so'm", 'сум')} /></Field>
          <Field label={t("O'lim ehtimoli", 'Падёж')}><NumInput value={mortality} onChange={setMortality} decimals suffix="%" /></Field>
        </div>
      </Section>
      <Section title={t('Sotish', 'Продажа')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('1 kg tirik vazn narxi', 'Цена 1 кг живого веса')}><NumInput value={price} onChange={setPrice} suffix={t("so'm", 'сум')} /></Field>
          <Field label={t("Go'sht chiqimi", 'Убойный выход')}><NumInput value={dressing} onChange={setDressing} decimals suffix="%" /></Field>
        </div>
      </Section>

      <Card className={cx('sticky bottom-24 mb-4 md:bottom-4', profit >= 0 ? 'border-brand-300 dark:border-brand-800' : 'border-red-300 dark:border-red-900')}>
        <div className="text-sm text-stone-500">{profit >= 0 ? t('Kutilgan foyda', 'Ожидаемая прибыль') : t('Kutilgan zarar', 'Ожидаемый убыток')}</div>
        <div className="text-2xl font-bold"><Money value={profit} tone="auto" /></div>
        <div className="text-sm text-stone-500">ROI {pct(roi)} · {t('oyiga', 'в месяц')} ~{money(perMonth)}</div>
      </Card>

      <Card className="mb-3">
        <KV label={t('Yakuniy vazn (1 bosh)', 'Конечный вес (1 гол.)')} value={`${formatNum(endW)} kg`} />
        <KV label={t('Sotiladigan bosh', 'К продаже голов')} value={formatNum(alive)} />
        <KV label={t('Sotib olish', 'Покупка')} value={money(buy)} />
        <KV label={t('Yem', 'Корм')} value={money(feed)} />
        <KV label={t('Veterinariya', 'Ветеринария')} value={money(vetT)} />
        <KV label={t('Boshqa', 'Прочее')} value={money(other ?? 0)} />
        <KV label={t('Jami xarajat', 'Всего затрат')} value={money(totalCost)} strong />
        <KV label={t('Tushum', 'Выручка')} value={money(revenue)} strong />
        <div className="my-2 border-t border-stone-100 dark:border-stone-800" />
        <KV label={t('Zararsiz narx: 1 kg tirik vazn', 'Без убытка: 1 кг живого веса')} value={<b>{money(beKg)}</b>} />
        <KV label={t("Zararsiz narx: 1 kg go'sht", 'Без убытка: 1 кг мяса')} value={money(beMeat)} />
        <KV label={t("1 kg o'sish tannarxi", 'Себестоимость 1 кг привеса')} value={money(costPerGain)} />
      </Card>
      {price && beKg > price && (
        <Callout tone="bad">{t(`Joriy narxda zarar. Kamida ${money(beKg)} / kg dan sotish yoki xarajatni kamaytirish kerak.`, `При текущей цене — убыток. Нужно продавать минимум по ${money(beKg)} / кг или снизить расходы.`)}</Callout>
      )}
      {costPerGain > 0 && price && costPerGain > price && (
        <Callout tone="warn">{t("1 kg vazn qo'shish bozor narxidan qimmatga tushyapti — boqish muddatini qisqartirish foydali bo'lishi mumkin.", 'Привес 1 кг дороже рыночной цены — возможно, выгоднее сократить срок откорма.')}</Callout>
      )}
    </Page>
  )
}
