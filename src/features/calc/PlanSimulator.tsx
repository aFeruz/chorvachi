import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Printer, RotateCcw } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Callout, Card, cx, Field, IconButton, KV, NumInput, Page, Section, Select } from '../../components/ui'
import { scenarioInput, simulate, SIM_DEFAULT, SIM_PRESETS, type SimInput } from '../../lib/calc/simulator'
import { formatNum, pct } from '../../lib/money'

const KEY = 'chorva.sim'

function load(): SimInput {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...SIM_DEFAULT, ...JSON.parse(raw) }
  } catch {
    /* localStorage mavjud emas */
  }
  return SIM_DEFAULT
}

export default function PlanSimulator() {
  const f = useFarm()
  const { t, lt, money, short } = useSettings()
  const [i, setI] = useState<SimInput>(load)
  const [preset, setPreset] = useState('sp_sheep')
  const [showTable, setShowTable] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(i))
    } catch {
      /* e'tiborsiz */
    }
  }, [i])

  const set = <K extends keyof SimInput>(k: K) => (v: number | undefined) => setI((p) => ({ ...p, [k]: v ?? 0 }))
  const base = useMemo(() => simulate(i), [i])
  const bad = useMemo(() => simulate(scenarioInput(i, 'bad')), [i])
  const good = useMemo(() => simulate(scenarioInput(i, 'good')), [i])
  const chart = base.rows.map((r, k) => ({ m: r.month, base: Math.round(r.cumulative), bad: Math.round(bad.rows[k].cumulative), good: Math.round(good.rows[k].cumulative) }))

  const num = (label: string, k: keyof SimInput, suffix?: string, decimals?: boolean, hint?: string) => (
    <Field label={label} hint={hint}>
      <NumInput value={i[k]} onChange={set(k)} suffix={suffix} decimals={decimals} />
    </Field>
  )
  const som = t("so'm", 'сум')
  const presets = f.species.filter((s) => s.mode === 'individual' || SIM_PRESETS[s.id])

  return (
    <Page
      back
      wide
      title={t('Biznes-reja', 'Бизнес-план')}
      actions={
        <>
          <IconButton onClick={() => setI({ ...SIM_DEFAULT, ...(SIM_PRESETS[preset] ?? {}) })} aria-label="reset"><RotateCcw size={20} /></IconButton>
          <IconButton onClick={() => window.print()} aria-label="print"><Printer size={20} /></IconButton>
        </>
      }
    >
      <Callout tone="info">
        {t(
          "Bu yerda hali boshlamagan yoki kengaytirmoqchi bo'lgan biznesingizni sinab ko'rasiz. Ma'lumotlar bazasiga yozilmaydi.",
          'Здесь можно проверить бизнес, который вы только планируете или хотите расширить. В учёт ничего не записывается.',
        )}
      </Callout>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="no-print">
          <Field label={t('Tayyor shablon', 'Шаблон')}>
            <Select
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value)
                setI({ ...SIM_DEFAULT, ...(SIM_PRESETS[e.target.value] ?? {}) })
              }}
              options={presets.map((s) => ({ value: s.id, label: lt(s.name) }))}
            />
          </Field>
          <Section title={t('Boshlash', 'Старт')}>
            <div className="grid grid-cols-2 gap-x-3">
              {num(t("Urg'ochi (ona)", 'Маток'), 'females', t('bosh', 'гол.'))}
              {num(t('Erkak (naslchi)', 'Производителей'), 'males', t('bosh', 'гол.'))}
              {num(t('1 bosh narxi', 'Цена 1 гол.'), 'pricePerHead', som)}
              {num(t('Bino, jihoz', 'Здание, оборуд.'), 'setupCost', som)}
              {num(t('Muddat', 'Срок'), 'months', t('oy', 'мес.'))}
              {num(t('Inflyatsiya', 'Инфляция'), 'inflationPctYear', t('%/yil', '%/год'), true)}
            </div>
          </Section>
          <Section title={t("Ko'payish", 'Воспроизводство')}>
            <div className="grid grid-cols-2 gap-x-3">
              {num(t("Birinchi tug'ish", 'Первые роды'), 'firstBirthMonth', t('-oyda', '-й мес.'))}
              {num(t("Yiliga tug'ish", 'Родов в год'), 'birthsPerYear', t('marta', 'раз'), true)}
              {num(t("Bo'g'oz bo'lish", 'Оплодотворяемость'), 'conceptionPct', '%', true)}
              {num(t('1 tug\'ishda bola', 'Приплод за роды'), 'litterSize', t('ta', 'шт'), true)}
              {num(t("Yosh o'lim", 'Падёж молодняка'), 'youngMortalityPct', '%', true)}
              {num(t("Katta o'lim", 'Падёж взрослых'), 'adultMortalityPctYear', t('%/yil', '%/год'), true)}
              {num(t("Urg'ochilarni qoldirish", 'Оставлять самок'), 'keepFemalesPct', '%', true, t("podani ko'paytirish uchun", 'для роста стада'))}
            </div>
          </Section>
          <Section title={t('Sotish', 'Продажа')}>
            <div className="grid grid-cols-2 gap-x-3">
              {num(t('Sotish yoshi', 'Возраст продажи'), 'sellAgeMonths', t('oy', 'мес.'))}
              {num(t('Sotish vazni', 'Вес при продаже'), 'sellWeightKg', 'kg', true)}
              {num(t('1 kg narxi', 'Цена 1 кг'), 'pricePerKg', som)}
            </div>
          </Section>
          <Section title={t('Xarajatlar', 'Расходы')}>
            <div className="grid grid-cols-2 gap-x-3">
              {num(t('Yem: 1 bosh/kun', 'Корм: 1 гол./день'), 'feedPerHeadDay', som)}
              {num(t('Yoshlar yem koef.', 'Коэф. молодняка'), 'youngFeedFactor', '×', true)}
              {num(t('Vet: 1 bosh/yil', 'Вет: 1 гол./год'), 'vetPerHeadYear', som)}
              {num(t('Ish haqi / oy', 'Зарплата / мес.'), 'laborMonth', som)}
              {num(t('Boshqa / oy', 'Прочее / мес.'), 'otherMonth', som)}
            </div>
          </Section>
        </div>

        <div>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {[
              { k: 'bad', r: bad, label: t('Yomon', 'Плохо'), cls: 'bg-red-50 dark:bg-red-950/40' },
              { k: 'base', r: base, label: t("O'rtacha", 'Средне'), cls: 'bg-white dark:bg-stone-900 ring-2 ring-brand-600' },
              { k: 'good', r: good, label: t('Yaxshi', 'Хорошо'), cls: 'bg-brand-50 dark:bg-brand-950/40' },
            ].map((s) => (
              <div key={s.k} className={cx('rounded-2xl p-3 text-center shadow-sm', s.cls)}>
                <div className="text-xs font-medium text-stone-500">{s.label}</div>
                <div className={cx('text-lg font-bold tabular-nums', s.r.totalProfit < 0 && 'text-red-600')}>{short(s.r.totalProfit)}</div>
                <div className="text-xs text-stone-500">ROI {pct(s.r.roiPct, 0)}</div>
              </div>
            ))}
          </div>

          <Card className="mb-3 px-1">
            <div className="px-3 pb-1 text-sm font-medium">{t("Pul oqimi (jamg'arma), boshlang'ich investitsiya bilan", 'Денежный поток нарастающим итогом, с учётом вложений')}</div>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => short(v).replace(/ /g, ' ')} tick={{ fontSize: 11 }} width={58} />
                  <Tooltip formatter={(v) => money(Number(v))} labelFormatter={(m) => `${m}-${t('oy', 'мес.')}`} contentStyle={{ borderRadius: 12 }} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#888" />
                  <Line dataKey="bad" name={t('Yomon', 'Плохо')} stroke="#f04438" dot={false} strokeWidth={2} />
                  <Line dataKey="base" name={t("O'rtacha", 'Средне')} stroke="#027a48" dot={false} strokeWidth={3} />
                  <Line dataKey="good" name={t('Yaxshi', 'Хорошо')} stroke="#7a5af8" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="mb-3">
            <KV label={t("Boshlang'ich investitsiya", 'Начальные вложения')} value={money(base.investment)} />
            <KV label={t('Jami tushum (sotuv)', 'Выручка от продаж')} value={money(base.totalRevenue)} />
            <KV label={t('Jami joriy xarajat', 'Текущие расходы')} value={money(base.totalCost)} />
            <KV label={t('Naqd natija', 'Денежный результат')} value={money(base.cashProfit)} />
            <KV label={t('Oxirida poda qiymati', 'Стоимость стада в конце')} value={money(base.residualValue)} />
            <KV label={t('Umumiy foyda', 'Общая прибыль')} value={<b className={base.totalProfit < 0 ? 'text-red-600' : 'text-brand-700 dark:text-brand-400'}>{money(base.totalProfit)}</b>} strong />
            <KV label={t("O'rtacha oylik foyda", 'Средняя прибыль в месяц')} value={money(base.avgMonthlyProfit)} />
            <KV label={t("O'zini qoplash", 'Окупаемость')} value={base.paybackMonth ? t(`${base.paybackMonth}-oyda`, `на ${base.paybackMonth}-й мес.`) : t('muddat ichida qoplanmaydi', 'не окупается в срок')} />
            <div className="my-2 border-t border-stone-100 dark:border-stone-800" />
            <KV label={t("Tug'ilgan (tirik)", 'Родилось (живых)')} value={formatNum(base.bornTotal, 0)} />
            <KV label={t('Sotilgan', 'Продано')} value={formatNum(base.soldHeads, 0)} />
            <KV label={t('Oxirida bosh soni', 'Поголовье в конце')} value={formatNum(base.endHeads, 0)} />
            {base.costPerKgSold && <KV label={t('1 kg sotilgan vazn tannarxi', 'Себестоимость 1 кг проданного веса')} value={money(base.costPerKgSold)} />}
          </Card>
          {!base.paybackMonth && base.totalProfit > 0 && (
            <Callout tone="warn">{t("Naqd pul muddat ichida qaytmaydi, lekin poda qiymati hisobiga foyda bor. Muddatni uzaytirib ko'ring.", 'Деньги не возвращаются в срок, но прибыль есть за счёт стоимости стада. Попробуйте увеличить срок.')}</Callout>
          )}
          {base.totalProfit < 0 && (
            <Callout tone="bad">{t("Bu shartlarda biznes zarar ko'radi. Yem narxi, sotish narxi yoki bolalar sonini o'zgartirib ko'ring.", 'При этих условиях бизнес убыточен. Попробуйте изменить цену корма, цену продажи или приплод.')}</Callout>
          )}

          <Button variant="secondary" full className="no-print mt-3" onClick={() => setShowTable(!showTable)}>
            {showTable ? t('Jadvalni yashirish', 'Скрыть таблицу') : t("Oyma-oy jadval", 'Помесячная таблица')}
          </Button>
          {(showTable) && (
            <Card className="mt-3 overflow-x-auto p-0">
              <table className="w-full min-w-[560px] text-xs tabular-nums">
                <thead className="bg-stone-50 text-stone-500 dark:bg-stone-800/50">
                  <tr>
                    <th className="p-2">{t('Oy', 'Мес.')}</th>
                    <th className="p-2">{t('Katta', 'Взросл.')}</th>
                    <th className="p-2">{t('Yosh', 'Молодн.')}</th>
                    <th className="p-2">{t("Tug'ildi", 'Родилось')}</th>
                    <th className="p-2">{t('Sotildi', 'Продано')}</th>
                    <th className="p-2 text-right">{t('Tushum', 'Выручка')}</th>
                    <th className="p-2 text-right">{t('Xarajat', 'Расход')}</th>
                    <th className="p-2 text-right">{t("Jamg'arma", 'Итог')}</th>
                  </tr>
                </thead>
                <tbody>
                  {base.rows.map((r) => (
                    <tr key={r.month} className="border-t border-stone-100 text-center dark:border-stone-800">
                      <td className="p-2">{r.month}</td>
                      <td className="p-2">{formatNum(r.adults, 0)}</td>
                      <td className="p-2">{formatNum(r.young, 0)}</td>
                      <td className="p-2">{r.born ? formatNum(r.born, 0) : ''}</td>
                      <td className="p-2">{r.sold ? formatNum(r.sold, 0) : ''}</td>
                      <td className="p-2 text-right">{short(r.revenue)}</td>
                      <td className="p-2 text-right">{short(r.cost)}</td>
                      <td className={cx('p-2 text-right font-medium', r.cumulative < 0 ? 'text-red-600' : 'text-brand-700')}>{short(r.cumulative)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </Page>
  )
}
