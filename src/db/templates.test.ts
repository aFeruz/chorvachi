import { describe, expect, it } from 'vitest'
import { COMMON_TEMPLATE, TEMPLATES, tplCategoryId } from './templates'
import { SPECIES_SEED } from './seed'

describe('templates', () => {
  it('har bir standart tur uchun shablon bor', () => {
    for (const s of SPECIES_SEED) expect(TEMPLATES[s.key], s.key).toBeDefined()
  })

  it("bir xil kalitli kategoriyalar bir xil nomga ega (takror qo'shilmaydi)", () => {
    const byId = new Map<string, string>()
    const all = [
      ...Object.values(TEMPLATES).flatMap((t) => [
        ...t.expense.map((c) => ['expense', c] as const),
        ...t.income.map((c) => ['income', c] as const),
      ]),
      ...COMMON_TEMPLATE.expense.map((c) => ['expense', c] as const),
      ...COMMON_TEMPLATE.income.map((c) => ['income', c] as const),
    ]
    for (const [kind, c] of all) {
      const id = tplCategoryId(kind, c.key)
      if (byId.has(id)) expect(byId.get(id), id).toBe(c.name.uz)
      byId.set(id, c.name.uz)
      expect(c.name.uz && c.name.ru).toBeTruthy()
    }
  })

  it("ratsion me'yorlari musbat", () => {
    for (const t of Object.values(TEMPLATES))
      for (const f of t.feeds) if (f.perHeadDay !== undefined) expect(f.perHeadDay).toBeGreaterThan(0)
  })
})
