import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Line, ComposedChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartColumn, Download } from 'lucide-react'
import { SpeciesAvatar, SpeciesIcon } from '../../components/icons'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Card, Chips, DateInput, Empty, KV, List, ListRow, Money, Page, Section, Stat } from '../../components/ui'
import { pnl } from '../../lib/calc/pnl'
import { saleResult } from '../../lib/calc/pricing'
import { groupHeadsAt, isPresent } from '../../lib/calc/costBasis'
import { addDays, formatDate, startOfMonth, startOfYear, today } from '../../lib/dates'
import { formatNum, pct } from '../../lib/money'
import { exportExcel } from './exportExcel'
import { monthName } from '../finance/FinancePage'

type Period = 'month' | '3m' | 'year' | 'all' | 'custom'

export default function ReportsPage() {
  const f = useFarm()
  const { t, lt, money, short, lang } = useSettings()
  const nav = useNavigate()
  const [period, setPeriod] = useState<Period>('year')
  const [cFrom, setCFrom] = useState(startOfYear(today()))
  const [cTo, setCTo] = useState(today())

  const firstDate = useMemo(() => [...f.expenses, ...f.incomes].map((e) => e.date).sort()[0] ?? today(), [f.expenses, f.incomes])
  const [from, to] =
    period === 'month' ? [startOfMonth(today()), today()]
      : period === '3m' ? [addDays(today(), -90), today()]
        : period === 'year' ? [startOfYear(today()), today()]
          : period === 'all' ? [firstDate, today()]
            : [cFrom, cTo]

  const r = useMemo(() => pnl(f.expenses, f.incomes, from, to), [f.expenses, f.incomes, from, to])

  const expPie = Object.entries(r.expenseByCat)
    .map(([id, v]) => ({ id, name: lt(f.catMap.get(id)?.name), value: v, color: f.catMap.get(id)?.color ?? '#999' }))
    .sort((a, b) => b.value - a.value)
  const incPie = Object.entries(r.incomeByCat)
    .map(([id, v]) => ({ id, name: lt(f.catMap.get(id)?.name), value: v, color: f.catMap.get(id)?.color ?? '#999' }))
    .sort((a, b) => b.value - a.value)

  // Poda harakati
  const herd = useMemo(() => {
    const rows = f.species
      .map((s) => {
        const an = f.animals.filter((a) => a.speciesId === s.id)
        const groups = f.groups.filter((g) => g.speciesId === s.id && f.isGroupMode(g))
        const dayBefore = addDays(from, -1)
        let start = an.filter((a) => isPresent(a, dayBefore)).length
        let end = an.filter((a) => isPresent(a, to)).length
        const inR = (d?: string) => !!d && d >= from && d <= to
        let bought = an.filter((a) => a.origin === 'bought' && inR(a.acquiredDate)).length
        let born = an.filter((a) => a.origin === 'born' && inR(a.acquiredDate)).length
        let sold = an.filter((a) => (a.status === 'sold' || a.status === 'slaughtered') && inR(a.exitDate)).length
        let died = an.filter((a) => (a.status === 'dead' || a.status === 'lost') && inR(a.exitDate)).length
        for (const g of groups) {
          start += groupHeadsAt(f.movements, g.id, dayBefore)
          end += groupHeadsAt(f.movements, g.id, to)
          for (const m of f.movements) {
            if (m.groupId !== g.id || !inR(m.date)) continue
            if (m.type === 'in') bought += m.count
            if (m.type === 'birth') born += m.count
            if (m.type === 'sold' || m.type === 'slaughter') sold += m.count
            if (m.type === 'death') died += m.count
          }
        }
        return { s, start, bought, born, sold, died, end }
      })
      .filter((x) => x.start + x.bought + x.born + x.end > 0)
    return rows
  }, [f, from, to])

  // Sotilgan hayvonlar rentabelligi
  const sales = useMemo(() => {
    return f.incomes
      .filter((i) => i.date >= from && i.date <= to && i.animalIds?.length)
      .flatMap((i) =>
        i.animalIds!.map((aid) => {
          const a = f.animalMap.get(aid)
          const cost = f.costOf(aid).total
          const rev = i.amount / i.animalIds!.length
          return { a, res: saleResult(rev, cost), date: i.date }
        }),
      )
      .filter((x) => x.a)
      .sort((a, b) => b.res.profit - a.res.profit)
  }, [f, from, to])

  // Guruhlar natijasi
  const groupsRes = f.groups.map((g) => {
    const members = new Set(f.animals.filter((a) => a.groupId === g.id).map((a) => a.id))
    const inc = f.incomes
      .filter((i) => (i.scope === 'group' && i.targetId === g.id) || i.animalIds?.some((a) => members.has(a)))
      .reduce((s, i) => s + (i.animalIds?.length ? (i.amount * i.animalIds.filter((a) => members.has(a)).length) / i.animalIds.length : i.amount), 0)
    const cost = f.groupCost(g).total
    return { g, inc, cost, net: inc - cost }
  })

  const dead = f.animals.filter((a) => a.status === 'dead' && a.exitDate && a.exitDate >= from && a.exitDate <= to)
  const deadLoss = dead.reduce((s, a) => s + f.costOf(a.id).total, 0)

  const tick = (v: number) => short(v).replace(/ /g, ' ')
  const empty = r.income === 0 && r.expense === 0

  return (
    <Page
      wide
      title={t('Hisobotlar', 'Отчёты')}
      actions={<Button size="sm" variant="ghost" icon={<Download size={18} />} onClick={() => exportExcel(f, { t, lt, from, to })}>Excel</Button>}
    >
      <Chips
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'month', label: t('Shu oy', 'Месяц') },
          { value: '3m', label: t('3 oy', '3 мес.') },
          { value: 'year', label: t('Shu yil', 'Год') },
          { value: 'all', label: t('Hammasi', 'Всё') },
          { value: 'custom', label: t('Tanlash', 'Период') },
        ]}
      />
      {period === 'custom' && (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <DateInput value={cFrom} onChange={setCFrom} />
          <DateInput value={cTo} onChange={setCTo} />
        </div>
      )}
      <p className="mb-3 px-1 text-sm text-stone-500">{formatDate(from)} — {formatDate(to)}</p>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t('Daromad', 'Доход')} value={short(r.income)} tone="pos" />
        <Stat label={t('Xarajat', 'Расход')} value={short(r.expense)} tone="neg" />
        <Stat label={r.profit >= 0 ? t('Sof foyda', 'Чистая прибыль') : t('Zarar', 'Убыток')} value={short(r.profit)} tone={r.profit >= 0 ? 'pos' : 'neg'} sub={r.income ? t(`marja ${pct(r.marginPct, 0)}`, `маржа ${pct(r.marginPct, 0)}`) : undefined} />
        <Stat label={t('Poda qiymati (hozir)', 'Стоимость стада')} value={short(f.herdValue)} sub={t('bozor narxida', 'по рынку')} onClick={() => nav('/settings#prices')} />
      </div>

      {empty ? (
        <Empty icon={<ChartColumn size={30} />} title={t("Bu davrda ma'lumot yo'q", 'Нет данных за период')} />
      ) : (
        <>
          <Section title={t('Oylik dinamika', 'Помесячно')}>
            <Card className="px-1 pb-1">
              <div className="h-64">
                <ResponsiveContainer>
                  <ComposedChart data={r.monthly.map((m) => ({ ...m, label: monthName(lang, m.month).slice(0, 3) + ' ' + m.month.slice(2, 4) }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={tick} tick={{ fontSize: 11 }} width={56} />
                    <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="income" name={t('Daromad', 'Доход')} fill="#12b76a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name={t('Xarajat', 'Расход')} fill="#f04438" radius={[4, 4, 0, 0]} />
                    <Line dataKey="cumulative" name={t("Jamg'arma natija", 'Нарастающий итог')} stroke="#7a5af8" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Section>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: t('Xarajatlar tarkibi', 'Структура расходов'), data: expPie, total: r.expense },
              { title: t('Daromad manbalari', 'Источники дохода'), data: incPie, total: r.income },
            ].map((blk) => (
              <Section key={blk.title} title={blk.title}>
                <Card>
                  {blk.data.length === 0 ? (
                    <p className="text-sm text-stone-500">—</p>
                  ) : (
                    <>
                      <div className="h-44">
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={blk.data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                              {blk.data.map((d) => <Cell key={d.id} fill={d.color} />)}
                            </Pie>
                            <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {blk.data.map((d) => (
                          <div key={d.id} className="flex items-center gap-2 text-sm">
                            <span className="size-3 shrink-0 rounded" style={{ background: d.color }} />
                            <span className="min-w-0 flex-1 truncate">{d.name}</span>
                            <span className="text-stone-500">{pct((d.value / blk.total) * 100, 0)}</span>
                            <span className="w-28 text-right font-medium tabular-nums">{short(d.value)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              </Section>
            ))}
          </div>
        </>
      )}

      {herd.length > 0 && (
        <Section title={t('Poda harakati', 'Движение поголовья')}>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-stone-50 text-xs text-stone-500 dark:bg-stone-800/50">
                <tr>
                  <th className="p-2 text-left">{t('Tur', 'Вид')}</th>
                  <th className="p-2">{t('Boshida', 'Начало')}</th>
                  <th className="p-2">{t('Olindi', 'Куплено')}</th>
                  <th className="p-2">{t("Tug'ildi", 'Родилось')}</th>
                  <th className="p-2">{t('Sotildi', 'Продано')}</th>
                  <th className="p-2">{t("O'ldi", 'Пало')}</th>
                  <th className="p-2">{t('Oxirida', 'Конец')}</th>
                </tr>
              </thead>
              <tbody>
                {herd.map((h) => (
                  <tr key={h.s.id} className="border-t border-stone-100 text-center tabular-nums dark:border-stone-800">
                    <td className="p-2 text-left"><span className="flex items-center gap-2"><SpeciesIcon s={h.s} size={16} className="text-stone-500" />{lt(h.s.name)}</span></td>
                    <td className="p-2">{formatNum(h.start, 0)}</td>
                    <td className="p-2 text-brand-700 dark:text-brand-400">{h.bought ? '+' + formatNum(h.bought, 0) : '—'}</td>
                    <td className="p-2 text-brand-700 dark:text-brand-400">{h.born ? '+' + formatNum(h.born, 0) : '—'}</td>
                    <td className="p-2 text-sky-600">{h.sold ? '−' + formatNum(h.sold, 0) : '—'}</td>
                    <td className="p-2 text-red-600">{h.died ? '−' + formatNum(h.died, 0) : '—'}</td>
                    <td className="p-2 font-bold">{formatNum(h.end, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {deadLoss > 0 && <p className="mt-2 px-1 text-sm text-red-600">{t(`O'lim tufayli yo'qotilgan tannarx: ${money(deadLoss)}`, `Потери себестоимости от падежа: ${money(deadLoss)}`)}</p>}
        </Section>
      )}

      {groupsRes.length > 0 && (
        <Section title={t('Guruhlar natijasi (butun davr)', 'Результат по группам (всё время)')}>
          <Card className="px-1">
            <div style={{ height: Math.max(120, groupsRes.length * 44) }}>
              <ResponsiveContainer>
                <BarChart layout="vertical" data={groupsRes.map((x) => ({ name: x.g.name, net: Math.round(x.net) }))} margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tickFormatter={tick} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="net" name={t('Natija', 'Итог')} radius={4}>
                    {groupsRes.map((x) => <Cell key={x.g.id} fill={x.net >= 0 ? '#12b76a' : '#f04438'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="px-3 pb-1 text-xs text-stone-500">{t("Faol guruhlarda hali sotilmagan hayvonlar qiymati hisobga olinmagan", 'Для активных групп не учтена стоимость ещё не проданных животных')}</p>
          </Card>
        </Section>
      )}

      {sales.length > 0 && (
        <Section title={t('Sotilgan hayvonlar: foyda / zarar', 'Проданные: прибыль / убыток')}>
          <List>
            {sales.slice(0, 50).map(({ a, res, date }) => (
              <ListRow
                key={a!.id}
                onClick={() => nav('/animal/' + a!.id)}
                left={<SpeciesAvatar s={f.speciesMap.get(a!.speciesId)} />}
                title={a!.tag}
                sub={`${formatDate(date)} · ${t('sotildi', 'продано')} ${short(res.revenue)} · ${t('tannarx', 'себест.')} ${short(res.cost)}`}
                right={
                  <div>
                    <Money value={res.profit} tone="auto" usd={false} className="text-sm font-semibold" />
                    <div className="text-xs text-stone-500">ROI {pct(res.roiPct, 0)}</div>
                  </div>
                }
              />
            ))}
          </List>
        </Section>
      )}

      {f.unallocated > 0 && (
        <Card className="mb-4">
          <KV label={t("Taqsimlanmagan xarajat", 'Нераспределённые расходы')} value={money(f.unallocated)} />
          <p className="text-xs text-stone-500">{t("Bu xarajatlar sanasida fermada (yoki guruhda) hayvon bo'lmagan. Ular umumiy hisobotda bor, lekin hech bir hayvon tannarxiga qo'shilmagan.", 'На дату этих расходов в ферме (или группе) не было животных. Они есть в общем отчёте, но не вошли в себестоимость.')}</p>
        </Card>
      )}
    </Page>
  )
}
