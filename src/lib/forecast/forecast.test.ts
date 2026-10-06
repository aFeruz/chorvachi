import { describe, expect, it } from 'vitest'
import { DEFAULT_GOAL, forecast, milestones, monteCarlo, sensitivity, simulate, solveNeeds, summarize, workingCapital } from './analyze'
import { seeded } from './rng'
import { defaultInput } from './presets'
import { layRate } from './layer'
import type { ApiaryInput, BatchInput, HerdInput, LayerInput } from './types'

const quiet = { diseaseRiskPct: 0, priceVolatilityPct: 0 }

function sheep(patch: Partial<HerdInput> = {}): HerdInput {
  return {
    ...(defaultInput('herd', 'sheep', '2026-01') as HerdInput),
    ...quiet,
    salePricePerKg: 50_000,
    feedPricePerKg: 2_000,
    purchasePrice: 3_000_000,
    ...patch,
  }
}

describe("ko'paytirish modeli", () => {
  it("bo'g'ozlar belgilangan oyda tug'adi", () => {
    const i = sheep({ females: 4, pregnant: 4, dueInMonths: 2, litterSize: 1.5, youngMortalityPct: 0, adultMortalityPct: 0, months: 3 })
    const rows = simulate(i).rows
    expect(rows[0].born).toBe(0)
    expect(rows[1].born).toBeCloseTo(6)
    expect(rows[2].born).toBe(0)
  })

  it("o'lim va sotuv bo'lmasa, bosh soni = boshlang'ich + tug'ilganlar", () => {
    const i = sheep({
      females: 10, males: 1, pregnant: 5, dueInMonths: 1, youngMortalityPct: 0, adultMortalityPct: 0, sellAgeMonths: 999,
      maxBreedingFemales: 9999, productiveYears: 99, months: 30,
    })
    const rows = simulate(i).rows
    const born = rows.reduce((s, r) => s + r.born, 0)
    expect(rows[rows.length - 1].heads).toBeCloseTo(11 + born, 6)
    expect(rows.every((r) => r.sold === 0)).toBe(true)
  })

  it("naslchi yo'q bo'lsa — qochirish bo'lmaydi va ogohlantirish", () => {
    const res = simulate(sheep({ males: 0, months: 24 }))
    expect(res.warnings).toContain('noMales')
    expect(res.rows.reduce((s, r) => s + r.born, 0)).toBe(0)
  })

  it("sun'iy urug'lantirish bilan naslchisiz ham tug'iladi", () => {
    const res = simulate(sheep({ males: 0, useAI: true, aiCostPerFemale: 50_000, months: 24 }))
    expect(res.rows.reduce((s, r) => s + r.born, 0)).toBeGreaterThan(0)
    expect(res.rows.reduce((s, r) => s + r.costs.breeding, 0)).toBeGreaterThan(0)
  })

  it('erkak qo\'zilar sotish yoshida sotiladi', () => {
    const i = sheep({ females: 0, males: 0, young: [{ ageMonths: 5, females: 0, males: 4 }], youngMortalityPct: 0, adultMortalityPct: 0, months: 2 })
    const rows = simulate(i).rows
    expect(rows[0].sold).toBeCloseTo(4)
    // vazn: 4 + 0.18*30.4*6 kg
    expect(rows[0].rev.animals).toBeCloseTo(4 * (4 + 0.18 * 30.4 * 6) * 50_000)
  })

  it("sarmoya: sotib olish narxi × bosh + naslchi + bino", () => {
    const i = sheep({ females: 4, males: 1, malePrice: 5_000_000, setupCost: 2_000_000 })
    const s = summarize(i, simulate(i))
    expect(s.investment).toBe(4 * 3_000_000 + 5_000_000 + 2_000_000)
    expect(simulate({ ...i, buyStart: false }).rows[0].cash).toBeGreaterThan(-3_000_000)
  })

  it('stoxastik simulyatsiya takrorlanadi va butun sonlar beradi', () => {
    const i = sheep({ ...quiet, diseaseRiskPct: 30 })
    const a = simulate(i, seeded(42)).rows
    const b = simulate(i, seeded(42)).rows
    expect(a.map((r) => r.heads)).toEqual(b.map((r) => r.heads))
    expect(a.every((r) => Number.isInteger(Math.round(r.heads * 1e9) / 1e9))).toBe(true)
  })

  it("misol: 4 ta bo'g'oz qo'ydan 10 boshga yetish", () => {
    const i = sheep({ females: 4, pregnant: 4, dueInMonths: 2, males: 1, months: 48 })
    const goal = { ...DEFAULT_GOAL, type: 'heads' as const, heads: 10 }
    const f = forecast(i, goal, 200)
    expect(f.milestones.heads).toBeDefined()
    expect(f.milestones.heads!).toBeLessThanOrEqual(30)
    expect(f.mc.milestones.heads.prob).toBeGreaterThan(0.5)
    expect(f.mc.heads.p10[20]).toBeLessThanOrEqual(f.mc.heads.p90[20])
  })
})

describe('partiya modeli', () => {
  const broiler = (p: Partial<BatchInput> = {}): BatchInput => ({
    ...(defaultInput('batch', 'broiler', '2026-01') as BatchInput),
    ...quiet,
    mortalityPct: 0,
    batchCount: 1,
    salePricePerKg: 25_000,
    feedPricePerKg: 6_000,
    unitPrice: 7_000,
    months: 3,
    ...p,
  })

  it('bitta partiya: yem, jo\'ja va tushum', () => {
    const rows = simulate(broiler()).rows
    const feedKg = rows.reduce((s, r) => s + r.feedKg, 0)
    expect(feedKg).toBeCloseTo(500 * 1.7 * (2.5 - 0.04), 3)
    const revenue = rows.reduce((s, r) => s + r.rev.animals, 0)
    expect(revenue).toBeCloseTo(500 * 2.5 * 25_000)
    expect(rows.reduce((s, r) => s + r.costs.stock, 0)).toBe(500 * 7_000)
  })

  it('uzluksiz partiyalar soni', () => {
    const rows = simulate(broiler({ batchCount: 0, months: 12 })).rows
    const sold = rows.reduce((s, r) => s + r.sold, 0)
    // 365 kun / 56 kun ≈ 6 partiya
    expect(sold / 500).toBeGreaterThanOrEqual(6)
  })
})

describe('tuxum tovuq va asalari', () => {
  it("tuxum qilish egri chizig'i", () => {
    const i = { peakLayPct: 90, layDeclinePct: 1 }
    expect(layRate(i, 0)).toBeCloseTo(54)
    expect(layRate(i, 2)).toBe(90)
    expect(layRate(i, 12)).toBe(80)
  })

  it('tovuqlar almashtiriladi', () => {
    const i: LayerInput = { ...(defaultInput('layer', 'layer', '2026-01') as LayerInput), ...quiet, eggPrice: 1_200, feedPricePerKg: 5_000, pulletPrice: 40_000, spentHenPrice: 30_000, layMonths: 6, months: 12 }
    const rows = simulate(i).rows
    expect(rows[5].rev.culls).toBeGreaterThan(0)
    expect(rows[6].costs.stock).toBeCloseTo(300 * 40_000)
  })

  it("asalari oilalari bahorda bo'linadi", () => {
    const i: ApiaryInput = { ...(defaultInput('apiary', 'bee', '2026-01') as ApiaryInput), ...quiet, honeyPricePerKg: 80_000, winterLossPct: 0, months: 6 }
    const rows = simulate(i).rows
    expect(rows[4].core).toBeCloseTo(14)
  })
})

describe('tahlil', () => {
  const mkRows = (cash: number[]) =>
    cash.map((c, k) => ({ m: k + 1, cash: c, wealth: c, net: 1, revenue: 0, heads: 0, core: 0, born: 0, rev: { animals: 0, culls: 0 } })) as never

  it("qoplanish: naqd pul boshlang'ich darajaga barqaror qaytgan oy", () => {
    const rows = mkRows([-10, -5, 2, -1, 3, 4, 5, 6, 7, 8])
    // 3-oyda qisqa vaqt 0 dan oshadi, lekin 4-oyda yana tushadi -> barqaror qaytish 5-oy
    expect(milestones(rows, DEFAULT_GOAL, { initialCash: -12, paybackTarget: 0, baseWealth: 0 }).payback).toBe(5)
  })

  it("sarmoyasiz, lekin keyin zarar bo'lsa — «hozirning o'zida» emas", () => {
    const rows = mkRows([-1, -5, -9, -12, -15, -20])
    expect(milestones(rows, DEFAULT_GOAL, { initialCash: 0, paybackTarget: 0, baseWealth: 0 }).payback).toBeUndefined()
    const ok = mkRows([1, 2, 3, 4])
    expect(milestones(ok, DEFAULT_GOAL, { initialCash: 0, paybackTarget: 0, baseWealth: 0 }).payback).toBe(0)
  })

  it("bor poda hisobga olinadi: boylik kamaysa — zarar", () => {
    const i = sheep({ buyStart: false, females: 30, keepFemales: false, laborMonth: 5_000_000, months: 36 })
    const f = forecast(i, DEFAULT_GOAL, 100)
    expect(f.summary.baseWealth).toBeGreaterThan(0)
    expect(f.summary.gain).toBeLessThan(0)
    expect(f.mc.lossProb).toBeGreaterThan(0.5)
  })

  it("bosh soni maqsadi faqat barqaror bo'lsa hisoblanadi", () => {
    const heads = [5, 11, 11, 7, 7, 7, 10, 10, 10, 10, 10, 10, 10]
    const rows = heads.map((h, k) => ({ m: k + 1, heads: h, core: h, cash: 0, wealth: 0, net: 0, born: 0, rev: { animals: 0, culls: 0 } })) as never
    expect(milestones(rows, { ...DEFAULT_GOAL, heads: 10 }, { initialCash: 0, paybackTarget: 0, baseWealth: 0 }).heads).toBe(7)
  })

  it("aylanma mablag': eng chuqur nuqta", () => {
    const i = sheep({ females: 4, months: 24 })
    const rows = simulate(i).rows
    const wc = workingCapital(i, rows)
    expect(wc.need).toBeGreaterThanOrEqual(4 * 3_000_000)
  })

  it("ta'sir tahlili: sotish narxi oshsa natija oshadi", () => {
    const s = sensitivity(sheep({ females: 20, months: 36 }))
    const sale = s.find((x) => x.key === 'salePrice')!
    expect(sale.high).toBeGreaterThan(0)
    expect(sale.low).toBeLessThan(0)
    expect(s[0].swing).toBeGreaterThanOrEqual(s[s.length - 1].swing)
  })

  it("teskari hisob: ko'proq ona — maqsadga tezroq", () => {
    const i = sheep({ females: 4, months: 36 })
    const need = solveNeeds(i, { ...DEFAULT_GOAL, type: 'need', needKind: 'heads', heads: 30, byMonth: 24 }, 0.8, 60)
    expect(need.startCount).toBeGreaterThan(4)
    const ok = monteCarlo({ ...i, females: need.startCount!, months: 24 }, { ...DEFAULT_GOAL, heads: 30 }, 60)
    expect(ok.milestones.heads.prob).toBeGreaterThanOrEqual(0.7)
  })

  it('tezlik: 400 ta simulyatsiya', () => {
    const t0 = performance.now()
    forecast(sheep({ females: 50, months: 60 }), DEFAULT_GOAL, 400)
    expect(performance.now() - t0).toBeLessThan(4000)
  })
})

describe("tekshiruvda topilgan xatolar", () => {
  it("kasallik ehtimoli 100% dan oshsa ham NaN bo'lmaydi", () => {
    const i: BatchInput = { ...(defaultInput('batch', 'broiler', '2026-01') as BatchInput), diseaseRiskPct: 150, salePricePerKg: 24_000, feedPricePerKg: 6_000, unitPrice: 7_000 }
    expect(simulate(i).rows.every((r) => Number.isFinite(r.cash))).toBe(true)
  })

  it("tovuqlar hammasi nobud bo'lsa — yangilari olinadi", () => {
    const i: LayerInput = { ...(defaultInput('layer', 'layer', '2026-01') as LayerInput), ...quiet, monthlyMortalityPct: 100, eggPrice: 1_000, feedPricePerKg: 5_000, pulletPrice: 40_000, months: 6 }
    const rows = simulate(i).rows
    expect(rows[0].heads).toBe(0)
    expect(rows.some((r) => r.costs.stock > 0)).toBe(true)
  })

  it("asal oyi tanlanmasa — asal yo'q va ogohlantirish", () => {
    const i: ApiaryInput = { ...(defaultInput('apiary', 'bee', '2026-01') as ApiaryInput), ...quiet, honeyPricePerKg: 80_000, harvestMonths: [] }
    const res = simulate(i)
    expect(res.rows.reduce((s, r) => s + r.rev.honey, 0)).toBe(0)
    expect(res.warnings).toContain('noHarvest')
  })

  it("yagona naslchi o'lsa ham ko'payish davom etadi (naslchi almashtiriladi)", () => {
    const i = sheep({ females: 10, males: 1, adultMortalityPct: 30, months: 72 })
    // onalar tirik bo'lsa-yu, tug'ish to'xtagan holatlar bo'lmasligi kerak
    let stopped = 0
    for (let k = 0; k < 60; k++) {
      const rows = simulate(i, seeded(k)).rows
      if (rows[47].core >= 2 && rows.slice(48).every((r) => r.born === 0)) stopped++
    }
    expect(stopped).toBe(0)
  })

  it('onalar yoshi turlicha bo\'lsa — bir oyda hammasi sotilib ketmaydi', () => {
    const i = sheep({ females: 3, femaleGroups: [{ ageMonths: 20, count: 1 }, { ageMonths: 50, count: 1 }, { ageMonths: 79, count: 1 }], keepFemales: false, adultMortalityPct: 0, months: 40 })
    const culls = simulate(i).rows.filter((r) => r.rev.culls > 0).map((r) => r.m)
    expect(culls.length).toBeGreaterThanOrEqual(2)
  })

  it("teskari hisob qaysi muddat va maqsad uchun ekanini qaytaradi", () => {
    const i = sheep({ females: 4, months: 12 })
    const need = solveNeeds(i, { ...DEFAULT_GOAL, type: 'heads', heads: 20, byMonth: 24 }, 0.8, 30)
    expect(need.months).toBe(12)
    expect(need.kind).toBe('heads')
    const none = solveNeeds(i, { ...DEFAULT_GOAL, type: 'profit' }, 0.8, 30)
    expect(none.kind).toBeUndefined()
    expect(none.startCount).toBeUndefined()
  })
})

describe('kiritishni tozalash', () => {
  it("eski rejada yetishmagan maydonlar to'ldiriladi, chegaralar qo'llanadi", async () => {
    const { sanitizeInput, sanitizeGoal } = await import('./sanitize')
    const def = defaultInput('herd', 'sheep', '2026-01')
    const old = { model: 'herd', females: 7.6, pregnant: 20, months: 2, diseaseRiskPct: 300, salePricePerKg: 50_000 } as never
    const s = sanitizeInput(old, def) as HerdInput
    expect(s.females).toBe(8)
    expect(s.pregnant).toBe(8)
    expect(s.months).toBe(6)
    expect(s.diseaseRiskPct).toBe(100)
    expect(s.litterSize).toBe((def as HerdInput).litterSize)
    expect(Number.isFinite(simulate(s).rows.at(-1)!.cash)).toBe(true)
    expect(sanitizeGoal({ type: 'xyz' as never }).type).toBe('profit')
  })
})
