import { describe, expect, it } from 'vitest'
import { allocateCosts, groupHeadsAt } from './costBasis'
import { breakEven, saleResult } from './pricing'
import { adg, holdOrSell } from './growth'
import { pnl } from './pnl'
import { reproStats, expectedBirthDate } from './reproduction'
import { simulate, SIM_DEFAULT, scenarioInput } from './simulator'

const species = [
  { id: 'sheep', lu: 0.15, mode: 'individual' as const },
  { id: 'cow', lu: 1, mode: 'individual' as const },
  { id: 'chick', lu: 0.01, mode: 'group' as const },
]

describe('allocateCosts', () => {
  const animals = [
    { id: 'a1', speciesId: 'sheep', groupId: 'g1', acquiredDate: '2026-01-01' },
    { id: 'a2', speciesId: 'sheep', groupId: 'g1', acquiredDate: '2026-01-01' },
    { id: 'c1', speciesId: 'cow', acquiredDate: '2026-01-01', exitDate: '2026-03-01' },
    { id: 'lamb', speciesId: 'sheep', groupId: 'g1', acquiredDate: '2026-04-01' },
  ]
  const groups = [{ id: 'g1', speciesId: 'sheep' }, { id: 'pg', speciesId: 'chick' }]
  const movements = [{ groupId: 'pg', date: '2026-01-01', type: 'in' as const, count: 100 }]

  it('direct and group expenses', () => {
    const r = allocateCosts({
      animals, groups, species, movements,
      expenses: [
        { id: 'e1', date: '2026-01-05', amount: 1000, categoryId: 'x', scope: 'animal', targetId: 'a1' },
        { id: 'e2', date: '2026-02-01', amount: 600, categoryId: 'x', scope: 'group', targetId: 'g1' },
        // qo'zi 04-01 da tug'ilgan, shuning uchun 05-01 dagi guruh xarajatining 1/3 qismini oladi
        { id: 'e3', date: '2026-05-01', amount: 900, categoryId: 'y', scope: 'group', targetId: 'g1' },
      ],
    })
    expect(r.units.get('a1')!.total).toBeCloseTo(1000 + 300 + 300)
    expect(r.units.get('a2')!.total).toBeCloseTo(600)
    expect(r.units.get('lamb')!.total).toBeCloseTo(300)
    expect(r.units.get('a1')!.direct).toBe(1000)
    expect(r.unallocated).toBe(0)
  })

  it('farm expense weighted by livestock units and presence', () => {
    const r = allocateCosts({
      animals, groups, species, movements,
      expenses: [{ id: 'f', date: '2026-02-01', amount: 2300, categoryId: 'x', scope: 'farm' }],
    })
    // og'irliklar: a1 .15 a2 .15 c1 1 pg 100*.01=1 -> 2.3
    expect(r.units.get('c1')!.total).toBeCloseTo(1000)
    expect(r.units.get('pg')!.total).toBeCloseTo(1000)
    expect(r.units.get('a1')!.total).toBeCloseTo(150)
    expect(r.units.has('lamb')).toBe(false)
  })

  it('unallocated when nobody present', () => {
    const r = allocateCosts({
      animals, groups, species, movements,
      expenses: [{ id: 'f', date: '2025-01-01', amount: 500, categoryId: 'x', scope: 'farm' }],
    })
    expect(r.unallocated).toBe(500)
  })

  it('group heads', () => {
    const mv = [
      ...movements,
      { groupId: 'pg', date: '2026-02-01', type: 'death' as const, count: 5 },
      { groupId: 'pg', date: '2026-03-01', type: 'sold' as const, count: 50 },
    ]
    expect(groupHeadsAt(mv, 'pg', '2026-02-15')).toBe(95)
    expect(groupHeadsAt(mv, 'pg', '2026-03-01')).toBe(45)
  })
})

describe('pricing', () => {
  it('break even per kg', () => {
    const r = breakEven({ cost: 4_800_000, weightKg: 60, dressingPct: 50, targetMarginPct: 20 })
    expect(r.perKgLive).toBe(80_000)
    expect(r.perKgMeat).toBe(160_000)
    expect(r.targetPerHead).toBeCloseTo(5_760_000)
  })
  it('sale result', () => {
    const r = saleResult(5_000_000, 4_000_000)
    expect(r.profit).toBe(1_000_000)
    expect(r.roiPct).toBe(25)
    expect(r.marginPct).toBe(20)
    expect(saleResult(3_000_000, 4_000_000).isLoss).toBe(true)
  })
})

describe('growth', () => {
  it('adg and hold', () => {
    const g = adg([{ date: '2026-01-01', kg: 30 }, { date: '2026-01-31', kg: 39 }])
    expect(g).toBeCloseTo(0.3)
    const h = holdOrSell({ adgKg: 0.3, dailyCost: 10_000, pricePerKgLive: 55_000, days: 30 })
    expect(h.gainKg).toBeCloseTo(9)
    expect(h.net).toBeCloseTo(9 * 55_000 - 300_000)
    expect(h.recommend).toBe('hold')
  })
})

describe('pnl & repro', () => {
  it('pnl monthly', () => {
    const r = pnl(
      [{ date: '2026-01-10', amount: 100, categoryId: 'a' }, { date: '2026-02-10', amount: 50, categoryId: 'b' }],
      [{ date: '2026-02-11', amount: 300, categoryId: 'c' }],
      '2026-01-01', '2026-03-31',
    )
    expect(r.profit).toBe(150)
    expect(r.monthly.map((m) => m.cumulative)).toEqual([-100, 150, 150])
  })
  it('repro', () => {
    expect(expectedBirthDate('2026-01-01', 150)).toBe('2026-05-31')
    const s = reproStats(
      [{ status: 'born', date: '2026-01-01' }, { status: 'failed', date: '2026-01-01' }],
      [{ alive: 2, dead: 0, motherId: 'm1', date: '2026-05-01' }, { alive: 1, dead: 1, motherId: 'm2', date: '2026-05-02' }],
    )
    expect(s.conceptionPct).toBe(50)
    expect(s.yieldPer100).toBe(150)
    expect(s.stillbirthPct).toBe(25)
  })
})

describe('simulator', () => {
  it('runs and scenarios are ordered', () => {
    const base = simulate(SIM_DEFAULT)
    expect(base.rows).toHaveLength(36)
    expect(base.investment).toBe(31 * 3_000_000 + 10_000_000)
    expect(base.soldHeads).toBeGreaterThan(0)
    const bad = simulate(scenarioInput(SIM_DEFAULT, 'bad'))
    const good = simulate(scenarioInput(SIM_DEFAULT, 'good'))
    expect(bad.totalProfit).toBeLessThan(base.totalProfit)
    expect(good.totalProfit).toBeGreaterThan(base.totalProfit)
  })
})
