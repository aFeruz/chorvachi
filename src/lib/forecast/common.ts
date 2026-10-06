import type { Rand } from './rng'
import { emptyCosts, emptyRev, type BaseInput, type CostKey, type ForecastInput, type MonthRow, type RevKey } from './types'

export const DAYS = 30.4

/** startMonth (yyyy-MM) dan m oy keyingi oy */
export function monthAt(start: string, m: number): { key: string; cal: number } {
  const [y, mo] = start.split('-').map(Number)
  const idx = y * 12 + (mo - 1) + m
  const yy = Math.floor(idx / 12)
  const mm = (idx % 12) + 1
  return { key: `${yy}-${String(mm).padStart(2, '0')}`, cal: mm }
}

/** Inflyatsiya va narx tebranishi ko'paytiruvchilari */
export function makeEconomy(i: BaseInput, R: Rand) {
  const years = Math.ceil(i.months / 12) + 1
  const shocks = Array.from({ length: years }, () => R.factor(i.priceVolatilityPct / 100))
  return {
    /** m-oy (1..) uchun sotish narxi ko'paytiruvchisi */
    price: (m: number) => Math.pow(1 + i.priceGrowthPct / 100, (m - 1) / 12) * shocks[Math.floor((m - 1) / 12)],
    cost: (m: number) => Math.pow(1 + i.costGrowthPct / 100, (m - 1) / 12),
  }
}

export interface RowDraft {
  heads: number
  core: number
  young: number
  born: number
  died: number
  sold: number
  rev: Record<RevKey, number>
  costs: Record<CostKey, number>
  herdValue: number
  feedKg: number
  outbreak: number
}

export function draft(): RowDraft {
  return { heads: 0, core: 0, young: 0, born: 0, died: 0, sold: 0, rev: emptyRev(), costs: emptyCosts(), herdValue: 0, feedKg: 0, outbreak: 0 }
}

/** Qoralamani yakuniy oylik qatorga aylantirish */
export function finalize(m: number, month: string, d: RowDraft, prevCash: number): MonthRow {
  const revenue = Object.values(d.rev).reduce((a, b) => a + b, 0)
  const cost = Object.values(d.costs).reduce((a, b) => a + b, 0)
  const net = revenue - cost
  const cash = prevCash + net
  return {
    m, month,
    heads: d.heads, core: d.core, young: d.young, born: d.born, died: d.died, sold: d.sold,
    revenue, rev: d.rev, cost, costs: d.costs, net, cash,
    herdValue: d.herdValue, wealth: cash + d.herdValue, feedKg: d.feedKg, outbreak: d.outbreak,
  }
}

/** Doimiy oylik xarajatlar: ish haqi, boshqa, veterinariya */
export function fixedCosts(i: BaseInput, d: RowDraft, heads: number, costMul: number) {
  d.costs.labor += i.laborMonth * costMul
  d.costs.other += i.otherMonth * costMul
  d.costs.vet += (heads * i.vetPerHeadYear * costMul) / 12
}

/** Asosiy boshlang'ich bosh soni: ona / partiya / tovuq / oila */
export function startCount(i: ForecastInput): number {
  switch (i.model) {
    case 'herd':
      return i.females
    case 'batch':
      return i.batchSize
    case 'layer':
      return i.flockSize
    case 'apiary':
      return i.colonies
  }
}

/** Boshida sarflanadigan pul. Partiya modelida jo'ja/bola narxi har partiyada alohida hisoblanadi. */
export function investmentOf(i: ForecastInput): number {
  if (!i.buyStart || i.model === 'batch') return i.setupCost
  let extra = 0
  if (i.model === 'herd') {
    extra += i.males * i.malePrice
    // birga sotib olinadigan yosh hayvonlar — bozor qiymatida (vazn × 1 kg narxi)
    const w = (age: number) => Math.min(i.adultWeightKg, i.birthWeightKg + i.adgKg * DAYS * age)
    extra += i.young.reduce((s, y) => s + (y.females + y.males) * w(y.ageMonths) * i.salePricePerKg, 0)
  }
  return i.setupCost + startCount(i) * i.purchasePrice + extra
}
