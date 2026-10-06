import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Minus, Plus, Receipt, Search } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Card, Empty, Fab, IconButton, Input, List, Money, Page, Segmented, Sheet } from '../../components/ui'
import { addMonths, formatDate, monthKey, today } from '../../lib/dates'
import { TxRow } from './TxRow'
import type { Expense, Income } from '../../db/types'

const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

export function monthName(lang: 'uz' | 'ru', key: string) {
  const [y, m] = key.split('-').map(Number)
  return `${(lang === 'ru' ? MONTHS_RU : MONTHS_UZ)[m - 1]} ${y}`
}

type Kind = 'all' | 'expense' | 'income'
type Row = { kind: 'expense' | 'income'; e: Expense | Income }

export function FinancePage() {
  const f = useFarm()
  const { t, lt, lang } = useSettings()
  const nav = useNavigate()
  const [kind, setKind] = useState<Kind>('all')
  const [month, setMonth] = useState<string | null>(monthKey(today()))
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const rows = useMemo(() => {
    const list: Row[] = []
    if (kind !== 'income') for (const e of f.expenses) list.push({ kind: 'expense', e })
    if (kind !== 'expense') for (const e of f.incomes) list.push({ kind: 'income', e })
    const qq = q.trim().toLowerCase()
    return list
      .filter((r) => !month || monthKey(r.e.date) === month)
      .filter((r) => !cat || r.e.categoryId === cat)
      .filter((r) => !qq || (r.e.note ?? '').toLowerCase().includes(qq) || lt(f.catMap.get(r.e.categoryId)?.name).toLowerCase().includes(qq))
      .sort((a, b) => b.e.date.localeCompare(a.e.date) || b.e.createdAt - a.e.createdAt)
  }, [f.expenses, f.incomes, kind, month, q, cat, lt, f.catMap])

  const inc = rows.filter((r) => r.kind === 'income').reduce((s, r) => s + r.e.amount, 0)
  const exp = rows.filter((r) => r.kind === 'expense').reduce((s, r) => s + r.e.amount, 0)

  const byDate = useMemo(() => {
    const m = new Map<string, Row[]>()
    for (const r of rows) {
      if (!m.has(r.e.date)) m.set(r.e.date, [])
      m.get(r.e.date)!.push(r)
    }
    return [...m.entries()]
  }, [rows])

  const usedCats = useMemo(() => {
    const ids = new Set<string>()
    if (kind !== 'income') f.expenses.forEach((e) => ids.add(e.categoryId))
    if (kind !== 'expense') f.incomes.forEach((e) => ids.add(e.categoryId))
    return f.categories.filter((c) => ids.has(c.id))
  }, [f.expenses, f.incomes, f.categories, kind])

  return (
    <Page title={t('Moliya', 'Финансы')}>
      <Segmented
        className="mb-3"
        value={kind}
        onChange={(k) => {
          setKind(k)
          setCat('')
        }}
        options={[
          { value: 'all', label: t('Hammasi', 'Все') },
          { value: 'expense', label: t('Xarajatlar', 'Расходы') },
          { value: 'income', label: t('Daromadlar', 'Доходы') },
        ]}
      />

      <div className="mb-3 flex items-center gap-2">
        <IconButton onClick={() => setMonth(monthKey(addMonths((month ?? monthKey(today())) + '-01', -1)))}>
          <ChevronLeft />
        </IconButton>
        <button onClick={() => setMonth(month ? null : monthKey(today()))} className="flex-1 rounded-xl bg-white py-2 text-center font-semibold shadow-sm dark:bg-stone-900">
          {month ? monthName(lang, month) : t('Barcha vaqt', 'За всё время')}
        </button>
        <IconButton onClick={() => setMonth(monthKey(addMonths((month ?? monthKey(today())) + '-01', 1)))}>
          <ChevronRight />
        </IconButton>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <Card className="p-2.5">
          <div className="text-xs text-stone-500">{t('Daromad', 'Доход')}</div>
          <Money value={inc} tone="pos" usd={false} className="text-sm font-semibold" />
        </Card>
        <Card className="p-2.5">
          <div className="text-xs text-stone-500">{t('Xarajat', 'Расход')}</div>
          <Money value={exp} tone="neg" usd={false} className="text-sm font-semibold" />
        </Card>
        <Card className="p-2.5">
          <div className="text-xs text-stone-500">{t('Natija', 'Итог')}</div>
          <Money value={inc - exp} tone="auto" usd={false} className="text-sm font-semibold" />
        </Card>
      </div>

      <div className="relative mb-3">
        <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Qidirish...', 'Поиск...')} className="pl-10" />
      </div>
      {usedCats.length > 1 && (
        <div className="no-scrollbar -mx-3 mb-3 flex gap-2 overflow-x-auto px-3">
          <button onClick={() => setCat('')} className={`h-8 shrink-0 rounded-full border px-3 text-sm ${!cat ? 'border-stone-800 bg-stone-800 text-white dark:border-stone-200 dark:bg-stone-200 dark:text-stone-900' : 'border-stone-300 dark:border-stone-700'}`}>
            {t('Barchasi', 'Все')}
          </button>
          {usedCats.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(cat === c.id ? '' : c.id)}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm ${cat === c.id ? 'border-stone-800 bg-stone-800 text-white dark:border-stone-200 dark:bg-stone-200 dark:text-stone-900' : 'border-stone-300 dark:border-stone-700'}`}
            >
              <span className="size-2.5 rounded-full" style={{ background: c.color }} />
              {lt(c.name)}
            </button>
          ))}
        </div>
      )}

      {byDate.length === 0 ? (
        <Empty
          icon={<Receipt size={30} />}
          title={t("Yozuvlar yo'q", 'Записей нет')}
          text={t("Xarajat yoki daromad qo'shish uchun + tugmasini bosing", 'Нажмите +, чтобы добавить расход или доход')}
        />
      ) : (
        byDate.map(([date, list]) => (
          <div key={date} className="mb-3">
            <div className="mb-1 px-1 text-xs font-semibold text-stone-500">{formatDate(date)}</div>
            <List>
              {list.map((r) => (
                <TxRow key={r.e.id} kind={r.kind} e={r.e} />
              ))}
            </List>
          </div>
        ))
      )}

      <Fab onClick={() => setAddOpen(true)} icon={<Plus />} label={t("Qo'shish", 'Добавить')} />
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title={t("Nima qo'shamiz?", 'Что добавить?')}>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" className="h-24 flex-col" onClick={() => nav('/expense/new')}>
            <Minus className="text-red-600" />
            {t('Xarajat', 'Расход')}
          </Button>
          <Button variant="secondary" size="lg" className="h-24 flex-col" onClick={() => nav('/income/new')}>
            <Plus className="text-brand-600" />
            {t('Daromad', 'Доход')}
          </Button>
        </div>
      </Sheet>
    </Page>
  )
}
