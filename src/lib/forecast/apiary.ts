import { draft, finalize, fixedCosts, makeEconomy, monthAt, investmentOf } from './common'
import { monthlyProb, type Rand } from './rng'
import type { ApiaryInput, MonthRow, RunResult } from './types'

/** Asalarichilik: qishki nobudgarchilik, bahorgi bo'linish, asal va mum hosili */
export function runApiary(i: ApiaryInput, R: Rand): RunResult {
  const eco = makeEconomy(i, R)
  let c = i.colonies
  let cash = i.startCash - investmentOf(i)
  const rows: MonthRow[] = []
  const warnings: string[] = []
  if (i.honeyPricePerKg <= 0) warnings.push('noPrice')
  const harvest = i.harvestMonths.length ? i.harvestMonths : [7]
  let seasonYield = R.factor(0.3)

  for (let m = 1; m <= i.months; m++) {
    const { key, cal } = monthAt(i.startMonth, m - 1)
    const P = eco.price(m)
    const C = eco.cost(m)
    const d = draft()
    if (cal === harvest[0]) seasonYield = R.factor(0.3)

    if (cal === i.winterMonth) {
      const lost = R.binom(c, i.winterLossPct / 100)
      c -= lost
      d.died += lost
    }
    const ev = R.event(monthlyProb(i.diseaseRiskPct))
    d.outbreak = ev
    if (ev > 0) {
      const lost = R.binom(c, (ev * i.diseaseLossPct) / 100)
      c -= lost
      d.died += lost
      d.costs.disease += ev * c * i.diseaseCostPerHead * C
    }
    if (cal === i.splitMonth && c > 0) {
      const born = R.binom(c, i.splitPct / 100)
      c += born
      d.born += born
      d.costs.stock += born * i.newHiveCost * C
      if (i.maxColonies > 0 && c > i.maxColonies) {
        const extra = c - i.maxColonies
        c = i.maxColonies
        d.rev.animals += extra * i.colonySalePrice * P
        d.sold += extra
      }
    }
    if (harvest.includes(cal)) {
      d.rev.honey += ((c * i.honeyKgPerColony) / harvest.length) * seasonYield * i.honeyPricePerKg * P
      if (cal === harvest[harvest.length - 1]) d.rev.other += c * i.waxKgPerColony * i.waxPricePerKg * P
    }
    d.feedKg = (c * i.sugarKgPerColony) / 12
    d.costs.feed += d.feedKg * i.sugarPricePerKg * C
    d.costs.vet += (c * i.varroaCostPerColony * C) / 12
    fixedCosts(i, d, c, C)
    d.heads = c
    d.core = c
    d.herdValue = c * i.colonySalePrice * P
    const row = finalize(m, key, d, cash)
    cash = row.cash
    rows.push(row)
  }
  return { rows, startHerdValue: i.colonies * i.colonySalePrice, startWealth: i.startCash - investmentOf(i) + i.colonies * i.colonySalePrice, warnings }
}
