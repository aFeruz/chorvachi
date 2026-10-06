import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Baby, Bell, Calculator, ChevronRight, Minus, PawPrint, Plus, TrendingDown, TrendingUp, Wand2, X } from 'lucide-react'
import { useFarm } from '../state/farm'
import { useSettings } from '../state/settings'
import { Badge, Card, Chips, cx, IconButton, List, ListRow, Money, Page, Section, Stat } from '../components/ui'
import { pnl } from '../lib/calc/pnl'
import { startOfMonth, startOfYear, today, formatDate } from '../lib/dates'
import { computeReminders, dueLabel } from '../lib/reminders'
import { TxRow } from './finance/TxRow'
import { IconTile, SpeciesAvatar } from '../components/icons'

type Period = 'month' | 'year' | 'all'

export function Dashboard() {
  const f = useFarm()
  const { t, lt, short, settings, update } = useSettings()
  const nav = useNavigate()
  const [period, setPeriod] = useState<Period>('month')

  const from = period === 'month' ? startOfMonth(today()) : period === 'year' ? startOfYear(today()) : '1900-01-01'
  const allFrom = useMemo(() => {
    const d = [...f.expenses, ...f.incomes].map((e) => e.date).sort()[0]
    return d ?? today()
  }, [f.expenses, f.incomes])
  const p = useMemo(() => pnl(f.expenses, f.incomes, period === 'all' ? allFrom : from, '9999-12-31'), [f.expenses, f.incomes, from, period, allFrom])
  const all = useMemo(() => pnl(f.expenses, f.incomes, '1900-01-01', '9999-12-31'), [f.expenses, f.incomes])
  const reminders = computeReminders(f, t, settings.lastBackup)
  const urgent = reminders.filter((r) => dueLabel(t, r.date).tone !== 'neutral')
  const recent = [
    ...f.expenses.map((e) => ({ kind: 'expense' as const, e })),
    ...f.incomes.map((e) => ({ kind: 'income' as const, e })),
  ]
    .sort((a, b) => b.e.date.localeCompare(a.e.date) || b.e.createdAt - a.e.createdAt)
    .slice(0, 5)

  const totalHeads = [...f.headsBySpecies.values()].reduce((a, b) => a + b, 0)
  const pendingBirths = f.breedings.filter((b) => b.status === 'pending').length

  return (
    <Page
      title={
        <span className="flex items-center gap-2">
          <img src="./favicon.svg" className="size-7 md:hidden" alt="" />
          {f.farm?.name}
        </span>
      }
      actions={
        <IconButton onClick={() => nav('/reminders')} aria-label="reminders" className="relative">
          <Bell size={22} />
          {urgent.length > 0 && (
            <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {urgent.length}
            </span>
          )}
        </IconButton>
      }
    >
      {!settings.setupDone && (
        <Card className="mb-3 flex items-center gap-3 border-brand-200 dark:border-brand-900">
          <IconTile icon={Wand2} color="#027a48" />
          <button className="min-w-0 flex-1 text-left" onClick={() => nav('/setup')}>
            <div className="font-semibold">{t('Avtomatik sozlash', 'Автонастройка')}</div>
            <div className="text-sm text-stone-500">{t("Xarajat turlari, yem, ratsion va emlashni bir bosishda to'ldiring", 'Статьи расходов, корма, рацион и вакцинация в один клик')}</div>
          </button>
          <IconButton aria-label="close" onClick={() => update({ setupDone: true })}>
            <X size={18} className="text-stone-400" />
          </IconButton>
        </Card>
      )}

      <Chips
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'month', label: t('Shu oy', 'Этот месяц') },
          { value: 'year', label: t('Shu yil', 'Этот год') },
          { value: 'all', label: t('Hammasi', 'Всё время') },
        ]}
      />

      <Card className={cx('mb-3 border-0 text-white', p.profit >= 0 ? 'bg-gradient-to-br from-brand-700 to-brand-900' : 'bg-gradient-to-br from-red-600 to-red-800')}>
        <div className="text-sm opacity-80">{p.profit >= 0 ? t('Sof foyda', 'Чистая прибыль') : t('Zarar', 'Убыток')}</div>
        <div className="mt-1 text-3xl font-bold tabular-nums">
          <Money value={p.profit} usd={false} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/10 p-2.5">
            <div className="flex items-center gap-1 opacity-80">
              <TrendingUp size={14} /> {t('Daromad', 'Доход')}
            </div>
            <div className="font-semibold tabular-nums">{short(p.income)}</div>
          </div>
          <div className="rounded-xl bg-white/10 p-2.5">
            <div className="flex items-center gap-1 opacity-80">
              <TrendingDown size={14} /> {t('Xarajat', 'Расход')}
            </div>
            <div className="font-semibold tabular-nums">{short(p.expense)}</div>
          </div>
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <Stat
          label={t('Poda qiymati', 'Стоимость стада')}
          value={short(f.herdValue)}
          sub={t('joriy bozor narxida', 'по рыночной цене')}
          onClick={() => nav('/settings#prices')}
        />
        <Stat
          label={t('Hammasini sotsangiz', 'Если продать всё')}
          value={short(all.profit + f.herdValue)}
          tone={all.profit + f.herdValue >= 0 ? 'pos' : 'neg'}
          sub={t('umumiy natija', 'итоговый результат')}
          onClick={() => nav('/reports')}
        />
      </div>

      <div className="mb-5 grid grid-cols-4 gap-2">
        {[
          { icon: <Minus size={22} />, label: t('Xarajat', 'Расход'), to: '/expense/new', cls: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
          { icon: <Plus size={22} />, label: t('Daromad', 'Доход'), to: '/income/new', cls: 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300' },
          { icon: <PawPrint size={22} />, label: t('Hayvon', 'Животное'), to: '/animal/new', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
          { icon: <Baby size={22} />, label: t("Tug'ildi", 'Приплод'), to: '/birth/new', cls: 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300' },
        ].map((a) => (
          <button key={a.to} onClick={() => nav(a.to)} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-2.5 shadow-sm transition active:scale-95 dark:bg-stone-900">
            <span className={cx('grid size-11 place-items-center rounded-xl', a.cls)}>{a.icon}</span>
            <span className="text-xs font-medium">{a.label}</span>
          </button>
        ))}
      </div>

      <Section title={t('Poda', 'Стадо')} action={<span className="text-sm text-stone-500">{totalHeads} {t('bosh', 'гол.')}</span>}>
        {f.headsBySpecies.size === 0 ? (
          <Card onClick={() => nav('/animal/new')} className="text-center text-stone-500">
            {t("Hali hayvon qo'shilmagan. Qo'shish uchun bosing", 'Животных пока нет. Нажмите, чтобы добавить')}
          </Card>
        ) : (
          <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3">
            {[...f.headsBySpecies.entries()].map(([sid, n]) => {
              const s = f.speciesMap.get(sid)
              return (
                <button key={sid} onClick={() => nav('/herd?species=' + sid)} className="flex shrink-0 items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-stone-900">
                  <SpeciesAvatar s={s} size="sm" />
                  <span className="text-left">
                    <span className="block text-lg leading-tight font-bold">{n}</span>
                    <span className="block text-xs text-stone-500">{lt(s?.name)}</span>
                  </span>
                </button>
              )
            })}
            {pendingBirths > 0 && (
              <button onClick={() => nav('/breeding')} className="flex shrink-0 items-center gap-2 rounded-2xl bg-pink-50 px-4 py-3 text-pink-900 shadow-sm dark:bg-pink-950/40 dark:text-pink-200">
                <IconTile icon={Baby} color="#db2777" size="sm" />
                <span className="text-left">
                  <span className="block text-lg leading-tight font-bold">{pendingBirths}</span>
                  <span className="block text-xs opacity-75">{t("bo'g'oz", 'стельные')}</span>
                </span>
              </button>
            )}
          </div>
        )}
      </Section>

      {reminders.length > 0 && (
        <Section title={t('Eslatmalar', 'Напоминания')} action={<button className="text-sm text-brand-700 dark:text-brand-400" onClick={() => nav('/reminders')}>{t('Hammasi', 'Все')}</button>}>
          <List>
            {reminders.slice(0, 4).map((r) => {
              const d = dueLabel(t, r.date)
              return (
                <ListRow
                  key={r.id}
                  title={r.title}
                  sub={r.sub ? `${r.sub} · ${formatDate(r.date)}` : formatDate(r.date)}
                  right={<Badge tone={d.tone}>{d.text}</Badge>}
                  onClick={() => r.link && nav(r.link)}
                />
              )
            })}
          </List>
        </Section>
      )}

      <Section title={t("So'nggi yozuvlar", 'Последние записи')} action={<button className="text-sm text-brand-700 dark:text-brand-400" onClick={() => nav('/finance')}>{t('Hammasi', 'Все')}</button>}>
        {recent.length === 0 ? (
          <Card className="text-center text-sm text-stone-500">{t("Hali yozuv yo'q", 'Записей пока нет')}</Card>
        ) : (
          <List>
            {recent.map((r) => (
              <TxRow key={r.e.id} kind={r.kind} e={r.e} />
            ))}
          </List>
        )}
      </Section>

      <Card onClick={() => nav('/forecast')} className="mb-3 flex items-center gap-3 border-brand-200 dark:border-brand-900">
        <IconTile icon={TrendingUp} color="#027a48" />
        <div className="flex-1">
          <div className="font-semibold">{t('Prognoz: kelajakni hisoblash', 'Прогноз: расчёт будущего')}</div>
          <div className="text-sm text-stone-500">{t("Qachon ko'payadi, qachon foydaga chiqasiz, nima kerak", 'Когда вырастет стадо, когда прибыль, что нужно')}</div>
        </div>
        <ChevronRight className="text-stone-400" />
      </Card>

      <Card onClick={() => nav('/calc')} className="mb-4 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
          <Calculator size={22} />
        </span>
        <div className="flex-1">
          <div className="font-semibold">{t('Kalkulyatorlar', 'Калькуляторы')}</div>
          <div className="text-sm text-stone-500">{t("Sotish narxi, bo'rdoqi, yem, tug'ish sanasi", 'Цена продажи, откорм, корм, дата родов')}</div>
        </div>
        <ChevronRight className="text-stone-400" />
      </Card>
    </Page>
  )
}
