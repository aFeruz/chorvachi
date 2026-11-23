import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Baby, Bell, Calculator, ChevronRight, Lock, Minus, PawPrint, Plus, TrendingDown, TrendingUp, Wand2, X } from 'lucide-react'
import { useFarm } from '../state/farm'
import { useSettings } from '../state/settings'
import { Badge, Card, cx, IconButton, List, ListRow, Page, Section, Segmented, Stat } from '../components/ui'
import { pnl } from '../lib/calc/pnl'
import { startOfMonth, startOfYear, today, formatDate } from '../lib/dates'
import { computeReminders, dueLabel } from '../lib/reminders'
import { TxRow } from './finance/TxRow'
import { IconTile } from '../components/icons'
import { useLock } from '../state/lock'

type Period = 'month' | 'year' | 'all'

const MONTHS_UZ = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const MONTHS_RU = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']

/** "9 750 000 so'm" -> ["9 750 000", "so'm"]: summa katta, birlik kichik yoziladi */
function splitMoney(s: string): [string, string] {
  const m = s.match(/^(.*\d)\s*(\D*)$/)
  return m ? [m[1], m[2].trim()] : [s, '']
}

const roundBtn = 'glass relative grid size-11 place-items-center rounded-full border border-glass-line transition active:scale-95'

export function Dashboard() {
  const f = useFarm()
  const { t, lt, short, money, usd, settings, update } = useSettings()
  const nav = useNavigate()
  const [period, setPeriod] = useState<Period>('month')
  const { hasPin, lock } = useLock()

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

  const now = today()
  const periodLabel =
    period === 'month'
      ? (settings.lang === 'ru' ? MONTHS_RU : MONTHS_UZ)[Number(now.slice(5, 7)) - 1]
      : period === 'year'
        ? t(`${now.slice(0, 4)}-yil`, `${now.slice(0, 4)} г.`)
        : t('barcha vaqt', 'всё время')
  const [amount, unit] = splitMoney(money(p.profit))

  const actions = [
    { icon: <Minus size={24} strokeWidth={2.4} />, label: t('Xarajat', 'Расход'), to: '/expense/new', cls: 'text-red-700 dark:text-red-400' },
    { icon: <Plus size={24} strokeWidth={2.4} />, label: t('Daromad', 'Доход'), to: '/income/new', cls: 'text-brand-700 dark:text-brand-400' },
    { icon: <PawPrint size={24} />, label: t('Hayvon', 'Животное'), to: '/animal/new', cls: 'text-brand-800 dark:text-brand-300' },
    { icon: <Baby size={24} />, label: t("Tug'ildi", 'Приплод'), to: '/birth/new', cls: 'text-brand-800 dark:text-brand-300' },
  ]

  return (
    <Page
      title={
        <span className="flex items-center gap-3">
          <span className="glass grid size-11 shrink-0 place-items-center rounded-full border border-glass-line text-brand-700 md:hidden dark:text-brand-400">
            <PawPrint size={22} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-medium text-stone-500">Chorva Hisob</span>
            <span className="block truncate text-xl leading-tight font-bold tracking-tight">{f.farm?.name}</span>
          </span>
        </span>
      }
      actions={
        <>
          {hasPin && (
            <button type="button" onClick={lock} aria-label={t('Qulflash', 'Заблокировать')} className={roundBtn}>
              <Lock size={19} />
            </button>
          )}
          <button type="button" onClick={() => nav('/reminders')} aria-label={t('Eslatmalar', 'Напоминания')} className={roundBtn}>
            <Bell size={20} />
            {urgent.length > 0 && (
              <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-red-600 px-1 text-[11px] font-bold text-white dark:border-stone-900">
                {urgent.length}
              </span>
            )}
          </button>
        </>
      }
    >
      {!settings.setupDone && (
        <Card className="mb-4 flex items-center gap-3">
          <IconTile icon={Wand2} color="#027a48" />
          <button className="min-w-0 flex-1 text-left" onClick={() => nav('/setup')}>
            <div className="font-semibold">{t('Avtomatik sozlash', 'Автонастройка')}</div>
            <div className="text-sm text-stone-500">{t("Xarajat turlari, yem, ratsion va emlashni bir bosishda to'ldiring", 'Статьи расходов, корма, рацион и вакцинация в один клик')}</div>
          </button>
          <IconButton aria-label="close" onClick={() => update({ setupDone: true })}>
            <X size={18} className="text-stone-500" />
          </IconButton>
        </Card>
      )}

      <Segmented
        className="mb-4"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'month', label: t('Shu oy', 'Этот месяц') },
          { value: 'year', label: t('Shu yil', 'Этот год') },
          { value: 'all', label: t('Hammasi', 'Всё время') },
        ]}
      />

      <section className="glass mb-4 rounded-[32px] border border-glass-line p-5">
        <div className="text-sm font-medium text-stone-600 dark:text-stone-300">
          {p.profit >= 0 ? t('Sof foyda', 'Чистая прибыль') : t('Zarar', 'Убыток')} · {periodLabel}
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <span className={cx('text-[40px] leading-tight font-extrabold tracking-tight tabular-nums', p.profit < 0 && 'text-red-700 dark:text-red-400')}>
            {amount}
          </span>
          {unit && <span className="text-lg font-semibold text-stone-600 dark:text-stone-300">{unit}</span>}
        </div>
        {settings.showUsd && <div className="text-sm text-stone-500 tabular-nums">≈ {usd(p.profit)}</div>}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-[20px] border border-white/80 bg-white/55 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
              <TrendingUp size={14} strokeWidth={2.5} /> {t('Daromad', 'Доход')}
            </div>
            <div className="text-lg font-bold tabular-nums">{short(p.income)}</div>
          </div>
          <div className="rounded-[20px] border border-white/80 bg-white/55 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400">
              <TrendingDown size={14} strokeWidth={2.5} /> {t('Xarajat', 'Расход')}
            </div>
            <div className="text-lg font-bold tabular-nums">{short(p.expense)}</div>
          </div>
        </div>
      </section>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {actions.map((a) => (
          <button key={a.to} type="button" onClick={() => nav(a.to)} className="flex flex-col items-center gap-1.5 text-[13px] font-medium transition active:scale-95">
            <span className={cx('glass grid size-16 place-items-center rounded-[22px] border border-glass-line', a.cls)}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2.5">
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

      <Section title={t('Poda', 'Стадо')} action={<span className="text-sm text-stone-500">{totalHeads} {t('bosh', 'гол.')}</span>}>
        {f.headsBySpecies.size === 0 ? (
          <Card onClick={() => nav('/animal/new')} className="text-center text-stone-500">
            {t("Hali hayvon qo'shilmagan. Qo'shish uchun bosing", 'Животных пока нет. Нажмите, чтобы добавить')}
          </Card>
        ) : (
          <div className="glass no-scrollbar flex overflow-x-auto rounded-3xl border border-glass-line">
            {[...f.headsBySpecies.entries()].map(([sid, n], i) => {
              const s = f.speciesMap.get(sid)
              return (
                <button
                  key={sid}
                  type="button"
                  onClick={() => nav('/herd?species=' + sid)}
                  className={cx('min-w-[33.333%] flex-1 shrink-0 px-4 py-3 text-left transition active:bg-white/40', i > 0 && 'border-l border-white/80 dark:border-white/10')}
                >
                  <span className="block text-[22px] leading-tight font-extrabold tabular-nums">{n}</span>
                  <span className="block truncate text-xs text-stone-500">{lt(s?.name)}</span>
                </button>
              )
            })}
            {pendingBirths > 0 && (
              <button
                type="button"
                onClick={() => nav('/breeding')}
                className="min-w-[33.333%] flex-1 shrink-0 border-l border-white/80 px-4 py-3 text-left transition active:bg-white/40 dark:border-white/10"
              >
                <span className="block text-[22px] leading-tight font-extrabold text-brand-700 tabular-nums dark:text-brand-400">{pendingBirths}</span>
                <span className="block truncate text-xs text-stone-500">{t("bo'g'oz", 'стельные')}</span>
              </button>
            )}
          </div>
        )}
      </Section>

      {reminders.length > 0 && (
        <Section
          title={t('Eslatmalar', 'Напоминания')}
          action={<button className="text-sm font-semibold text-brand-700 dark:text-brand-400" onClick={() => nav('/reminders')}>{t('Hammasi', 'Все')}</button>}
        >
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

      <Section
        title={t("So'nggi yozuvlar", 'Последние записи')}
        action={<button className="text-sm font-semibold text-brand-700 dark:text-brand-400" onClick={() => nav('/finance')}>{t('Hammasi', 'Все')}</button>}
      >
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

      <Card onClick={() => nav('/forecast')} className="mb-3 flex items-center gap-3">
        <IconTile icon={TrendingUp} color="#027a48" />
        <div className="flex-1">
          <div className="font-semibold">{t('Prognoz: kelajakni hisoblash', 'Прогноз: расчёт будущего')}</div>
          <div className="text-sm text-stone-500">{t("Qachon ko'payadi, qachon foydaga chiqasiz, nima kerak", 'Когда вырастет стадо, когда прибыль, что нужно')}</div>
        </div>
        <ChevronRight className="text-stone-400" />
      </Card>

      <Card onClick={() => nav('/calc')} className="mb-4 flex items-center gap-3">
        <IconTile icon={Calculator} color="#027a48" />
        <div className="flex-1">
          <div className="font-semibold">{t('Kalkulyatorlar', 'Калькуляторы')}</div>
          <div className="text-sm text-stone-500">{t("Sotish narxi, bo'rdoqi, yem, tug'ish sanasi", 'Цена продажи, откорм, корм, дата родов')}</div>
        </div>
        <ChevronRight className="text-stone-400" />
      </Card>
    </Page>
  )
}
