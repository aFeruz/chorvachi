import type { ID } from '../../db/types'
import { monthKey, monthsBetween } from '../dates'

type Entry = { date: string; amount: number; categoryId: ID }

export interface PnL {
  income: number
  expense: number
  profit: number
  marginPct: number
  expenseByCat: Record<ID, number>
  incomeByCat: Record<ID, number>
  monthly: { month: string; income: number; expense: number; profit: number; cumulative: number }[]
}

export function pnl(expenses: Entry[], incomes: Entry[], from: string, to: string): PnL {
  const inR = (e: Entry) => e.date >= from && e.date <= to
  const ex = expenses.filter(inR)
  const inc = incomes.filter(inR)
  const expenseByCat: Record<ID, number> = {}
  const incomeByCat: Record<ID, number> = {}
  const months = new Map(monthsBetween(from, to).map((m) => [m, { income: 0, expense: 0 }]))
  for (const e of ex) {
    expenseByCat[e.categoryId] = (expenseByCat[e.categoryId] ?? 0) + e.amount
    const m = months.get(monthKey(e.date))
    if (m) m.expense += e.amount
  }
  for (const e of inc) {
    incomeByCat[e.categoryId] = (incomeByCat[e.categoryId] ?? 0) + e.amount
    const m = months.get(monthKey(e.date))
    if (m) m.income += e.amount
  }
  const income = inc.reduce((s, e) => s + e.amount, 0)
  const expense = ex.reduce((s, e) => s + e.amount, 0)
  let cum = 0
  const monthly = [...months.entries()].map(([month, v]) => {
    cum += v.income - v.expense
    return { month, income: v.income, expense: v.expense, profit: v.income - v.expense, cumulative: cum }
  })
  return {
    income,
    expense,
    profit: income - expense,
    marginPct: income > 0 ? ((income - expense) / income) * 100 : 0,
    expenseByCat,
    incomeByCat,
    monthly,
  }
}
