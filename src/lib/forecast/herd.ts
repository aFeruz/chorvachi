import { DAYS, draft, finalize, fixedCosts, makeEconomy, monthAt, investmentOf } from './common'
import { monthlyProb, type Rand } from './rng'
import type { HerdInput, MonthRow, RunResult } from './types'

/**
 * Ko'paytirish modeli (qo'y, echki, qoramol, ot, tuya, quyon).
 *
 * Har oy:
 *  1. bo'g'ozlar tug'adi (egizak ehtimoli bilan), yosh o'limi qo'llanadi
 *  2. dam olayotgan onalar qayta qochirishga tayyor bo'ladi
 *  3. bo'sh, voyaga yetgan urg'ochilar qochiriladi (naslchi yoki sun'iy urug'lantirish bo'lsa)
 *  4. kattalar va yoshlar o'limi, kasallik chiqishi
 *  5. yoshlar ulg'ayadi: erkaklar sotiladi, urg'ochilar podada qoldiriladi yoki sotiladi
 *  6. qarigan onalar sotiladi, joy sig'imidan oshgani sotiladi
 *  7. sut, jun, yem va boshqa xarajatlar
 */

interface FemaleGroup {
  age: number
  state: 'open' | 'preg' | 'rest'
  t: number
  n: number
}

interface YoungCohort {
  age: number
  f: number
  m: number
  /** urg'ochilar podada qoldirilgan (sotilmaydi, voyaga yetadi) */
  keptF: number
}

export function runHerd(i: HerdInput, R: Rand): RunResult {
  const eco = makeEconomy(i, R)
  const warnings: string[] = []
  const w = (age: number) => Math.min(i.adultWeightKg, i.birthWeightKg + i.adgKg * DAYS * age)
  const cullAge = i.maturityMonths + i.productiveYears * 12
  // qari ona narxi kiritilmasa, tirik vazn narxi olinadi
  const cullPrice = i.cullPricePerKg > 0 ? i.cullPricePerKg : i.salePricePerKg
  const decideAge = Math.max(1, Math.min(i.sellAgeMonths, i.maturityMonths))
  const gest = Math.max(1, Math.round(i.gestationMonths))
  const rest = Math.max(1, Math.round(i.birthIntervalMonths) - gest)

  let females: FemaleGroup[] = []
  const due = Math.max(1, Math.min(gest, i.dueInMonths))
  const ages = i.femaleGroups?.length ? i.femaleGroups : [{ ageMonths: i.femaleAgeMonths, count: i.females }]
  const total = ages.reduce((s, g) => s + g.count, 0)
  const pregShare = total > 0 ? Math.min(i.pregnant, i.females) / total : 0
  for (const g of ages) {
    // bo'g'ozlar yosh guruhlari bo'yicha mutanosib taqsimlanadi
    const preg = R.det ? g.count * pregShare : Math.round(g.count * pregShare)
    if (g.count - preg > 0) females.push({ age: g.ageMonths, state: 'open', t: 0, n: g.count - preg })
    if (preg > 0) females.push({ age: g.ageMonths, state: 'preg', t: due, n: preg })
  }
  let males = i.males
  let young: YoungCohort[] = i.young.filter((y) => y.females + y.males > 0).map((y) => ({ age: y.ageMonths, f: y.females, m: y.males, keptF: 0 }))
  let lact: { n: number; t: number }[] = []

  if (i.females > 0 && males <= 0 && !i.useAI) warnings.push('noMales')
  if (i.females <= 0 && young.every((y) => y.f === 0)) warnings.push('noFemales')

  const sumF = () => females.reduce((s, g) => s + g.n, 0)
  const sumYoung = () => young.reduce((s, y) => s + y.f + y.m + y.keptF, 0)
  const keptYoungF = () => young.reduce((s, y) => s + y.keptF, 0)
  const herdValue = (P: number) =>
    (sumF() + males) * i.adultWeightKg * cullPrice * P +
    young.reduce((s, y) => s + (y.f + y.m + y.keptF) * w(y.age) * i.salePricePerKg * P, 0)

  const startHerdValue = herdValue(1)
  let cash = i.startCash - investmentOf(i)
  const rows: MonthRow[] = []

  for (let m = 1; m <= i.months; m++) {
    const { key, cal } = monthAt(i.startMonth, m - 1)
    const P = eco.price(m)
    const C = eco.cost(m)
    const d = draft()

    // 1-2. tug'ish va dam olish
    const next: FemaleGroup[] = []
    for (const g of females) {
      if (g.state === 'preg') {
        const t = g.t - 1
        if (t > 0) {
          next.push({ ...g, t })
          continue
        }
        const base = Math.floor(i.litterSize)
        const kids = R.det ? g.n * i.litterSize : g.n * base + R.binom(g.n, i.litterSize - base)
        const lost = R.binom(kids, i.youngMortalityPct / 100)
        const alive = kids - lost
        const fk = R.binom(alive, 0.5)
        young.push({ age: 0, f: fk, m: alive - fk, keptF: 0 })
        // tug'ilganlarning hammasi (o'lik tug'ilganlar ham), yo'qotishlar «o'ldi»da
        d.born += kids
        d.died += lost
        if (i.milkLPerDay > 0 && i.lactationMonths > 0) lact.push({ n: g.n, t: i.lactationMonths })
        next.push({ age: g.age, state: 'rest', t: rest, n: g.n })
      } else if (g.state === 'rest') {
        const t = g.t - 1
        next.push(t > 0 ? { ...g, t } : { ...g, state: 'open', t: 0 })
      } else next.push(g)
    }
    females = next

    // 3. qochirish
    // det rejimda naslchi soni kasr bo'lishi mumkin (o'lim ehtimoli ayiriladi)
    const canBreed = males >= 0.5 || i.useAI
    if (canBreed) {
      const after: FemaleGroup[] = []
      for (const g of females) {
        if (g.state !== 'open' || g.age < i.maturityMonths || g.n <= 0) {
          after.push(g)
          continue
        }
        if (i.useAI && males < 0.5) d.costs.breeding += g.n * i.aiCostPerFemale * C
        const c = R.binom(g.n, i.conceptionPct / 100)
        if (c > 0) after.push({ age: g.age, state: 'preg', t: gest, n: c })
        if (g.n - c > 0) after.push({ ...g, n: g.n - c })
      }
      females = after
    }

    // 4. o'lim va kasallik
    const ev = R.event(monthlyProb(i.diseaseRiskPct))
    d.outbreak = ev
    const loss = (ev * i.diseaseLossPct) / 100
    const pA = 1 - (1 - monthlyProb(i.adultMortalityPct)) * (1 - loss)
    const pY = 1 - (1 - monthlyProb(i.adultMortalityPct * 1.5)) * (1 - loss)
    const headsBefore = sumF() + males + sumYoung()
    d.costs.disease += ev * headsBefore * i.diseaseCostPerHead * C
    for (const g of females) {
      const dead = R.binom(g.n, pA)
      g.n -= dead
      d.died += dead
    }
    // o'lgan naslchi almashtiriladi: kiritilgan narxda, bo'lmasa bozor qiymatida (vazn × narx)
    const deadMales = R.binom(males, pA)
    d.died += deadMales
    d.costs.stock += deadMales * (i.malePrice > 0 ? i.malePrice * C : i.adultWeightKg * cullPrice * P)
    for (const y of young) {
      const df = R.binom(y.f, pY)
      const dm = R.binom(y.m, pY)
      const dk = R.binom(y.keptF, pY)
      y.f -= df
      y.m -= dm
      y.keptF -= dk
      d.died += df + dm + dk
    }
    lact = lact.map((l) => ({ ...l, n: l.n - R.binom(l.n, pA) }))

    // 5. ulg'ayish va sotish
    for (const g of females) g.age++
    for (const y of young) y.age++
    const remaining: YoungCohort[] = []
    for (const y of young) {
      if (y.age >= i.sellAgeMonths && y.m > 0) {
        d.rev.animals += y.m * w(y.age) * i.salePricePerKg * P
        d.sold += y.m
        y.m = 0
      }
      if (y.age >= decideAge && y.f > 0) {
        const slots = i.keepFemales ? Math.max(0, i.maxBreedingFemales - sumF() - keptYoungF()) : 0
        const keep = Math.min(y.f, R.det ? slots : Math.floor(slots))
        y.keptF += keep
        y.f -= keep
        if (y.age >= i.sellAgeMonths && y.f > 0) {
          d.rev.animals += y.f * w(y.age) * i.salePricePerKg * P
          d.sold += y.f
          y.f = 0
        }
      }
      if (y.age >= i.maturityMonths && y.keptF > 0) {
        females.push({ age: y.age, state: 'open', t: 0, n: y.keptF })
        y.keptF = 0
      }
      if (y.f + y.m + y.keptF > 1e-9) remaining.push(y)
    }
    young = remaining

    // 6. qarigan onalarni sotish
    const kept: FemaleGroup[] = []
    for (const g of females) {
      if (g.age >= cullAge && g.state !== 'preg' && g.n > 0) {
        d.rev.culls += g.n * i.adultWeightKg * cullPrice * P
        d.sold += g.n
      } else if (g.n > 1e-9) kept.push(g)
    }
    females = kept

    // joy sig'imi: ortiqchasi (eng kattalaridan boshlab) sotiladi
    if (i.maxHeads > 0) {
      let excess = sumF() + males + sumYoung() - i.maxHeads
      for (const y of [...young].sort((a, b) => b.age - a.age)) {
        if (excess <= 0) break
        for (const k of ['m', 'f', 'keptF'] as const) {
          if (excess <= 0) break
          const s = Math.min(y[k], excess)
          if (s <= 0) continue
          y[k] -= s
          excess -= s
          d.rev.animals += s * w(y.age) * i.salePricePerKg * P
          d.sold += s
        }
      }
      young = young.filter((y) => y.f + y.m + y.keptF > 1e-9)
    }

    // bir xil holatdagi guruhlarni birlashtiramiz (aks holda guruhlar soni portlaydi)
    females = mergeGroups(females)

    // 7. mahsulotlar
    const adults = sumF() + males
    if (i.woolKgPerYear > 0 && cal === i.shearMonth) d.rev.wool += adults * i.woolKgPerYear * i.woolPricePerKg * P
    if (lact.length) {
      const milking = lact.reduce((s, l) => s + l.n, 0)
      d.rev.milk += milking * i.milkLPerDay * DAYS * i.milkPricePerL * P
      lact = lact.map((l) => ({ ...l, t: l.t - 1 })).filter((l) => l.t > 0 && l.n > 1e-9)
    }

    // 8. yem va doimiy xarajatlar
    const youngUnits = young.reduce((s, y) => s + (y.f + y.m + y.keptF) * i.youngFeedFactor * (y.age < 2 ? 0.3 : 1), 0)
    const pasture = i.pastureMonths.includes(cal) ? 1 - i.pastureSavingPct / 100 : 1
    d.feedKg = (adults + youngUnits) * i.feedKgPerDay * DAYS * pasture
    d.costs.feed += d.feedKg * i.feedPricePerKg * C
    const heads = adults + sumYoung()
    fixedCosts(i, d, heads, C)

    d.heads = heads
    d.core = sumF()
    d.young = sumYoung()
    d.herdValue = herdValue(P)
    const row = finalize(m, key, d, cash)
    cash = row.cash
    rows.push(row)
  }

  return { rows, startHerdValue, startWealth: i.startCash - investmentOf(i) + startHerdValue, warnings }
}

function mergeGroups(groups: FemaleGroup[]): FemaleGroup[] {
  const map = new Map<string, FemaleGroup>()
  for (const g of groups) {
    if (g.n <= 1e-9) continue
    const key = `${g.age}|${g.state}|${g.t}`
    const ex = map.get(key)
    if (ex) ex.n += g.n
    else map.set(key, { ...g })
  }
  return [...map.values()]
}
