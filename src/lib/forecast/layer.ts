import { DAYS, draft, finalize, fixedCosts, makeEconomy, monthAt, investmentOf } from './common'
import { monthlyProb, type Rand } from './rng'
import type { LayerInput, MonthRow, RunResult } from './types'

/** Tuxum qilish darajasi (%) tuxum qilishning a-oyida */
export function layRate(i: Pick<LayerInput, 'peakLayPct' | 'layDeclinePct'>, a: number): number {
  if (a <= 0) return i.peakLayPct * 0.6
  if (a === 1) return i.peakLayPct * 0.95
  return Math.max(0, i.peakLayPct - i.layDeclinePct * (a - 2))
}

/** Tuxum tovuq: tuxum qilish egri chizig'i, o'lim, almashtirish */
export function runLayer(i: LayerInput, R: Rand): RunResult {
  const eco = makeEconomy(i, R)
  let n = i.flockSize
  let age = 0
  let gapLeft = 0
  let cash = i.startCash - investmentOf(i)
  const rows: MonthRow[] = []
  const warnings: string[] = []
  if (i.eggPrice <= 0) warnings.push('noPrice')

  for (let m = 1; m <= i.months; m++) {
    const P = eco.price(m)
    const C = eco.cost(m)
    const d = draft()
    if (gapLeft > 0) {
      gapLeft--
      if (gapLeft === 0 && i.restock) {
        n = R.det ? i.flockSize : Math.round(i.flockSize)
        age = 0
        d.costs.stock += i.flockSize * i.pulletPrice * C
      }
    } else if (n > 0) {
      const ev = R.event(monthlyProb(i.diseaseRiskPct))
      d.outbreak = ev
      d.costs.disease += ev * n * i.diseaseCostPerHead * C
      const p = 1 - (1 - i.monthlyMortalityPct / 100) * (1 - (ev * i.diseaseLossPct) / 100)
      const dead = R.binom(n, p)
      n -= dead
      d.died += dead
      // hammasi nobud bo'lsa — yangi tovuqlar olinadi (yoki tugaydi)
      if (n <= 1e-9) {
        n = 0
        gapLeft = i.restock ? Math.max(1, i.restockGapMonths) : Infinity
      }
      const eggs = n * (layRate(i, age) / 100) * DAYS * R.factor(0.04)
      d.rev.eggs += eggs * i.eggPrice * P
      d.feedKg = n * i.feedKgPerDay * DAYS
      d.costs.feed += d.feedKg * i.feedPricePerKg * C
      age++
      if (n > 0 && age >= i.layMonths) {
        d.rev.culls += n * i.spentHenPrice * P
        d.sold += n
        n = 0
        gapLeft = i.restock ? Math.max(1, i.restockGapMonths) : Infinity
      }
    }
    fixedCosts(i, d, n, C)
    d.heads = n
    d.core = n
    d.herdValue = n * i.spentHenPrice * P
    const row = finalize(m, monthAt(i.startMonth, m - 1).key, d, cash)
    cash = row.cash
    rows.push(row)
  }
  return { rows, startHerdValue: i.flockSize * i.spentHenPrice, startWealth: i.startCash - investmentOf(i) + i.flockSize * i.spentHenPrice, warnings }
}
