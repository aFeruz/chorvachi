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
  it("qoplanish oyi: naqd pul nolga yetgan birinchi oy", () => {
    const rows = [-10, -5, 2, 4].map((cash, k) => ({ m: k + 1, cash, wealth: cash, net: 1, heads: 0, core: 0, born: 0, rev: { animals: 0, culls: 0 } })) as never
    expect(milestones(rows, DEFAULT_GOAL, -12).payback).toBe(3)
    expect(milestones(rows, DEFAULT_GOAL, 5).payback).toBe(0)
  })

  it("bosh soni maqsadi faqat barqaror bo'lsa hisoblanadi", () => {
    const heads = [5, 11, 11, 7, 7, 7, 10, 10, 10, 10, 10, 10, 10]
    const rows = heads.map((h, k) => ({ m: k + 1, heads: h, core: h, cash: 0, wealth: 0, net: 0, born: 0, rev: { animals: 0, culls: 0 } })) as never
    expect(milestones(rows, { ...DEFAULT_GOAL, heads: 10 }, 0).heads).toBe(7)
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
