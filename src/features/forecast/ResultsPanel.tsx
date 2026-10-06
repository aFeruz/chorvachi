import { useState, type ReactNode } from 'react'
import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  AlertTriangle, BadgeCheck, Calendar, CircleDollarSign, Flag, HeartPulse, Info, Lightbulb, Ruler, Scale, ShieldAlert, Sigma, Target, TrendingUp, Wheat,
} from 'lucide-react'
import { useSettings, type T } from '../../state/settings'
import { Button, Callout, Card, cx, KV, Section } from '../../components/ui'
import { IconTile } from '../../components/icons'
import type { Forecast, Goal, MilestoneKey, MilestoneStat, NeedResult } from '../../lib/forecast/analyze'
import { COST_KEYS, REV_KEYS, type ForecastInput } from '../../lib/forecast/types'
import { SPACE_M2 } from '../../lib/forecast/presets'
import { formatNum, pct } from '../../lib/money'
import { COST_COLORS, costLabel, durationText, factorLabel, milestoneLabel, monthText, revLabel, warningLabel } from './texts'

interface Props {
  input: ForecastInput
  goal: Goal
  result: Forecast
  needs?: NeedResult
  missing: string[]
  speciesKey?: string
}

export function ResultsPanel({ input, goal, result, needs, missing, speciesKey }: Props) {
  const { t, lang, money, short } = useSettings()
  const { summary: s, mc, milestones: ms, expected } = result
  const rows = expected.rows
  const hasMoney = missing.length === 0
  const unit = headUnit(t, input)
  /** boshlang'ich holatga nisbatan (bor poda ham hisobga olingan) */
  const gainOf = (wealth: number) => wealth - s.baseWealth

  /** m-oy -> "27-oy (mar 2028)" */
  const when = (m?: number) => {
    if (m === undefined) return t('muddat ichida emas', 'не в пределах срока')
    if (m === 0) return t("qo'shimcha pul kerak emas", 'доп. вложения не нужны')
    const key = rows[m - 1]?.month
    return `${m}-${t('oy', 'й мес.')}${key ? ` (${monthText(lang, key)})` : ''}`
  }
  const range = (st: MilestoneStat) =>
    st.p10 !== undefined && st.p90 !== undefined
      ? st.p10 === st.p90
        ? t(`${st.p10}-oy`, `${st.p10}-й мес.`)
        : t(`${st.p10}–${st.p90}-oylar`, `${st.p10}–${st.p90} мес.`)
      : st.p10 !== undefined
        ? t(`${st.p10}-oydan keyin`, `после ${st.p10} мес.`)
        : '—'

  const answer = answerFor(goal.type)
  function answerFor(type: Goal['type']): { title: ReactNode; sub: ReactNode; key?: MilestoneKey; tone: 'good' | 'bad' | 'info' } {
    const mk = (key: MilestoneKey, okText: (m: string) => string, failText: string) => {
      const m = ms[key]
      const st = mc.milestones[key]
      return {
        key,
        tone: m !== undefined ? ('good' as const) : st.prob > 0.3 ? ('info' as const) : ('bad' as const),
        title: m !== undefined ? okText(when(m)) : failText,
        sub: (
          <>
            {t('Ehtimol', 'Вероятность')}: <b>{pct(st.prob * 100, 0)}</b>
            {st.prob > 0 && <> · {t("80% holatda", 'в 80% случаев')}: {range(st)}</>}
          </>
        ),
      }
    }
    switch (type) {
      case 'heads':
        return mk(
          'heads',
          (w) => t(`${formatNum(goal.heads, 0)} ${unit}ga taxminan ${w} yetasiz`, `${formatNum(goal.heads, 0)} ${unit} — примерно на ${w}`),
          t(`${input.months} oy ichida ${formatNum(goal.heads, 0)} ${unit}ga yetilmaydi`, `За ${input.months} мес. ${formatNum(goal.heads, 0)} ${unit} не достигается`),
        )
      case 'cash':
        return mk(
          'cash',
          (w) => t(`${short(goal.amount)} sof foyda taxminan ${w}`, `${short(goal.amount)} чистой прибыли — примерно на ${w}`),
          t(`${input.months} oy ichida ${short(goal.amount)} sof foydaga yetilmaydi`, `За ${input.months} мес. ${short(goal.amount)} не набирается`),
        )
      case 'monthly':
        return mk(
          'monthly',
          (w) => t(`Oyiga ${short(goal.amount)} daromad taxminan ${w} dan`, `${short(goal.amount)} в месяц — примерно с ${w}`),
          t(`${input.months} oy ichida oyiga ${short(goal.amount)} chiqmaydi`, `За ${input.months} мес. ${short(goal.amount)}/мес. не выходит`),
        )
      case 'horizon':
        return {
          tone: s.gain >= 0 ? 'good' : 'bad',
          title: t(
            `${durationText(t, input.months)}dan keyin: ${formatNum(s.finalHeads, 0)} ${unit}, natija ${s.gain >= 0 ? '+' : ''}${short(s.gain)}`,
            `Через ${durationText(t, input.months)}: ${formatNum(s.finalHeads, 0)} ${unit}, итог ${s.gain >= 0 ? '+' : ''}${short(s.gain)}`,
          ),
          sub: (
            <>
              {t('80% holatda bosh soni', 'В 80% случаев поголовье')}: {formatNum(mc.finalHeads.p10, 0)}–{formatNum(mc.finalHeads.p90, 0)} ·{' '}
              {t('natija', 'итог')}: {short(gainOf(mc.finalWealth.p10))} … {short(gainOf(mc.finalWealth.p90))}
            </>
          ),
        }
      case 'need': {
        const n = needs?.startCount
        return {
          tone: n !== undefined ? 'good' : 'info',
          title: !needs
            ? t('Hisoblanmoqda…', 'Считаем…')
            : n !== undefined
              ? goal.needKind === 'heads'
                ? t(`${needs.months} oyda ${formatNum(goal.heads, 0)} ${unit} uchun kamida ${n} ${startUnit(t, input)} kerak`, `Для ${formatNum(goal.heads, 0)} ${unit} за ${needs.months} мес. нужно минимум ${n} ${startUnit(t, input)}`)
                : t(`${needs.months} oyda ${short(goal.amount)} uchun kamida ${n} ${startUnit(t, input)} kerak`, `Для ${short(goal.amount)} за ${needs.months} мес. нужно минимум ${n} ${startUnit(t, input)}`)
              : t('Bu maqsadga shu shartlarda yetib bo\'lmaydi', 'При этих условиях цель недостижима'),
          sub: needs?.startInvestment !== undefined ? <>{t('Kerakli sarmoya', 'Нужные вложения')}: <b>{money(needs.startInvestment)}</b> · {t("80% ishonch bilan", 'с уверенностью 80%')}</> : t("80% ishonch bilan hisoblanadi", 'Расчёт с уверенностью 80%'),
        }
      }
      case 'risk':
        return {
          tone: mc.lossProb > 0.3 ? 'bad' : mc.lossProb > 0.1 ? 'info' : 'good',
          title: t(`Zarar ko'rish ehtimoli: ${pct(mc.lossProb * 100, 0)}`, `Вероятность убытка: ${pct(mc.lossProb * 100, 0)}`),
          sub: (
            <>
              {t('Eng yomon 10% holatda natija', 'В худших 10% случаев итог')}: <b>{money(gainOf(mc.finalWealth.p10))}</b> · {t('kasallik chiqish ehtimoli', 'вероятность болезни')}: {pct(mc.outbreakProb * 100, 0)}
            </>
          ),
        }
      default:
        if (ms.payback === 0)
          return {
            key: 'payback',
            tone: 'good',
            title: t("Qo'shimcha sarmoya kerak emas — xarajatlar daromad bilan qoplanadi", 'Дополнительные вложения не нужны — расходы покрываются доходом'),
            sub: <>{t('Muddat oxirida natija', 'Итог на конец срока')}: <b>{s.gain >= 0 ? '+' : ''}{money(s.gain)}</b></>,
          }
        return mk(
          'payback',
          (w) => t(`Sarmoya taxminan ${w} to'liq qaytadi`, `Вложения вернутся примерно на ${w}`),
          t(`${input.months} oy ichida sarmoya to'liq qaytmaydi`, `За ${input.months} мес. вложения не возвращаются`),
        )
    }
  }

  const headsData = rows.map((r, k) => ({
    m: r.m,
    label: monthText(lang, r.month),
    expected: round1(r.heads),
    band: [round1(mc.heads.p10[k]), round1(mc.heads.p90[k])],
    core: round1(r.core),
  }))
  const moneyData = rows.map((r, k) => ({
    m: r.m,
    label: monthText(lang, r.month),
    cash: Math.round(r.cash),
    wealth: Math.round(r.wealth),
    band: [Math.round(mc.cash.p10[k]), Math.round(mc.cash.p90[k])],
  }))
  const tick = (v: number) => short(v).replace(/ /g, ' ')

  const totalCost = COST_KEYS.reduce((a, k) => a + s.costBy[k], 0)
  const totalRev = REV_KEYS.reduce((a, k) => a + s.revBy[k], 0)
  const recs = recommendations(t, money, input, result, speciesKey, hasMoney)

  return (
    <div>
      {expected.warnings.map((w) => (
        <Callout key={w} tone="warn" icon={<AlertTriangle size={18} />}>{warningLabel(t, w)}</Callout>
      ))}
      {!hasMoney && (
        <div className="mt-2">
          <Callout tone="warn" icon={<CircleDollarSign size={18} />}>
            {t("Narxlar to'liq kiritilmagan — bosh soni hisoblari to'g'ri, lekin pul hisoblari to'liq emas.", 'Цены заполнены не полностью — поголовье считается верно, но денежный расчёт неполный.')}
          </Callout>
        </div>
      )}

      {/* Javob */}
      <div
        className={cx(
          'my-3 rounded-3xl p-5 text-white shadow-lg',
          answer.tone === 'good' ? 'bg-gradient-to-br from-brand-700 to-brand-900' : answer.tone === 'bad' ? 'bg-gradient-to-br from-red-600 to-red-800' : 'bg-gradient-to-br from-sky-700 to-sky-900',
        )}
      >
        <div className="flex items-center gap-2 text-sm opacity-80">
          <Target size={16} />
          {t('Javob', 'Ответ')}
        </div>
        <div className="mt-1 text-xl leading-snug font-bold">{answer.title}</div>
        <div className="mt-2 text-sm opacity-90">{answer.sub}</div>
        <div className="mt-3 border-t border-white/20 pt-2 text-xs opacity-75">
          {t(
            `Taxminiy hisob: ${mc.runs} ta ehtimoliy holat (o'lim, kasallik, narx o'zgarishi bilan) tahlil qilindi. Rizq Allohdan — biz sabablarini qilamiz.`,
            `Ориентировочный расчёт: проанализировано ${mc.runs} вариантов (падёж, болезни, колебания цен). Результат — в руках Всевышнего, мы лишь делаем усилия.`,
          )}
        </div>
      </div>

      {/* Muhim sanalar */}
      <Section title={t('Muhim sanalar', 'Ключевые даты')}>
        <Card className="p-0">
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {(['firstBirth', 'firstSale', 'profitable', 'payback', 'wealthPositive', ...(goal.type === 'heads' ? ['heads'] : []), ...(goal.type === 'cash' ? ['cash'] : []), ...(goal.type === 'monthly' ? ['monthly'] : [])] as MilestoneKey[])
              .filter((k) => !(input.model !== 'herd' && k === 'firstBirth'))
              .filter((k) => hasMoney || !['profitable', 'payback', 'wealthPositive', 'cash', 'monthly'].includes(k))
              .map((k) => {
                const st = mc.milestones[k]
                return (
                  <div key={k} className="flex items-center gap-3 px-4 py-3">
                    <IconTile icon={k === 'payback' || k === 'profitable' ? BadgeCheck : k === 'heads' || k === 'cash' || k === 'monthly' ? Flag : Calendar} color={ms[k] !== undefined ? '#027a48' : '#a8a29e'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{milestoneLabel(t, k)}</div>
                      <div className="text-xs text-stone-500">
                        {t('ehtimol', 'вероятность')} {pct(st.prob * 100, 0)}
                        {st.prob > 0 && <> · {t('80% holatda', 'в 80%')}: {range(st)}</>}
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold">{when(ms[k])}</div>
                  </div>
                )
              })}
          </div>
        </Card>
      </Section>

      {/* Grafiklar */}
      <Section title={t('Bosh soni', 'Поголовье')}>
        <Card className="px-1 pb-1">
          <div className="h-64">
            <ResponsiveContainer>
              <ComposedChart data={headsData} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
                <Tooltip formatter={(v) => (Array.isArray(v) ? `${v[0]} – ${v[1]}` : formatNum(Number(v)))} contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area dataKey="band" name={t("80% oraliq", '80% диапазон')} fill="#12b76a" fillOpacity={0.15} stroke="none" />
                <Line dataKey="expected" name={t('Kutilgan (jami)', 'Ожидаемо (всего)')} stroke="#027a48" strokeWidth={2.5} dot={false} />
                {input.model === 'herd' && <Line dataKey="core" name={t('Onalar', 'Матки')} stroke="#db2777" strokeWidth={1.5} dot={false} />}
                {goal.type === 'heads' && <ReferenceLine y={goal.heads} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: t('maqsad', 'цель'), fontSize: 11, fill: '#b45309' }} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Section>

      {hasMoney && (
        <Section title={t("Pul oqimi (jamg'arma)", 'Денежный поток (нарастающий)')}>
          <Card className="px-1 pb-1">
            <div className="h-64">
              <ResponsiveContainer>
                <ComposedChart data={moneyData} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tickFormatter={tick} tick={{ fontSize: 10 }} width={58} />
                  <Tooltip formatter={(v) => (Array.isArray(v) ? `${money(Number(v[0]))} – ${money(Number(v[1]))}` : money(Number(v)))} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="#888" />
                  <Area dataKey="band" name={t('Naqd: 80% oraliq', 'Деньги: 80%')} fill="#2563eb" fillOpacity={0.12} stroke="none" />
                  <Line dataKey="cash" name={t('Naqd natija', 'Деньги')} stroke="#2563eb" strokeWidth={2.5} dot={false} />
                  <Line dataKey="wealth" name={t('Naqd + poda qiymati', 'Деньги + стадо')} stroke="#027a48" strokeWidth={2} strokeDasharray="6 3" dot={false} />
                  {goal.type === 'cash' && <ReferenceLine y={goal.amount} stroke="#f59e0b" strokeDasharray="5 5" />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="px-3 pb-2 text-xs text-stone-500">
              {t("«Naqd natija» — cho'ntakdagi pul (sarmoya ayirilgan). «Naqd + poda» — hammasini sotsangiz qo'lingizda qoladigan summa.", '«Деньги» — фактический итог (за вычетом вложений). «Деньги + стадо» — итог, если продать всё.')}
            </p>
          </Card>
        </Section>
      )}

      {/* Pul xulosasi */}
      {hasMoney && (
        <Section title={t(`Pul xulosasi (${durationText(t, input.months)})`, `Итоги (${durationText(t, input.months)})`)}>
          <Card>
            <KV label={t("Boshlang'ich sarmoya", 'Стартовые вложения')} value={money(s.investment)} />
            {input.startCash !== 0 && <KV label={t('Hozirgi naqd holat', 'Текущий итог')} value={money(input.startCash)} />}
            <KV label={t('Jami tushum', 'Выручка')} value={<span className="text-brand-700 dark:text-brand-400">{money(s.revenue)}</span>} />
            <KV label={t('Jami joriy xarajat', 'Текущие расходы')} value={<span className="text-red-600">{money(s.cost)}</span>} />
            <KV label={t("O'rtacha oylik sof daromad", 'Средний доход в месяц')} value={money(s.avgMonthlyNet)} />
            <div className="my-2 border-t border-stone-100 dark:border-stone-800" />
            <KV label={t('Muddat oxirida naqd', 'Деньги на конец')} value={money(s.finalCash)} strong />
            <KV label={t('Poda qiymati', 'Стоимость стада')} value={money(s.finalHerdValue)} />
            <KV label={t('Naqd + poda qiymati', 'Деньги + стадо')} value={money(s.finalWealth)} />
            {s.baseWealth !== 0 && <KV label={t("Boshlang'ich holat (naqd + bor poda)", 'Исходно (деньги + своё стадо)')} value={money(s.baseWealth)} />}
            <KV label={t("Sof natija (boshlang'ichga nisbatan)", 'Чистый итог (к исходному)')} value={<b className={s.gain >= 0 ? 'text-brand-700 dark:text-brand-400' : 'text-red-600'}>{s.gain >= 0 ? '+' : ''}{money(s.gain)}</b>} strong />
            {s.roiPct !== undefined && <KV label={t('Sarmoyaga nisbatan (ROI)', 'Рентабельность (ROI)')} value={pct(s.roiPct, 0)} />}
          </Card>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Card>
              <div className="mb-2 text-sm font-semibold">{t('Asosiy xarajatlar', 'Основные расходы')}</div>
              <Bars items={COST_KEYS.filter((k) => s.costBy[k] > 0).sort((a, b) => s.costBy[b] - s.costBy[a]).map((k) => ({ label: costLabel(t, k), value: s.costBy[k], color: COST_COLORS[k] }))} total={totalCost} />
            </Card>
            <Card>
              <div className="mb-2 text-sm font-semibold">{t('Daromad manbalari', 'Источники дохода')}</div>
              <Bars items={REV_KEYS.filter((k) => s.revBy[k] > 0).sort((a, b) => s.revBy[b] - s.revBy[a]).map((k) => ({ label: revLabel(t, k), value: s.revBy[k], color: '#12b76a' }))} total={totalRev} />
            </Card>
          </div>
        </Section>
      )}

      {/* Talablar */}
      <Section title={t('Nimalar kerak bo\'ladi', 'Что потребуется')}>
        <Card className="space-y-3">
          {hasMoney && (
            <Req icon={CircleDollarSign} color="#2563eb" title={t("Aylanma mablag'", 'Оборотные средства')}>
              {s.workingCapital > 0 ? (
                <>
                  {t('Bundan keyin cho\'ntakdan kamida', 'Из кармана потребуется минимум')} <b>{money(s.workingCapital)}</b>{' '}
                  {t('chiqadi', '')} ({t('eng qiyin payt', 'самый тяжёлый момент')}: {when(s.worstMonth)}). {t('Ehtiyot uchun', 'С запасом')}: <b>{money(mc.workingCapitalP90)}</b>.
                </>
              ) : (
                t("Qo'shimcha pul kerak bo'lmaydi — xarajatlar daromad bilan qoplanadi.", 'Дополнительные деньги не нужны — расходы покрываются доходом.')
              )}
            </Req>
          )}
          {s.feedKgTotal > 0 && (
            <Req icon={Wheat} color="#a16207" title={t('Yem', 'Корм')}>
              {t('Birinchi yilda', 'В первый год')} <b>{formatNum(s.feedKgFirstYear / 1000, 1)} {t('tonna', 'т')}</b> ({t("o'rtacha", 'в среднем')} {formatNum(s.feedKgFirstYear / Math.min(12, rows.length), 0)} {t('kg/oy', 'кг/мес.')}), {t('jami', 'всего')} {formatNum(s.feedKgTotal / 1000, 1)} {t('tonna', 'т')}.
            </Req>
          )}
          <Req icon={Ruler} color="#9a3412" title={t('Joy', 'Помещение')}>
            {t('Eng ko\'p', 'Максимум')} <b>{formatNum(s.peakHeads, 0)} {unit}</b> ({when(s.peakMonth)}), {t('ehtiyot bilan', 'с запасом')} {formatNum(mc.peakHeadsP90, 0)}.
            {speciesKey && SPACE_M2[speciesKey] && <> {t('Taxminan', 'Примерно')} <b>{formatNum(Math.ceil(mc.peakHeadsP90 * SPACE_M2[speciesKey]), 0)} m²</b> {t('yopiq joy kerak', 'закрытой площади')}.</>}
          </Req>
          {input.model === 'herd' && (
            <Req icon={HeartPulse} color="#db2777" title={t('Naslchi', 'Производители')}>
              {input.useAI
                ? t("Sun'iy urug'lantirish tanlangan.", 'Выбрано искусственное осеменение.')
                : t(`Eng ko'p ${formatNum(Math.max(...rows.map((r) => r.core)), 0)} ona bo'ladi — kamida ${Math.max(1, Math.ceil(Math.max(...rows.map((r) => r.core)) / 30))} ta naslchi kerak (hozir ${input.males}).`, `Маток будет до ${formatNum(Math.max(...rows.map((r) => r.core)), 0)} — нужно минимум ${Math.max(1, Math.ceil(Math.max(...rows.map((r) => r.core)) / 30))} производителей (сейчас ${input.males}).`)}
            </Req>
          )}
          {hasMoney && (
            <Req icon={ShieldAlert} color="#dc2626" title={t('Veterinariya va ish haqi', 'Ветеринария и зарплата')}>
              {s.costBy.vet + s.costBy.disease + s.costBy.labor > 0 ? (
                <>
                  {t('Yiliga taxminan', 'В год примерно')} {money((s.costBy.vet + s.costBy.disease) / Math.max(1, rows.length / 12))} {t('vet xarajati va', 'на ветеринарию и')} {money(s.costBy.labor / Math.max(1, rows.length / 12))} {t('ish haqi', 'на зарплату')}.
                </>
              ) : (
                t("Kiritilmagan. O'zingiz boqsangiz ham, vaksina va dori xarajatini «Doimiy xarajatlar» bo'limida kiriting — hisob aniqroq bo'ladi.", 'Не указано. Даже если ухаживаете сами, внесите расходы на вакцины и лекарства в «Постоянные расходы» — расчёт будет точнее.')
              )}
            </Req>
          )}
        </Card>
      </Section>

      {/* Xatarlar */}
      <Section title={t('Xatarlar va ssenariylar', 'Риски и сценарии')}>
        <Card>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { k: 'bad', label: t('Yomon yil', 'Плохой год'), sm: result.bad, ms: result.badMilestones, cls: 'bg-red-50 dark:bg-red-950/40' },
              { k: 'base', label: t('Kutilgan', 'Ожидаемо'), sm: s, ms, cls: 'bg-stone-100 dark:bg-stone-800 ring-2 ring-brand-600' },
              { k: 'good', label: t('Yaxshi yil', 'Хороший год'), sm: result.good, ms: result.goodMilestones, cls: 'bg-brand-50 dark:bg-brand-950/40' },
            ].map((x) => (
              <div key={x.k} className={cx('rounded-2xl p-2.5', x.cls)}>
                <div className="text-xs font-medium text-stone-500">{x.label}</div>
                <div className="text-lg font-bold">{formatNum(x.sm.finalHeads, 0)}</div>
                <div className="text-[11px] text-stone-500">{unit}</div>
                {hasMoney && (
                  <>
                    <div className={cx('mt-1 text-sm font-semibold', x.sm.gain < 0 && 'text-red-600')}>{x.sm.gain >= 0 ? '+' : ''}{short(x.sm.gain)}</div>
                    <div className="text-[11px] text-stone-500">{t('qoplanish', 'окупаемость')}: {x.ms.payback ? `${x.ms.payback}-${t('oy', 'мес')}` : x.ms.payback === 0 ? t('kerak emas', 'не нужна') : '—'}</div>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {t("Yomon yil: o'lim 2 barobar, narx −15%, yem +15%, kamroq bola. Yaxshi yil — aksincha.", 'Плохой год: падёж ×2, цена −15%, корм +15%, меньше приплода. Хороший — наоборот.')}
          </p>
          <div className="my-3 border-t border-stone-100 dark:border-stone-800" />
          {hasMoney && <KV label={t("Zarar ko'rish ehtimoli", 'Вероятность убытка')} value={<b className={mc.lossProb > 0.3 ? 'text-red-600' : ''}>{pct(mc.lossProb * 100, 0)}</b>} />}
          <KV label={t('Kamida bir marta kasallik chiqishi', 'Хотя бы одна вспышка болезни')} value={pct(mc.outbreakProb * 100, 0)} />
          {hasMoney && <KV label={t('Sof natija oralig\'i (80%)', 'Диапазон итога (80%)')} value={`${short(gainOf(mc.finalWealth.p10))} … ${short(gainOf(mc.finalWealth.p90))}`} />}
          <KV label={t("Bosh soni oralig'i (80%)", 'Диапазон поголовья (80%)')} value={`${formatNum(mc.finalHeads.p10, 0)} … ${formatNum(mc.finalHeads.p90, 0)}`} />
        </Card>
        {hasMoney && result.sensitivity.length > 0 && (
          <Card className="mt-3">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><Sigma size={16} />{t("Natijaga eng ko'p ta'sir qiladigan omillar", 'Что сильнее всего влияет на итог')}</div>
            <p className="mb-3 text-xs text-stone-500">{t("Har bir omil 20% yomonlashsa / yaxshilansa, muddat oxiridagi natija qanchaga o'zgaradi", 'Как изменится итог, если фактор ухудшится / улучшится на 20%')}</p>
            <Tornado items={result.sensitivity.slice(0, 7).map((f) => ({ label: factorLabel(t, f.key), low: f.low, high: f.high }))} short={short} />
          </Card>
        )}
      </Section>

      {/* Teskari hisob */}
      <Section title={t('Maqsadga yetish uchun', 'Что нужно для цели')}>
        <Card>
          {!needs ? (
            <p className="text-sm text-stone-500">{t('Hisoblanmoqda…', 'Считаем…')}</p>
          ) : (
            <>
              {needs.kind && needs.startCount === undefined && (
                <KV label={t('Maqsad', 'Цель')} value={t(`${needs.months} oyda erishib bo'lmaydi`, `за ${needs.months} мес. недостижимо`)} />
              )}
              {needs.startCount !== undefined && (
                <KV
                  label={needs.kind === 'heads'
                    ? t(`${needs.months} oyda ${formatNum(needs.target ?? 0, 0)} ${unit} uchun boshlang'ich`, `Для ${formatNum(needs.target ?? 0, 0)} ${unit} за ${needs.months} мес. нужно на старте`)
                    : t(`${needs.months} oyda ${short(needs.target ?? 0)} uchun boshlang'ich`, `Для ${short(needs.target ?? 0)} за ${needs.months} мес. нужно на старте`)}
                  value={<b>{needs.startCount} {startUnit(t, input)}</b>}
                />
              )}
              {needs.startInvestment !== undefined && hasMoney && <KV label={t('Buning uchun sarmoya', 'Вложения для этого')} value={money(needs.startInvestment)} />}
              {hasMoney && needs.priceFactor !== undefined && <KV label={t(`${short(goal.amount)} uchun sotish narxi`, `Цена продажи для ${short(goal.amount)}`)} value={priceText(t, money, input, needs.priceFactor)} />}
              {hasMoney && needs.breakEvenPriceFactor !== undefined && <KV label={t('Zararsiz bo\'lish uchun eng past narx', 'Минимальная цена без убытка')} value={priceText(t, money, input, needs.breakEvenPriceFactor)} />}
              {hasMoney && needs.maxFeedFactor !== undefined && (
                <KV
                  label={t('Yem shu narxgacha qimmatlashsa ham zarar yo\'q', 'Корм может подорожать до')}
                  value={needs.maxFeedFactor >= 10 ? t('10 barobardan ko\'p', 'более чем в 10 раз') : `${money(feedPrice(input) * needs.maxFeedFactor)} / kg (+${pct((needs.maxFeedFactor - 1) * 100, 0)})`}
                />
              )}
              <p className="mt-2 text-xs text-stone-500">{t("Bosh soni 80% ishonch bilan (ehtimoliy holatlarning 80 foizida) hisoblangan.", 'Поголовье рассчитано с уверенностью 80%.')}</p>
            </>
          )}
        </Card>
      </Section>

      {/* Tavsiyalar */}
      {recs.length > 0 && (
        <Section title={t('Tavsiyalar', 'Рекомендации')}>
          <div className="space-y-2">
            {recs.map((r, k) => (
              <Callout key={k} tone={r.tone} icon={r.tone === 'bad' ? <AlertTriangle size={18} /> : r.tone === 'good' ? <TrendingUp size={18} /> : <Lightbulb size={18} />}>
                {r.text}
              </Callout>
            ))}
          </div>
        </Section>
      )}

      <Tables input={input} result={result} hasMoney={hasMoney} />

      <Callout tone="info" icon={<Info size={18} />}>
        {t(
          "Bu hisob-kitob taxminiy. Haqiqiy natija ob-havo, kasallik, bozor va mehnatga bog'liq. Rizq Allohdan — biz sabablarini qilamiz. Raqamlarni o'z tajribangizga qarab o'zgartiring va hisobni muntazam yangilab boring.",
          'Расчёт ориентировочный. Реальный итог зависит от погоды, болезней, рынка и труда. Результат — в руках Всевышнего, мы делаем усилия. Подстраивайте цифры под свой опыт и регулярно обновляйте расчёт.',
        )}
      </Callout>
    </div>
  )
}

function round1(x: number) {
  return Math.round(x * 10) / 10
}

function headUnit(t: T, i: ForecastInput) {
  return i.model === 'apiary' ? t('oila', 'семей') : t('bosh', 'гол.')
}

function startUnit(t: T, i: ForecastInput) {
  switch (i.model) {
    case 'herd':
      return t('ona', 'маток')
    case 'batch':
      return t('bosh (partiyada)', 'гол. в партии')
    case 'layer':
      return t('tovuq', 'кур')
    case 'apiary':
      return t('oila', 'семей')
  }
}

function salePrice(i: ForecastInput) {
  switch (i.model) {
    case 'herd':
    case 'batch':
      return { v: i.salePricePerKg, u: 'kg' }
    case 'layer':
      return { v: i.eggPrice, u: 'dona' }
    case 'apiary':
      return { v: i.honeyPricePerKg, u: 'kg' }
  }
}

function feedPrice(i: ForecastInput) {
  return i.model === 'apiary' ? i.sugarPricePerKg : i.feedPricePerKg
}

function priceText(t: T, money: (n: number) => string, i: ForecastInput, k: number) {
  const p = salePrice(i)
  if (!p.v) return '—'
  const diff = (k - 1) * 100
  return `${money(p.v * k)} / ${p.u} (${diff >= 0 ? '+' : ''}${formatNum(diff, 0)}% ${t('hozirgiga nisbatan', 'к текущей')})`
}

function Req({ icon, color, title, children }: { icon: typeof Wheat; color: string; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <IconTile icon={icon} color={color} size="sm" />
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-semibold">{title}</div>
        <div className="text-stone-600 dark:text-stone-300">{children}</div>
      </div>
    </div>
  )
}

function Bars({ items, total }: { items: { label: string; value: number; color: string }[]; total: number }) {
  const { short } = useSettings()
  if (!items.length) return <p className="text-sm text-stone-500">—</p>
  return (
    <div className="space-y-2">
      {items.map((x) => (
        <div key={x.label}>
          <div className="flex justify-between text-sm">
            <span>{x.label}</span>
            <span className="tabular-nums">
              {short(x.value)} <span className="text-xs text-stone-500">{pct(total ? (x.value / total) * 100 : 0, 0)}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-stone-100 dark:bg-stone-800">
            <div className="h-2 rounded-full" style={{ width: `${total ? (x.value / total) * 100 : 0}%`, background: x.color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Tornado({ items, short }: { items: { label: string; low: number; high: number }[]; short: (n: number) => string }) {
  const max = Math.max(1, ...items.flatMap((x) => [Math.abs(x.low), Math.abs(x.high)]))
  const neg = (x: { low: number; high: number }) => Math.min(x.low, x.high)
  const pos = (x: { low: number; high: number }) => Math.max(x.low, x.high)
  return (
    <div className="space-y-2.5">
      {items.map((x) => (
        <div key={x.label}>
          <div className="mb-0.5 text-sm">{x.label}</div>
          <div className="grid grid-cols-2 items-center gap-0.5">
            <div className="flex justify-end">
              <div className="flex h-5 items-center justify-end rounded-l-md bg-red-500/80 pr-1 text-[10px] font-semibold whitespace-nowrap text-white" style={{ width: `${Math.max(2, (Math.abs(Math.min(0, neg(x))) / max) * 100)}%` }}>
                {neg(x) < 0 ? short(neg(x)) : ''}
              </div>
            </div>
            <div className="flex h-5 items-center rounded-r-md bg-brand-500/80 pl-1 text-[10px] font-semibold whitespace-nowrap text-white" style={{ width: `${Math.max(2, (Math.max(0, pos(x)) / max) * 100)}%` }}>
              {pos(x) > 0 ? '+' + short(pos(x)) : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Tables({ input, result, hasMoney }: { input: ForecastInput; result: Forecast; hasMoney: boolean }) {
  const { t, lang, short } = useSettings()
  const [monthly, setMonthly] = useState(false)
  const rows = result.expected.rows
  return (
    <Section title={t('Jadval', 'Таблица')} action={<Button size="sm" variant="ghost" onClick={() => setMonthly(!monthly)} icon={<Scale size={16} />}>{monthly ? t('Yillar', 'По годам') : t('Oylar', 'По месяцам')}</Button>}>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-xs tabular-nums">
          <thead className="bg-stone-50 text-stone-500 dark:bg-stone-800/50">
            <tr>
              <th className="p-2 text-left">{monthly ? t('Oy', 'Мес.') : t('Yil', 'Год')}</th>
              <th className="p-2">{headUnit(t, input)}</th>
              {input.model === 'herd' && <th className="p-2">{t('Onalar', 'Матки')}</th>}
              {input.model !== 'batch' && <th className="p-2">{t("Tug'ildi", 'Родилось')}</th>}
              <th className="p-2">{t('Sotildi', 'Продано')}</th>
              <th className="p-2">{t("O'ldi", 'Пало')}</th>
              {hasMoney && <th className="p-2 text-right">{t('Tushum', 'Выручка')}</th>}
              {hasMoney && <th className="p-2 text-right">{t('Xarajat', 'Расход')}</th>}
              {hasMoney && <th className="p-2 text-right">{t('Naqd', 'Деньги')}</th>}
            </tr>
          </thead>
          <tbody>
            {monthly
              ? rows.map((r) => (
                  <tr key={r.m} className="border-t border-stone-100 text-center dark:border-stone-800">
                    <td className="p-2 text-left">{r.m}. {monthText(lang, r.month)}</td>
                    <td className="p-2">{formatNum(r.heads, 0)}</td>
                    {input.model === 'herd' && <td className="p-2">{formatNum(r.core, 0)}</td>}
                    {input.model !== 'batch' && <td className="p-2">{r.born >= 0.5 ? formatNum(r.born, 0) : ''}</td>}
                    <td className="p-2">{r.sold >= 0.5 ? formatNum(r.sold, 0) : ''}</td>
                    <td className="p-2">{r.died >= 0.5 ? formatNum(r.died, 0) : r.died > 0 ? formatNum(r.died, 1) : ''}</td>
                    {hasMoney && <td className="p-2 text-right">{r.revenue ? short(r.revenue) : ''}</td>}
                    {hasMoney && <td className="p-2 text-right">{short(r.cost)}</td>}
                    {hasMoney && <td className={cx('p-2 text-right font-medium', r.cash < 0 ? 'text-red-600' : 'text-brand-700 dark:text-brand-400')}>{short(r.cash)}</td>}
                  </tr>
                ))
              : result.summary.years.map((y) => (
                  <tr key={y.year} className="border-t border-stone-100 text-center dark:border-stone-800">
                    <td className="p-2 text-left">{y.year}-{t('yil', 'й год')}</td>
                    <td className="p-2">{formatNum(y.endHeads, 0)}</td>
                    {input.model === 'herd' && <td className="p-2">{formatNum(rows[Math.min(rows.length - 1, y.year * 12 - 1)].core, 0)}</td>}
                    {input.model !== 'batch' && <td className="p-2">{formatNum(y.born, 0)}</td>}
                    <td className="p-2">{formatNum(y.sold, 0)}</td>
                    <td className="p-2">{formatNum(y.died, 0)}</td>
                    {hasMoney && <td className="p-2 text-right">{short(y.revenue)}</td>}
                    {hasMoney && <td className="p-2 text-right">{short(y.cost)}</td>}
                    {hasMoney && <td className={cx('p-2 text-right font-medium', y.endCash < 0 ? 'text-red-600' : 'text-brand-700 dark:text-brand-400')}>{short(y.endCash)}</td>}
                  </tr>
                ))}
          </tbody>
        </table>
      </Card>
    </Section>
  )
}

/* ------------------------------------------------------------------ */

interface Rec {
  tone: 'good' | 'bad' | 'info' | 'warn'
  text: string
}

function recommendations(t: T, money: (n: number) => string, i: ForecastInput, r: Forecast, speciesKey: string | undefined, hasMoney: boolean): Rec[] {
  const out: Rec[] = []
  const s = r.summary
  const mc = r.mc
  if (hasMoney) {
    if (r.milestones.payback === undefined)
      out.push({
        tone: 'bad',
        text: t(
          `Tanlangan ${i.months} oyda sarmoya to'liq qaytmaydi. Muddatni uzaytirib ko'ring${r.sensitivity[0] ? ` yoki «${factorLabel(t, r.sensitivity[0].key)}»ni yaxshilang — u natijaga eng ko'p ta'sir qiladi` : ''}.`,
          `За ${i.months} мес. вложения не возвращаются. Увеличьте срок${r.sensitivity[0] ? ` или улучшите «${factorLabel(t, r.sensitivity[0].key)}» — это главный фактор` : ''}.`,
        ),
      })
    else if (r.milestones.payback > 0)
      out.push({ tone: 'good', text: t(`Sarmoya ${r.milestones.payback}-oyda qaytadi, shundan keyin har oy o'rtacha ${money(s.avgMonthlyNet)} sof daromad.`, `Вложения вернутся на ${r.milestones.payback}-й мес., далее в среднем ${money(s.avgMonthlyNet)} в месяц.`) })
    if (s.workingCapital > 0)
      out.push({ tone: 'info', text: t(`Ishni boshlashdan oldin kamida ${money(s.workingCapital)} tayyorlang; kutilmagan holat uchun ${money(mc.workingCapitalP90)} bo'lsa xotirjam bo'lasiz.`, `Перед стартом подготовьте минимум ${money(s.workingCapital)}; для спокойствия — ${money(mc.workingCapitalP90)}.`) })
    const top = r.sensitivity[0]
    if (top)
      out.push({ tone: 'info', text: t(`Natijaga eng ko'p «${factorLabel(t, top.key)}» ta'sir qiladi: 20% o'zgarsa, natija taxminan ${money(top.swing / 2)} ga o'zgaradi. Shu omilga alohida e'tibor bering.`, `Сильнее всего влияет «${factorLabel(t, top.key)}»: изменение на 20% меняет итог примерно на ${money(top.swing / 2)}.`) })
    const feedShare = s.cost > 0 ? s.costBy.feed / s.cost : 0
    if (feedShare > 0.5)
      out.push({ tone: 'warn', text: t(`Xarajatlarning ${Math.round(feedShare * 100)}% — yem. Yemni mavsumida ulgurji olish, o'zingiz yetishtirish yoki yaylovdan ko'proq foydalanish foydani sezilarli oshiradi.`, `${Math.round(feedShare * 100)}% расходов — корм. Закупка оптом в сезон, своё производство или пастбище заметно повысят прибыль.`) })
    if (r.milestones.payback === undefined && s.gain > 0 && s.finalHerdValue > 0)
      out.push({
        tone: 'info',
        text: t(
          `Naqd pul hali qaytmaydi, lekin u yo'qolmaydi — podada (hayvon ko'rinishida) to'planadi: muddat oxirida poda qiymati ${money(s.finalHerdValue)}. Naqd tezroq kerak bo'lsa, urg'ochi bolalarning bir qismini ham soting yoki «onalar soni chegarasi»ni kamaytiring.`,
          `Деньги пока не возвращаются, но не теряются — они копятся в стаде: стоимость стада к концу ${money(s.finalHerdValue)}. Если деньги нужны быстрее — продавайте часть самок или уменьшите «предел маток».`,
        ),
      })
    if (mc.lossProb > 0.3) out.push({ tone: 'bad', text: t(`Zarar ehtimoli yuqori (${Math.round(mc.lossProb * 100)}%). Kichikroq boshlab, tajriba orttirib kengaytirish xavfsizroq.`, `Высокая вероятность убытка (${Math.round(mc.lossProb * 100)}%). Безопаснее начать меньше и расширяться с опытом.`) })
    else if (mc.lossProb < 0.1)
      out.push({
        tone: 'good',
        text: t(
          `Poda qiymatini ham hisoblasak, deyarli barcha holatlarda natija musbat (zarar ehtimoli ${Math.round(mc.lossProb * 100)}%).`,
          `С учётом стоимости стада почти во всех вариантах итог положительный (вероятность убытка ${Math.round(mc.lossProb * 100)}%).`,
        ),
      })
  }
  if (mc.outbreakProb > 0.3)
    out.push({ tone: 'warn', text: t(`Muddat davomida kamida bir marta kasallik chiqish ehtimoli ${Math.round(mc.outbreakProb * 100)}%. Emlash va dezinfeksiyani o'z vaqtida qiling, yangi hayvonni 2–3 hafta alohida saqlang.`, `Вероятность хотя бы одной вспышки — ${Math.round(mc.outbreakProb * 100)}%. Вакцинируйте вовремя, новых животных держите 2–3 недели на карантине.`) })
  if (i.model === 'herd') {
    const maxCore = Math.max(...r.expected.rows.map((x) => x.core))
    const needMales = Math.ceil(maxCore / 30)
    if (!i.useAI && i.males < needMales) out.push({ tone: 'warn', text: t(`Onalar ${Math.round(maxCore)} taga yetadi — ${needMales} ta naslchi kerak bo'ladi (hozir ${i.males}).`, `Маток станет ${Math.round(maxCore)} — понадобится ${needMales} производителей (сейчас ${i.males}).`) })
    if (i.youngMortalityPct > 10) out.push({ tone: 'warn', text: t("Bolalar o'limi yuqori. Tug'ish davrida issiq, toza joy va og'iz suti (molozivo) bilan o'z vaqtida oziqlantirish o'limni ancha kamaytiradi.", 'Высокий падёж молодняка. Тёплое чистое место при родах и своевременное молозиво заметно снижают падёж.') })
  }
  if (speciesKey && SPACE_M2[speciesKey] && s.peakHeads > 0)
    out.push({ tone: 'info', text: t(`Eng ko'p ${Math.round(mc.peakHeadsP90)} boshga joy tayyorlang (≈${Math.ceil(mc.peakHeadsP90 * SPACE_M2[speciesKey])} m²).`, `Подготовьте место на ${Math.round(mc.peakHeadsP90)} голов (≈${Math.ceil(mc.peakHeadsP90 * SPACE_M2[speciesKey])} м²).`) })
  return out
}
