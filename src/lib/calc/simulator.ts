/**
 * Biznes-reja simulyatori: oy-baoy poda harakati va pul oqimi.
 * Ma'lumotlar bazasiga bog'liq emas — "agar shunday qilsam nima bo'ladi?" savoliga javob.
 */

export interface SimInput {
  months: number
  females: number
  males: number
  pricePerHead: number
  setupCost: number
  firstBirthMonth: number
  birthsPerYear: number
  conceptionPct: number
  litterSize: number
  youngMortalityPct: number
  adultMortalityPctYear: number
  sellAgeMonths: number
  sellWeightKg: number
  pricePerKg: number
  keepFemalesPct: number
  feedPerHeadDay: number
  youngFeedFactor: number
  vetPerHeadYear: number
  laborMonth: number
  otherMonth: number
  inflationPctYear: number
}

export interface SimRow {
  month: number
  adults: number
  young: number
  born: number
  sold: number
  revenue: number
  cost: number
  net: number
  cumulative: number
}

export interface SimResult {
  rows: SimRow[]
  investment: number
  totalRevenue: number
  totalCost: number
  cashProfit: number
  residualValue: number
  totalProfit: number
  roiPct: number
  paybackMonth?: number
  endHeads: number
  soldHeads: number
  bornTotal: number
  costPerKgSold?: number
  avgMonthlyProfit: number
}

export const SIM_DEFAULT: SimInput = {
  months: 36,
  females: 30,
  males: 1,
  pricePerHead: 3_000_000,
  setupCost: 10_000_000,
  firstBirthMonth: 5,
  birthsPerYear: 1,
  conceptionPct: 90,
  litterSize: 1.3,
  youngMortalityPct: 8,
  adultMortalityPctYear: 3,
  sellAgeMonths: 8,
  sellWeightKg: 45,
  pricePerKg: 55_000,
  keepFemalesPct: 50,
  feedPerHeadDay: 3_000,
  youngFeedFactor: 0.5,
  vetPerHeadYear: 60_000,
  laborMonth: 1_500_000,
  otherMonth: 300_000,
  inflationPctYear: 10,
}

const DAYS_IN_MONTH = 30.4

export function simulate(i: SimInput): SimResult {
  let F = i.females
  let M = i.males
  const cohorts: { age: number; count: number }[] = []
  const investment = (i.females + i.males) * i.pricePerHead + i.setupCost
  const interval = Math.max(1, Math.round(12 / Math.max(0.1, i.birthsPerYear)))
  const mAdult = i.adultMortalityPctYear / 100 / 12
  const rows: SimRow[] = []
  let cum = -investment
  let totalRevenue = 0
  let totalCost = 0
  let soldHeads = 0
  let bornTotal = 0
  let paybackMonth: number | undefined

  for (let m = 1; m <= i.months; m++) {
    const infl = Math.pow(1 + i.inflationPctYear / 100, (m - 1) / 12)

    // o'lim
    F *= 1 - mAdult
    M *= 1 - mAdult

    // yoshlar ulg'ayadi
    for (const c of cohorts) c.age++

    // tug'ish
    let born = 0
    if (i.litterSize > 0 && m >= i.firstBirthMonth && (m - i.firstBirthMonth) % interval === 0) {
      born = F * (i.conceptionPct / 100) * i.litterSize * (1 - i.youngMortalityPct / 100)
      if (born > 0) cohorts.push({ age: 0, count: born })
      bornTotal += born
    }

    // sotish yoshiga yetganlar
    let sold = 0
    let revenue = 0
    for (let k = cohorts.length - 1; k >= 0; k--) {
      const c = cohorts[k]
      if (c.age >= i.sellAgeMonths) {
        const kept = (c.count / 2) * (i.keepFemalesPct / 100)
        F += kept
        const s = c.count - kept
        sold += s
        revenue += s * i.sellWeightKg * i.pricePerKg * infl
        cohorts.splice(k, 1)
      }
    }

    const young = cohorts.reduce((s, c) => s + c.count, 0)
    const adults = F + M
    const feed = (adults + young * i.youngFeedFactor) * i.feedPerHeadDay * DAYS_IN_MONTH * infl
    const vet = ((adults + young) * i.vetPerHeadYear * infl) / 12
    const cost = feed + vet + (i.laborMonth + i.otherMonth) * infl

    const net = revenue - cost
    cum += net
    totalRevenue += revenue
    totalCost += cost
    soldHeads += sold
    if (paybackMonth === undefined && cum >= 0) paybackMonth = m
    rows.push({ month: m, adults, young, born, sold, revenue, cost, net, cumulative: cum })
  }

  const inflEnd = Math.pow(1 + i.inflationPctYear / 100, i.months / 12)
  const youngValue = cohorts.reduce(
    (s, c) => s + c.count * Math.min(1, (c.age + 1) / Math.max(1, i.sellAgeMonths)) * i.sellWeightKg * i.pricePerKg,
    0,
  )
  const residualValue = ((F + M) * i.pricePerHead + youngValue) * inflEnd
  const cashProfit = totalRevenue - totalCost - investment
  const totalProfit = cashProfit + residualValue
  const endHeads = F + M + cohorts.reduce((s, c) => s + c.count, 0)

  return {
    rows,
    investment,
    totalRevenue,
    totalCost,
    cashProfit,
    residualValue,
    totalProfit,
    roiPct: investment > 0 ? (totalProfit / investment) * 100 : 0,
    paybackMonth,
    endHeads,
    soldHeads,
    bornTotal,
    costPerKgSold: soldHeads > 0 ? totalCost / (soldHeads * i.sellWeightKg) : undefined,
    avgMonthlyProfit: i.months > 0 ? totalProfit / i.months : 0,
  }
}

export type Scenario = 'bad' | 'base' | 'good'

export function scenarioInput(i: SimInput, s: Scenario): SimInput {
  if (s === 'base') return i
  const bad = s === 'bad'
  const f = (x: number, worse: number, better: number) => x * (bad ? worse : better)
  return {
    ...i,
    conceptionPct: Math.min(100, f(i.conceptionPct, 0.85, 1.05)),
    litterSize: f(i.litterSize, 0.9, 1.1),
    youngMortalityPct: Math.min(100, f(i.youngMortalityPct, 1.8, 0.6)),
    adultMortalityPctYear: Math.min(100, f(i.adultMortalityPctYear, 1.8, 0.6)),
    sellWeightKg: f(i.sellWeightKg, 0.92, 1.06),
    pricePerKg: f(i.pricePerKg, 0.88, 1.08),
    feedPerHeadDay: f(i.feedPerHeadDay, 1.15, 0.92),
  }
}

/** Tur bo'yicha tayyor boshlang'ich qiymatlar */
export const SIM_PRESETS: Record<string, Partial<SimInput>> = {
  sp_sheep: {},
  sp_goat: { litterSize: 1.6, sellWeightKg: 35, pricePerKg: 50_000, pricePerHead: 2_000_000, feedPerHeadDay: 2_500 },
  sp_cattle: {
    females: 10, males: 1, pricePerHead: 18_000_000, firstBirthMonth: 9, litterSize: 1, conceptionPct: 85,
    sellAgeMonths: 15, sellWeightKg: 400, pricePerKg: 45_000, feedPerHeadDay: 15_000, vetPerHeadYear: 300_000,
    youngMortalityPct: 5, months: 48, setupCost: 40_000_000, laborMonth: 2_000_000, keepFemalesPct: 60,
  },
  sp_rabbit: {
    females: 30, males: 3, pricePerHead: 150_000, firstBirthMonth: 2, birthsPerYear: 6, litterSize: 7,
    youngMortalityPct: 15, sellAgeMonths: 3, sellWeightKg: 2.8, pricePerKg: 35_000, keepFemalesPct: 5,
    feedPerHeadDay: 600, vetPerHeadYear: 5_000, laborMonth: 0, otherMonth: 300_000, months: 12, setupCost: 8_000_000,
    adultMortalityPctYear: 10,
  },
}
