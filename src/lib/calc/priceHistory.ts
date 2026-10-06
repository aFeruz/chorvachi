import type { ID } from '../../db/types'

/**
 * O'tgan xarid/sotuvlar bo'yicha narx tarixi.
 * Yangi xarajat yozilayotganda oxirgi narx taklif qilinadi, lekin majburlanmaydi —
 * narx o'zgargan bo'lsa, farqi ko'rsatiladi.
 */

export interface PriceEntry {
  id: ID
  date: string
  createdAt: number
  categoryId: ID
  amount: number
  qty?: number
  unit?: string
  feedItemId?: ID
}

export interface PricePoint {
  date: string
  amount: number
  qty?: number
  unit?: string
  unitPrice?: number
}

export interface PriceStats {
  last: PricePoint
  /** 1 birlik narxi bo'yicha (agar oxirgi xaridda miqdor yozilgan bo'lsa) */
  unit?: string
  count: number
  avg?: number
  min?: number
  max?: number
  /** oxirgi narx oldingisiga nisbatan, % */
  trendPct?: number
}

export function priceHistory(
  entries: PriceEntry[],
  match: { categoryId: ID; feedItemId?: ID; excludeId?: ID },
): PricePoint[] {
  let list = entries.filter((e) => e.categoryId === match.categoryId && e.id !== match.excludeId && e.amount > 0)
  // yem tanlangan bo'lsa, aynan o'sha yemning xaridlari ustun
  if (match.feedItemId) {
    const same = list.filter((e) => e.feedItemId === match.feedItemId)
    if (same.length) list = same
  }
  return list
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .map((e) => ({
      date: e.date,
      amount: e.amount,
      qty: e.qty,
      unit: e.unit,
      unitPrice: e.qty && e.qty > 0 ? e.amount / e.qty : undefined,
    }))
}

/** Oxirgi xarid birligi bo'yicha statistikalar (oxirgi 5 ta) */
export function priceStats(points: PricePoint[]): PriceStats | undefined {
  if (!points.length) return undefined
  const last = points[0]
  if (last.unitPrice === undefined) {
    const amounts = points.slice(0, 5).map((p) => p.amount)
    return {
      last,
      count: amounts.length,
      avg: amounts.reduce((a, b) => a + b, 0) / amounts.length,
      min: Math.min(...amounts),
      max: Math.max(...amounts),
      trendPct: points[1] ? ((last.amount - points[1].amount) / points[1].amount) * 100 : undefined,
    }
  }
  const same = points.filter((p) => p.unitPrice !== undefined && p.unit === last.unit).slice(0, 5)
  const prices = same.map((p) => p.unitPrice!)
  return {
    last,
    unit: last.unit,
    count: prices.length,
    avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    trendPct: prices[1] ? ((prices[0] - prices[1]) / prices[1]) * 100 : undefined,
  }
}

/** Joriy narx oxirgisidan qanchaga farq qiladi */
export function priceDiff(current: number, previous: number): { diff: number; pct: number } {
  return { diff: current - previous, pct: previous ? ((current - previous) / previous) * 100 : 0 }
}
