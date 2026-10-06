import { DAYS, draft, finalize, fixedCosts, makeEconomy, monthAt, type RowDraft, investmentOf } from './common'
import type { Rand } from './rng'
import type { BatchInput, MonthRow, RunResult } from './types'

/**
 * Partiya modeli: broyler, kurka, o'rdak, baliq va bo'rdoqi (sotib olib boqish).
 * Kunma-kun hisoblanadi: partiya kiradi -> o'sadi (o'lim, yem) -> sotiladi -> tanaffus -> keyingi partiya.
 */
export function runBatch(i: BatchInput, R: Rand): RunResult {
  const eco = makeEconomy(i, R)
  const horizon = Math.round(i.months * DAYS)
  const cycle = Math.max(1, Math.round(i.cycleDays))
  const gap = Math.max(0, Math.round(i.downtimeDays))
  const drafts: RowDraft[] = Array.from({ length: i.months }, () => draft())
  const aliveDays = new Array(i.months).fill(0)
  const monthOf = (day: number) => Math.min(i.months - 1, Math.floor(day / DAYS))
  const warnings: string[] = []

  let day = 0
  let k = 0
  while (day < horizon && (i.batchCount <= 0 || k < i.batchCount)) {
    const mIdx = monthOf(day)
    const m = mIdx + 1
    const C = eco.cost(m)
    const target = i.batchSize * Math.pow(1 + i.growthPct / 100, k)
    const size = R.det ? Math.min(i.maxBatchSize > 0 ? i.maxBatchSize : Infinity, target) : Math.round(Math.min(i.maxBatchSize > 0 ? i.maxBatchSize : Infinity, target))
    const dm = drafts[mIdx]
    dm.costs.stock += size * i.unitPrice * C
    dm.costs.other += i.otherCostPerBatch * C

    // o'lim va kasallik shu partiya uchun
    const pOutbreak = 1 - Math.pow(1 - i.diseaseRiskPct / 100, cycle / 365)
    const ev = R.event(pOutbreak)
    const normalDead = R.binom(size, i.mortalityPct / 100)
    const diseaseDead = R.binom(size - normalDead, (ev * i.diseaseLossPct) / 100)
    const dead = normalDead + diseaseDead
    const survivors = size - dead
    dm.costs.disease += ev * size * i.diseaseCostPerHead * C
    dm.outbreak = Math.max(dm.outbreak, ev)
    const finalW = i.finalWeightKg * R.factor(0.05)
    const gain = Math.max(0, finalW - i.startWeightKg)
    const feedTotal =
      i.feedMode === 'fcr'
        ? survivors * i.fcr * gain + dead * i.fcr * gain * 0.4
        : ((size + survivors) / 2) * i.feedKgPerDay * cycle

    // kunlarga taqsimlash: ozuqa tirik vazn massasiga mutanosib
    let z = 0
    for (let j = 0; j < cycle; j++) z += (size - (dead * j) / cycle) * (i.startWeightKg + (gain * j) / cycle)
    for (let j = 0; j < cycle; j++) {
      const dd = day + j
      if (dd >= horizon) break
      const mi = monthOf(dd)
      const alive = size - (dead * j) / cycle
      const wt = i.startWeightKg + (gain * j) / cycle
      const kg = z > 0 ? (feedTotal * alive * wt) / z : 0
      drafts[mi].feedKg += kg
      drafts[mi].costs.feed += kg * i.feedPricePerKg * eco.cost(mi + 1)
      drafts[mi].died += dead / cycle
      aliveDays[mi] += alive
      // oy oxiridagi qiymat
      if (Math.floor((dd + 1) / DAYS) !== Math.floor(dd / DAYS) || dd === horizon - 1)
        drafts[mi].herdValue = alive * wt * i.salePricePerKg * eco.price(mi + 1) * 0.9
    }
    const end = day + cycle
    if (end <= horizon) {
      const me = monthOf(end - 1)
      drafts[me].rev.animals += survivors * finalW * i.salePricePerKg * eco.price(me + 1)
      drafts[me].sold += survivors
      drafts[me].herdValue = 0
    }
    day = end + gap
    k++
  }
  if (i.salePricePerKg <= 0) warnings.push('noPrice')

  const rows: MonthRow[] = []
  let cash = i.startCash - investmentOf(i)
  for (let mi = 0; mi < i.months; mi++) {
    const d = drafts[mi]
    const C = eco.cost(mi + 1)
    const avg = aliveDays[mi] / DAYS
    d.heads = avg
    d.core = avg
    fixedCosts(i, d, avg, C)
    const row = finalize(mi + 1, monthAt(i.startMonth, mi).key, d, cash)
    cash = row.cash
    rows.push(row)
  }
  return { rows, startHerdValue: 0, startWealth: i.startCash - investmentOf(i), warnings }
}
