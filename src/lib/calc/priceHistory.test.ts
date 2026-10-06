import { describe, expect, it } from 'vitest'
import { priceDiff, priceHistory, priceStats } from './priceHistory'

const e = (id: string, date: string, amount: number, qty?: number, unit?: string, extra = {}) => ({
  id, date, createdAt: 0, categoryId: 'ex_hay', amount, qty, unit, ...extra,
})

describe('price history', () => {
  const entries = [
    e('1', '2026-01-10', 700_000, 20, 'qop'), // 35 000 / qop
    e('2', '2026-03-05', 640_000, 20, 'qop'), // 32 000 / qop
    e('3', '2026-05-01', 380_000, 10, 'qop'), // 38 000 / qop
    { ...e('x', '2026-06-01', 999, 1, 'kg'), categoryId: 'ex_vet' },
  ]

  it('oxirgi narx va statistikalar', () => {
    const s = priceStats(priceHistory(entries, { categoryId: 'ex_hay' }))!
    expect(s.last.unitPrice).toBe(38_000)
    expect(s.unit).toBe('qop')
    expect(s.count).toBe(3)
    expect(s.min).toBe(32_000)
    expect(s.max).toBe(38_000)
    expect(s.avg).toBeCloseTo(35_000)
    expect(s.trendPct).toBeCloseTo(18.75) // 32 000 -> 38 000
  })

  it('tahrirlanayotgan yozuv hisobga olinmaydi', () => {
    const s = priceStats(priceHistory(entries, { categoryId: 'ex_hay', excludeId: '3' }))!
    expect(s.last.unitPrice).toBe(32_000)
  })

  it('yem tanlansa, faqat o\'sha yem', () => {
    const list = [e('a', '2026-01-01', 100_000, 10, 'kg', { feedItemId: 'arpa' }), e('b', '2026-02-01', 50_000, 10, 'kg', { feedItemId: 'beda' })]
    expect(priceStats(priceHistory(list, { categoryId: 'ex_hay', feedItemId: 'arpa' }))!.last.unitPrice).toBe(10_000)
  })

  it('miqdorsiz xaridlar summa bo\'yicha', () => {
    const s = priceStats(priceHistory([e('a', '2026-01-01', 200_000), e('b', '2026-02-01', 250_000)], { categoryId: 'ex_hay' }))!
    expect(s.unit).toBeUndefined()
    expect(s.last.amount).toBe(250_000)
    expect(s.trendPct).toBeCloseTo(25)
  })

  it('tarix yo\'q', () => {
    expect(priceStats(priceHistory(entries, { categoryId: 'ex_none' }))).toBeUndefined()
  })

  it('farq', () => {
    expect(priceDiff(37_000, 35_000)).toEqual({ diff: 2_000, pct: (2_000 / 35_000) * 100 })
  })
})
