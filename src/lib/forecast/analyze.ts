import { runApiary } from './apiary'
import { runBatch } from './batch'
import { investmentOf, startCount } from './common'
import { runHerd } from './herd'
import { runLayer } from './layer'
import { DET, seeded, type Rand } from './rng'
import { COST_KEYS, REV_KEYS, type CostKey, type ForecastInput, type MonthRow, type RevKey, type RunResult } from './types'

export function simulate(i: ForecastInput, R: Rand = DET): RunResult {
  switch (i.model) {
    case 'herd':
      return runHerd(i, R)
    case 'batch':
      return runBatch(i, R)
    case 'layer':
      return runLayer(i, R)
    case 'apiary':
      return runApiary(i, R)
  }
}

/* ------------------------------------------------------------------ */
/* Maqsadlar va muhim sanalar                                          */
/* ------------------------------------------------------------------ */

export type GoalType = 'profit' | 'heads' | 'cash' | 'monthly' | 'horizon' | 'need' | 'risk'

export interface Goal {
  type: GoalType
  /** "N boshga yetish" uchun */
  heads: number
  /** jami bosh yoki faqat ona hayvonlar */
  headsMetric: 'total' | 'core'
  /** "X so'm topish" / "oyiga X so'm" uchun */
  amount: number
  /** "need" — shu oygacha erishish kerak */
  byMonth: number
  needKind: 'heads' | 'cash'
}

export const DEFAULT_GOAL: Goal = { type: 'profit', heads: 10, headsMetric: 'total', amount: 50_000_000, byMonth: 24, needKind: 'heads' }

/**
 * Taqqoslash asosi:
 * - initialCash: sarmoya qilingandan keyingi naqd holat
 * - paybackTarget: "sarmoya qaytdi" deyish uchun naqd qaysi darajaga qaytishi kerak
 *   (yangi boshlaganda — boshlang'ich naqdga, o'tgan zararlar bo'lsa — nolga)
 * - baseWealth: boshlashdan oldingi boylik (naqd + fermada BOR poda qiymati).
 *   Zarar / zararsizlik shunga nisbatan o'lchanadi.
 */
export interface Baseline {
  initialCash: number
  paybackTarget: number
  baseWealth: number
}

export function baselineOf(i: ForecastInput, res: RunResult): Baseline {
  const owned = i.buyStart || i.model === 'batch' ? 0 : res.startHerdValue
  return { initialCash: i.startCash - investmentOf(i), paybackTarget: i.startCash >= 0 ? i.startCash : 0, baseWealth: i.startCash + owned }
}

export type MilestoneKey = 'firstBirth' | 'firstSale' | 'profitable' | 'payback' | 'wealthPositive' | 'heads' | 'cash' | 'monthly'

/** Bitta simulyatsiya qatorlaridan muhim oylar (yetmasa — undefined) */
export function milestones(rows: MonthRow[], goal: Goal, b: Baseline): Record<MilestoneKey, number | undefined> {
  const first = (pred: (r: MonthRow, idx: number) => boolean) => {
    const idx = rows.findIndex(pred)
    return idx < 0 ? undefined : rows[idx].m
  }
  const trailing = (idx: number) => {
    const from = Math.max(0, idx - 11)
    let s = 0
    for (let k = from; k <= idx; k++) s += rows[k].net
    return { sum: s, n: idx - from + 1 }
  }
  /** shart shu oydan boshlab kamida `hold` oy (yoki muddat oxirigacha) bajariladigan birinchi oy */
  const sustained = (pred: (idx: number) => boolean, hold: number) => {
    for (let idx = 0; idx < rows.length; idx++) {
      if (!pred(idx)) continue
      // muddat oxiriga yaqin bo'lsa ham kamida 3 oy (yoki hold) saqlanishi kerak
      if (rows.length - idx < Math.min(hold, 3)) return undefined
      const end = Math.min(rows.length - 1, idx + hold - 1)
      let ok = true
      for (let k = idx + 1; k <= end && ok; k++) ok = pred(k)
      if (ok) return rows[idx].m
    }
    return undefined
  }
  const headsOf = (idx: number) => (goal.headsMetric === 'core' ? rows[idx].core : rows[idx].heads)
  // 12 oylik oyna to'lgandan keyin (qisqa muddatda — 6 oydan keyin)
  const minWindow = Math.min(11, Math.max(5, rows.length - 1))
  return {
    firstBirth: first((r) => r.born >= 0.5),
    firstSale: first((r) => r.revenue > 0),
    // 12 oylik sof daromad musbat bo'lib, muddat oxirigacha shunday qoladigan birinchi oy
    profitable: sustained((idx) => idx >= minWindow && trailing(idx).sum > 0, rows.length),
    // naqd hech qachon maqsaddan pastga tushmasa — qo'shimcha pul kerak emas (0)
    payback:
      b.initialCash >= b.paybackTarget && rows.every((r) => r.cash >= b.paybackTarget)
        ? 0
        : sustained((idx) => rows[idx].cash >= b.paybackTarget, 6),
    wealthPositive: sustained((idx) => rows[idx].wealth >= b.baseWealth, 3),
    // bosh soni kamida 6 oy shu darajada turishi kerak (qo'zilar tug'ilib, keyin sotilib ketishi hisobga olinadi)
    heads: sustained((idx) => headsOf(idx) >= goal.heads - 1e-6, 6),
    cash: sustained((idx) => rows[idx].cash >= goal.amount, 3),
    monthly: sustained((idx) => idx >= 5 && trailing(idx).sum / trailing(idx).n >= goal.amount, 3),
  }
}

/* ------------------------------------------------------------------ */
/* Monte-Karlo                                                         */
/* ------------------------------------------------------------------ */

export interface Band {
  p10: number[]
  p50: number[]
  p90: number[]
}

export interface MilestoneStat {
  /** muddat ichida erishish ehtimoli, 0..1 */
  prob: number
  p10?: number
  p50?: number
  p90?: number
}

export interface MonteCarlo {
  runs: number
  heads: Band
  core: Band
  cash: Band
  wealth: Band
  milestones: Record<MilestoneKey, MilestoneStat>
  finalWealth: { p10: number; p50: number; p90: number }
  finalCash: { p10: number; p50: number; p90: number }
  finalHeads: { p10: number; p50: number; p90: number }
  /** muddat oxirida zarar (naqd + poda < 0) ehtimoli */
  lossProb: number
  /** muddat davomida kamida bir marta kasallik chiqish ehtimoli */
  outbreakProb: number
  /** aylanma mablag' ehtiyoji: 90% holatda yetadigan miqdor */
  workingCapitalP90: number
  peakHeadsP90: number
}

export function percentile(sorted: number[], q: number): number {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

const sortNum = (a: number[]) => [...a].sort((x, y) => x - y)

export function initialCashOf(i: ForecastInput) {
  return i.startCash - investmentOf(i)
}

/** Bundan keyin cho'ntakdan qo'shimcha chiqadigan eng katta summa */
export function workingCapital(i: ForecastInput, rows: MonthRow[]): { need: number; month: number } {
  let worst = initialCashOf(i)
  let month = 0
  for (const r of rows)
    if (r.cash < worst) {
      worst = r.cash
      month = r.m
    }
  return { need: Math.max(0, i.startCash - worst), month }
}

export function monteCarlo(i: ForecastInput, goal: Goal, runs = 400, seed = 12345): MonteCarlo {
  const M = i.months
  const heads: number[][] = Array.from({ length: M }, () => [])
  const core: number[][] = Array.from({ length: M }, () => [])
  const cash: number[][] = Array.from({ length: M }, () => [])
  const wealth: number[][] = Array.from({ length: M }, () => [])
  const ms: Record<MilestoneKey, number[]> = { firstBirth: [], firstSale: [], profitable: [], payback: [], wealthPositive: [], heads: [], cash: [], monthly: [] }
  const fw: number[] = []
  const fc: number[] = []
  const fh: number[] = []
  const wc: number[] = []
  const peak: number[] = []
  let outbreaks = 0
  const init = initialCashOf(i)
  let base: Baseline | undefined

  for (let k = 0; k < runs; k++) {
    const res = simulate(i, seeded(seed + k * 7919))
    res.rows.forEach((r, idx) => {
      heads[idx].push(r.heads)
      core[idx].push(r.core)
      cash[idx].push(r.cash)
      wealth[idx].push(r.wealth)
    })
    base ??= baselineOf(i, res)
    const mm = milestones(res.rows, goal, base)
    for (const key of Object.keys(ms) as MilestoneKey[]) ms[key].push(mm[key] ?? Infinity)
    const last = res.rows[res.rows.length - 1]
    fw.push(last?.wealth ?? init)
    fc.push(last?.cash ?? init)
    fh.push(last?.heads ?? 0)
    wc.push(workingCapital(i, res.rows).need)
    peak.push(Math.max(0, ...res.rows.map((r) => r.heads)))
    if (res.rows.some((r) => r.outbreak > 0)) outbreaks++
  }

  const band = (arr: number[][]): Band => {
    const b: Band = { p10: [], p50: [], p90: [] }
    for (const col of arr) {
      const s = sortNum(col)
      b.p10.push(percentile(s, 0.1))
      b.p50.push(percentile(s, 0.5))
      b.p90.push(percentile(s, 0.9))
    }
    return b
  }
  const stat = (vals: number[]): MilestoneStat => {
    const s = sortNum(vals)
    const reached = s.filter((v) => Number.isFinite(v)).length
    const q = (p: number) => {
      const v = s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))]
      return Number.isFinite(v) ? v : undefined
    }
    return { prob: s.length ? reached / s.length : 0, p10: q(0.1), p50: q(0.5), p90: q(0.9) }
  }
  const tri = (v: number[]) => {
    const s = sortNum(v)
    return { p10: percentile(s, 0.1), p50: percentile(s, 0.5), p90: percentile(s, 0.9) }
  }

  const milestonesStat = {} as Record<MilestoneKey, MilestoneStat>
  for (const key of Object.keys(ms) as MilestoneKey[]) milestonesStat[key] = stat(ms[key])

  return {
    runs,
    heads: band(heads),
    core: band(core),
    cash: band(cash),
    wealth: band(wealth),
    milestones: milestonesStat,
    finalWealth: tri(fw),
    finalCash: tri(fc),
    finalHeads: tri(fh),
    lossProb: fw.filter((v) => v < (base?.baseWealth ?? 0)).length / runs,
    outbreakProb: outbreaks / runs,
    workingCapitalP90: percentile(sortNum(wc), 0.9),
    peakHeadsP90: percentile(sortNum(peak), 0.9),
  }
}

/* ------------------------------------------------------------------ */
/* Xulosa: pul, yillar, talablar                                       */
/* ------------------------------------------------------------------ */

export interface YearRow {
  year: number
  revenue: number
  cost: number
  net: number
  born: number
  sold: number
  died: number
  endHeads: number
  endCash: number
  endWealth: number
  feedKg: number
}

export interface Summary {
  investment: number
  initialCash: number
  /** boshlashdan oldingi boylik (naqd + bor poda) */
  baseWealth: number
  /** muddat oxiridagi boylik − boshlang'ich boylik */
  gain: number
  revenue: number
  cost: number
  net: number
  costBy: Record<CostKey, number>
  revBy: Record<RevKey, number>
  finalCash: number
  finalWealth: number
  finalHerdValue: number
  finalHeads: number
  finalCore: number
  peakHeads: number
  peakMonth: number
  born: number
  sold: number
  died: number
  avgMonthlyNet: number
  roiPct?: number
  workingCapital: number
  worstMonth: number
  feedKgFirstYear: number
  feedKgTotal: number
  years: YearRow[]
}

export function summarize(i: ForecastInput, res: RunResult): Summary {
  const rows = res.rows
  const costBy = Object.fromEntries(COST_KEYS.map((k) => [k, 0])) as Record<CostKey, number>
  const revBy = Object.fromEntries(REV_KEYS.map((k) => [k, 0])) as Record<RevKey, number>
  let revenue = 0
  let cost = 0
  let born = 0
  let sold = 0
  let died = 0
  let peakHeads = 0
  let peakMonth = 0
  for (const r of rows) {
    revenue += r.revenue
    cost += r.cost
    born += r.born
    sold += r.sold
    died += r.died
    for (const k of COST_KEYS) costBy[k] += r.costs[k]
    for (const k of REV_KEYS) revBy[k] += r.rev[k]
    if (r.heads > peakHeads) {
      peakHeads = r.heads
      peakMonth = r.m
    }
  }
  const investment = investmentOf(i)
  const last = rows[rows.length - 1]
  const base = baselineOf(i, res)
  const wc = workingCapital(i, rows)
  const years: YearRow[] = []
  for (let y = 0; y * 12 < rows.length; y++) {
    const part = rows.slice(y * 12, y * 12 + 12)
    const end = part[part.length - 1]
    if (!end) continue
    years.push({
      year: y + 1,
      revenue: part.reduce((s, r) => s + r.revenue, 0),
      cost: part.reduce((s, r) => s + r.cost, 0),
      net: part.reduce((s, r) => s + r.net, 0),
      born: part.reduce((s, r) => s + r.born, 0),
      sold: part.reduce((s, r) => s + r.sold, 0),
      died: part.reduce((s, r) => s + r.died, 0),
      endHeads: end.heads,
      endCash: end.cash,
      endWealth: end.wealth,
      feedKg: part.reduce((s, r) => s + r.feedKg, 0),
    })
  }
  return {
    investment,
    initialCash: initialCashOf(i),
    baseWealth: base.baseWealth,
    gain: (last?.wealth ?? initialCashOf(i)) - base.baseWealth,
    revenue,
    cost,
    net: revenue - cost,
    costBy,
    revBy,
    finalCash: last?.cash ?? initialCashOf(i),
    finalWealth: last?.wealth ?? initialCashOf(i),
    finalHerdValue: last?.herdValue ?? 0,
    finalHeads: last?.heads ?? 0,
    finalCore: last?.core ?? 0,
    peakHeads,
    peakMonth,
    born,
    sold,
    died,
    avgMonthlyNet: rows.length ? (revenue - cost) / rows.length : 0,
    roiPct: investment > 0 && last ? ((last.wealth - base.baseWealth) / investment) * 100 : undefined,
    workingCapital: wc.need,
    worstMonth: wc.month,
    feedKgFirstYear: rows.slice(0, 12).reduce((s, r) => s + r.feedKg, 0),
    feedKgTotal: rows.reduce((s, r) => s + r.feedKg, 0),
    years,
  }
}

/* ------------------------------------------------------------------ */
/* Ta'sir tahlili (qaysi omil natijaga eng ko'p ta'sir qiladi)          */
/* ------------------------------------------------------------------ */

export type FactorKey =
  | 'salePrice' | 'feedPrice' | 'feedAmount' | 'litter' | 'conception' | 'youngMortality' | 'adultMortality'
  | 'growth' | 'labor' | 'purchasePrice' | 'mortality' | 'finalWeight' | 'fcr' | 'eggPrice' | 'layRate'
  | 'honeyPrice' | 'honeyYield' | 'winterLoss' | 'splitRate' | 'milkPrice'

type Mut = (i: ForecastInput, k: number) => ForecastInput

const FACTORS: Record<ForecastInput['model'], { key: FactorKey; apply: Mut }[]> = {
  herd: [
    { key: 'salePrice', apply: (i, k) => (i.model === 'herd' ? { ...i, salePricePerKg: i.salePricePerKg * k, cullPricePerKg: i.cullPricePerKg * k } : i) },
    { key: 'feedPrice', apply: (i, k) => (i.model === 'herd' ? { ...i, feedPricePerKg: i.feedPricePerKg * k } : i) },
    { key: 'feedAmount', apply: (i, k) => (i.model === 'herd' ? { ...i, feedKgPerDay: i.feedKgPerDay * k } : i) },
    { key: 'litter', apply: (i, k) => (i.model === 'herd' ? { ...i, litterSize: i.litterSize * k } : i) },
    { key: 'conception', apply: (i, k) => (i.model === 'herd' ? { ...i, conceptionPct: Math.min(100, i.conceptionPct * k) } : i) },
    { key: 'youngMortality', apply: (i, k) => (i.model === 'herd' ? { ...i, youngMortalityPct: Math.min(100, i.youngMortalityPct * k) } : i) },
    { key: 'adultMortality', apply: (i, k) => (i.model === 'herd' ? { ...i, adultMortalityPct: Math.min(100, i.adultMortalityPct * k) } : i) },
    { key: 'growth', apply: (i, k) => (i.model === 'herd' ? { ...i, adgKg: i.adgKg * k } : i) },
    { key: 'milkPrice', apply: (i, k) => (i.model === 'herd' ? { ...i, milkPricePerL: i.milkPricePerL * k } : i) },
    { key: 'labor', apply: (i, k) => ({ ...i, laborMonth: i.laborMonth * k }) },
    { key: 'purchasePrice', apply: (i, k) => ({ ...i, purchasePrice: i.purchasePrice * k }) },
  ],
  batch: [
    { key: 'salePrice', apply: (i, k) => (i.model === 'batch' ? { ...i, salePricePerKg: i.salePricePerKg * k } : i) },
    { key: 'feedPrice', apply: (i, k) => (i.model === 'batch' ? { ...i, feedPricePerKg: i.feedPricePerKg * k } : i) },
    { key: 'fcr', apply: (i, k) => (i.model === 'batch' ? { ...i, fcr: i.fcr * k, feedKgPerDay: i.feedKgPerDay * k } : i) },
    { key: 'mortality', apply: (i, k) => (i.model === 'batch' ? { ...i, mortalityPct: Math.min(100, i.mortalityPct * k) } : i) },
    { key: 'finalWeight', apply: (i, k) => (i.model === 'batch' ? { ...i, finalWeightKg: i.finalWeightKg * k } : i) },
    { key: 'purchasePrice', apply: (i, k) => (i.model === 'batch' ? { ...i, unitPrice: i.unitPrice * k } : i) },
    { key: 'labor', apply: (i, k) => ({ ...i, laborMonth: i.laborMonth * k }) },
  ],
  layer: [
    { key: 'eggPrice', apply: (i, k) => (i.model === 'layer' ? { ...i, eggPrice: i.eggPrice * k } : i) },
    { key: 'feedPrice', apply: (i, k) => (i.model === 'layer' ? { ...i, feedPricePerKg: i.feedPricePerKg * k } : i) },
    { key: 'layRate', apply: (i, k) => (i.model === 'layer' ? { ...i, peakLayPct: Math.min(100, i.peakLayPct * k) } : i) },
    { key: 'mortality', apply: (i, k) => (i.model === 'layer' ? { ...i, monthlyMortalityPct: i.monthlyMortalityPct * k } : i) },
    { key: 'purchasePrice', apply: (i, k) => (i.model === 'layer' ? { ...i, pulletPrice: i.pulletPrice * k, purchasePrice: i.purchasePrice * k } : i) },
    { key: 'labor', apply: (i, k) => ({ ...i, laborMonth: i.laborMonth * k }) },
  ],
  apiary: [
    { key: 'honeyPrice', apply: (i, k) => (i.model === 'apiary' ? { ...i, honeyPricePerKg: i.honeyPricePerKg * k } : i) },
    { key: 'honeyYield', apply: (i, k) => (i.model === 'apiary' ? { ...i, honeyKgPerColony: i.honeyKgPerColony * k } : i) },
    { key: 'winterLoss', apply: (i, k) => (i.model === 'apiary' ? { ...i, winterLossPct: Math.min(100, i.winterLossPct * k) } : i) },
    { key: 'splitRate', apply: (i, k) => (i.model === 'apiary' ? { ...i, splitPct: i.splitPct * k } : i) },
    { key: 'feedPrice', apply: (i, k) => (i.model === 'apiary' ? { ...i, sugarPricePerKg: i.sugarPricePerKg * k } : i) },
    { key: 'labor', apply: (i, k) => ({ ...i, laborMonth: i.laborMonth * k }) },
  ],
}

export interface FactorImpact {
  key: FactorKey
  low: number
  high: number
  swing: number
}

/** Har bir omilni ±20% o'zgartirganda muddat oxiridagi natija (naqd + poda) qanchaga o'zgaradi */
export function sensitivity(i: ForecastInput, pct = 20): FactorImpact[] {
  const base = finalWealth(i)
  return FACTORS[i.model]
    .map((f) => {
      const low = finalWealth(f.apply(i, 1 - pct / 100)) - base
      const high = finalWealth(f.apply(i, 1 + pct / 100)) - base
      return { key: f.key, low, high, swing: Math.abs(high - low) }
    })
    .filter((f) => f.swing > 1)
    .sort((a, b) => b.swing - a.swing)
}

/** muddat oxirida boshlang'ich boylikka nisbatan natija (musbat — foyda) */
function finalWealth(i: ForecastInput): number {
  const res = simulate(i)
  const rows = res.rows
  const last = rows.length ? rows[rows.length - 1].wealth : initialCashOf(i)
  return last - baselineOf(i, res).baseWealth
}

/** Yomon va yaxshi ssenariylar (deterministik) */
export function scenario(i: ForecastInput, kind: 'bad' | 'good'): ForecastInput {
  const bad = kind === 'bad'
  const k = (worse: number, better: number) => (bad ? worse : better)
  const base = { ...i, diseaseRiskPct: Math.min(100, i.diseaseRiskPct * k(2, 0.5)) }
  switch (base.model) {
    case 'herd':
      return {
        ...base,
        salePricePerKg: base.salePricePerKg * k(0.85, 1.1),
        cullPricePerKg: base.cullPricePerKg * k(0.85, 1.1),
        feedPricePerKg: base.feedPricePerKg * k(1.15, 0.92),
        litterSize: base.litterSize * k(0.9, 1.08),
        conceptionPct: Math.min(100, base.conceptionPct * k(0.88, 1.04)),
        youngMortalityPct: Math.min(100, base.youngMortalityPct * k(2, 0.6)),
        adultMortalityPct: Math.min(100, base.adultMortalityPct * k(2, 0.6)),
      }
    case 'batch':
      return {
        ...base,
        salePricePerKg: base.salePricePerKg * k(0.88, 1.08),
        feedPricePerKg: base.feedPricePerKg * k(1.15, 0.92),
        mortalityPct: Math.min(100, base.mortalityPct * k(2, 0.6)),
        fcr: base.fcr * k(1.1, 0.95),
        feedKgPerDay: base.feedKgPerDay * k(1.1, 0.95),
      }
    case 'layer':
      return {
        ...base,
        eggPrice: base.eggPrice * k(0.85, 1.1),
        feedPricePerKg: base.feedPricePerKg * k(1.15, 0.92),
        peakLayPct: Math.min(100, base.peakLayPct * k(0.9, 1.04)),
        monthlyMortalityPct: base.monthlyMortalityPct * k(2, 0.6),
      }
    case 'apiary':
      return {
        ...base,
        honeyPricePerKg: base.honeyPricePerKg * k(0.85, 1.1),
        honeyKgPerColony: base.honeyKgPerColony * k(0.7, 1.15),
        winterLossPct: Math.min(100, base.winterLossPct * k(2, 0.6)),
      }
  }
}

/* ------------------------------------------------------------------ */
/* Teskari hisob: maqsadga yetish uchun nima kerak                      */
/* ------------------------------------------------------------------ */

/** Boshlang'ich asosiy bosh sonini o'zgartirish (sarmoya ham shunga qarab o'zgaradi) */
export function withStartCount(i: ForecastInput, n: number): ForecastInput {
  switch (i.model) {
    case 'herd': {
      const ratio = i.females > 0 ? i.pregnant / i.females : 0
      // har 30 ona uchun kamida 1 naslchi
      const males = i.males > 0 ? Math.max(i.males, Math.ceil(n / 30)) : 0
      return { ...i, females: n, pregnant: Math.round(n * ratio), males, maxBreedingFemales: Math.max(i.maxBreedingFemales, n) }
    }
    case 'batch':
      return { ...i, batchSize: n }
    case 'layer':
      return { ...i, flockSize: n }
    case 'apiary':
      return { ...i, colonies: n, maxColonies: Math.max(i.maxColonies, n) }
  }
}

function withSalePrice(i: ForecastInput, k: number): ForecastInput {
  switch (i.model) {
    case 'herd':
      return { ...i, salePricePerKg: i.salePricePerKg * k, cullPricePerKg: i.cullPricePerKg * k, milkPricePerL: i.milkPricePerL * k, woolPricePerKg: i.woolPricePerKg * k }
    case 'batch':
      return { ...i, salePricePerKg: i.salePricePerKg * k }
    case 'layer':
      return { ...i, eggPrice: i.eggPrice * k, spentHenPrice: i.spentHenPrice * k }
    case 'apiary':
      return { ...i, honeyPricePerKg: i.honeyPricePerKg * k, waxPricePerKg: i.waxPricePerKg * k, colonySalePrice: i.colonySalePrice * k }
  }
}

function withFeedPrice(i: ForecastInput, k: number): ForecastInput {
  switch (i.model) {
    case 'apiary':
      return { ...i, sugarPricePerKg: i.sugarPricePerKg * k }
    default:
      return { ...i, feedPricePerKg: i.feedPricePerKg * k }
  }
}

/** Monoton funksiya uchun ikkiga bo'lib qidirish: f(x) >= target bo'ladigan eng kichik x */
function searchMin(f: (x: number) => boolean, lo: number, hi: number, integer: boolean, steps = 40): number | undefined {
  if (!f(hi)) return undefined
  if (f(lo)) return lo
  for (let s = 0; s < steps && hi - lo > (integer ? 1 : 1e-3); s++) {
    const mid = integer ? Math.floor((lo + hi) / 2) : (lo + hi) / 2
    if (f(mid)) hi = mid
    else lo = mid
  }
  return hi
}

export interface NeedResult {
  /** qaysi maqsad uchun hisoblangan va qaysi muddatga */
  kind?: 'heads' | 'cash'
  months: number
  target?: number
  /** maqsadga 80% ishonch bilan yetish uchun kerakli boshlang'ich bosh soni */
  startCount?: number
  startInvestment?: number
  /** narx bo'yicha: hozirgi narxga nisbatan kerakli ko'paytiruvchi */
  priceFactor?: number
  /** zararsiz bo'lish uchun narx ko'paytiruvchisi (muddat oxirida naqd + poda = 0) */
  breakEvenPriceFactor?: number
  /** yem qanchagacha qimmatlashsa ham zarar bo'lmaydi */
  maxFeedFactor?: number
}

export function solveNeeds(i: ForecastInput, goal: Goal, confidence = 0.8, runs = 120): NeedResult {
  // Qaysi savol: "need" — tanlangan tur va muddat; "heads"/"cash" — butun muddat
  const kind: 'heads' | 'cash' | undefined =
    goal.type === 'need' ? goal.needKind : goal.type === 'heads' ? 'heads' : goal.type === 'cash' ? 'cash' : undefined
  const T = goal.type === 'need' ? Math.min(i.months, Math.max(1, goal.byMonth)) : i.months
  const horizon: ForecastInput = { ...i, months: T }
  const out: NeedResult = { kind, months: T, target: kind === 'heads' ? goal.heads : kind === 'cash' ? goal.amount : undefined }
  if (kind) {
    const reachedProb = (x: ForecastInput) => {
      let ok = 0
      for (let k = 0; k < runs; k++) {
        const res = simulate(x, seeded(777 + k * 31))
        const m = milestones(res.rows, goal, baselineOf(x, res))
        if ((kind === 'heads' ? m.heads : m.cash) !== undefined) ok++
      }
      return ok / runs
    }
    const cur = Math.max(1, startCount(i))
    const n = searchMin((x) => reachedProb(withStartCount(horizon, x)) >= confidence, 1, Math.max(cur * 20, 50), true, 24)
    if (n !== undefined) {
      out.startCount = n
      out.startInvestment = investmentOf(withStartCount(i, n))
    }
  }
  if (kind === 'cash') {
    const lastCash = (x: ForecastInput) => {
      const rows = simulate(x).rows
      return rows.length ? rows[rows.length - 1].cash : initialCashOf(x)
    }
    out.priceFactor = searchMin((k) => lastCash(withSalePrice(horizon, k)) >= goal.amount, 0, 10, false)
  }
  out.breakEvenPriceFactor = searchMin((k) => finalWealth(withSalePrice(i, k)) >= 0, 0, 10, false)
  const baseOk = finalWealth(i) >= 0
  if (baseOk) {
    // yem narxi oshgan sari natija kamayadi: >= 0 bo'ladigan eng katta ko'paytiruvchi
    let lo = 1
    let hi = 10
    if (finalWealth(withFeedPrice(i, hi)) >= 0) out.maxFeedFactor = hi
    else {
      for (let s = 0; s < 40 && hi - lo > 1e-3; s++) {
        const mid = (lo + hi) / 2
        if (finalWealth(withFeedPrice(i, mid)) >= 0) lo = mid
        else hi = mid
      }
      out.maxFeedFactor = lo
    }
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Hammasi birga                                                       */
/* ------------------------------------------------------------------ */

export interface Forecast {
  expected: RunResult
  summary: Summary
  milestones: Record<MilestoneKey, number | undefined>
  mc: MonteCarlo
  bad: Summary
  good: Summary
  badMilestones: Record<MilestoneKey, number | undefined>
  goodMilestones: Record<MilestoneKey, number | undefined>
  sensitivity: FactorImpact[]
}

export function forecast(i: ForecastInput, goal: Goal, runs = 400): Forecast {
  const expected = simulate(i)
  const badRun = simulate(scenario(i, 'bad'))
  const goodRun = simulate(scenario(i, 'good'))
  const base = baselineOf(i, expected)
  return {
    expected,
    summary: summarize(i, expected),
    milestones: milestones(expected.rows, goal, base),
    mc: monteCarlo(i, goal, runs),
    bad: summarize(i, badRun),
    good: summarize(i, goodRun),
    badMilestones: milestones(badRun.rows, goal, base),
    goodMilestones: milestones(goodRun.rows, goal, base),
    sensitivity: sensitivity(i),
  }
}
