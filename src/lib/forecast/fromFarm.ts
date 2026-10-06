import type { Farmx } from '../../state/farm'
import type { ID } from '../../db/types'
import { FEED_CATEGORY_KEYS } from '../../db/seed'
import { addDays, ageMonths, diffDays, today } from '../dates'
import { priceHistory, priceStats } from '../calc/priceHistory'
import type { ForecastInput } from './types'

/** Qaysi maydon fermaning qaysi ma'lumotidan olingani (foydalanuvchiga ko'rsatish uchun) */
export type FarmSource =
  | 'herd' | 'pregnant' | 'young' | 'lastSale' | 'feedPrice' | 'vet' | 'labor' | 'other' | 'purchase'
  | 'milk' | 'wool' | 'eggs' | 'honey' | 'pnl'

export interface FarmImport {
  patch: Partial<ForecastInput>
  sources: Partial<Record<string, FarmSource>>
}

const VET_CATS = ['ex_vet', 'ex_medicine', 'ex_vaccine']
const LABOR_CATS = ['ex_labor']
const OTHER_CATS = ['ex_electricity', 'ex_water', 'ex_fuel', 'ex_rent', 'ex_transport', 'ex_bedding', 'ex_insurance', 'ex_other', 'ex_tpl_phone', 'ex_tpl_security']

/** Fermaning haqiqiy ma'lumotlaridan prognoz uchun boshlang'ich qiymatlar */
export function importFromFarm(f: Farmx, speciesId: ID, input: ForecastInput, includePast: boolean): FarmImport {
  const patch: Record<string, unknown> = {}
  const sources: Record<string, FarmSource> = {}
  const set = (k: string, v: unknown, src: FarmSource) => {
    if (v === undefined || v === null || (typeof v === 'number' && !(v > 0))) return
    patch[k] = v
    sources[k] = src
  }
  const t = today()
  const halfYear = addDays(t, -182)
  const year = addDays(t, -365)
  const sumExp = (cats: string[], from: string) =>
    f.expenses.filter((e) => cats.includes(e.categoryId) && e.date >= from).reduce((s, e) => s + e.amount, 0)
  const unitPriceOf = (categoryId: string, unit?: string) => {
    const st = priceStats(priceHistory(f.incomes, { categoryId }))
    return st?.unit && (!unit || st.unit === unit) ? st.last.unitPrice : undefined
  }

  const heads = f.headsBySpecies.get(speciesId) ?? 0
  const sale = f.lastSaleOf(speciesId)

  // Umumiy: ish haqi, boshqa xarajatlar — oxirgi 6 oy o'rtachasi
  set('laborMonth', Math.round(sumExp(LABOR_CATS, halfYear) / 6), 'labor')
  set('otherMonth', Math.round(sumExp(OTHER_CATS, halfYear) / 6), 'other')
  const allHeads = [...f.headsBySpecies.values()].reduce((a, b) => a + b, 0)
  if (allHeads > 0) set('vetPerHeadYear', Math.round(sumExp(VET_CATS, year) / allHeads), 'vet')

  // Yem narxi: ombordagi o'rtacha narx (kg), bo'lmasa oxirgi yem xaridi
  const kgItems = f.feedItems.filter((x) => x.unit === 'kg' && x.avgPrice > 0)
  let feedPrice = kgItems.length ? kgItems.reduce((s, x) => s + x.avgPrice, 0) / kgItems.length : undefined
  if (!feedPrice) {
    const feedCats = f.categories.filter((c) => c.kind === 'expense' && c.key && FEED_CATEGORY_KEYS.includes(c.key)).map((c) => c.id)
    const pts = feedCats.flatMap((id) => priceHistory(f.expenses, { categoryId: id })).filter((p) => p.unit === 'kg' && p.unitPrice)
    pts.sort((a, b) => b.date.localeCompare(a.date))
    feedPrice = pts[0]?.unitPrice
  }

  // Oxirgi hayvon sotib olish narxi (shu tur)
  const purchase = f.expenses
    .filter((e) => e.categoryId === 'ex_purchase' && e.scope === 'animal' && f.animalMap.get(e.targetId ?? '')?.speciesId === speciesId)
    .sort((a, b) => b.date.localeCompare(a.date))[0]

  if (includePast) {
    const pnl = f.incomes.reduce((s, e) => s + e.amount, 0) - f.expenses.reduce((s, e) => s + e.amount, 0)
    patch.startCash = Math.round(pnl)
    sources.startCash = 'pnl'
  }

  switch (input.model) {
    case 'herd': {
      const sp = f.speciesMap.get(speciesId)
      // bo'rdoqi guruhidagilar ko'paytirish podasiga kirmaydi (ular sotish uchun boqiladi)
      const fattening = new Set(f.groups.filter((g) => g.purpose === 'fattening').map((g) => g.id))
      const animals = f.activeAnimals.filter((a) => a.speciesId === speciesId && !(a.groupId && fattening.has(a.groupId)))
      const mature = (a: (typeof animals)[number]) => !a.birthDate || ageMonths(a.birthDate) >= input.maturityMonths
      const femalesAdult = animals.filter((a) => a.sex === 'f' && mature(a))
      const malesAdult = animals.filter((a) => a.sex === 'm' && mature(a))
      if (animals.length) {
        patch.buyStart = false
        sources.buyStart = 'herd'
        patch.females = femalesAdult.length
        patch.males = malesAdult.length
        sources.females = 'herd'
        sources.males = 'herd'
        const ages = femalesAdult.filter((a) => a.birthDate).map((a) => ageMonths(a.birthDate!))
        const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : input.femaleAgeMonths
        if (ages.length) set('femaleAgeMonths', avgAge, 'herd')
        // har bir onaning yoshi (noma'lumlari — o'rtacha yosh)
        const byFemaleAge = new Map<number, number>()
        for (const a of femalesAdult) {
          const age = a.birthDate ? ageMonths(a.birthDate) : avgAge
          byFemaleAge.set(age, (byFemaleAge.get(age) ?? 0) + 1)
        }
        patch.femaleGroups = [...byFemaleAge.entries()].map(([ageMonths, count]) => ({ ageMonths, count }))
        // ona soni chegarasi podangizdan kam bo'lmasin
        if (femalesAdult.length > input.maxBreedingFemales) patch.maxBreedingFemales = femalesAdult.length
        // yoshlar yoshi bo'yicha
        const byAge = new Map<number, { females: number; males: number }>()
        for (const a of animals) {
          if (mature(a) || !a.birthDate) continue
          const age = ageMonths(a.birthDate)
          const c = byAge.get(age) ?? { females: 0, males: 0 }
          if (a.sex === 'f') c.females++
          else c.males++
          byAge.set(age, c)
        }
        patch.young = [...byAge.entries()].sort((a, b) => a[0] - b[0]).map(([ageMonths, c]) => ({ ageMonths, ...c }))
        if (byAge.size) sources.young = 'young'
        // bo'g'ozlar: kutilayotgan tug'ish sanasi bo'yicha
        const pend = f.breedings.filter((b) => b.status === 'pending' && femalesAdult.some((a) => a.id === b.femaleId))
        if (pend.length) {
          patch.pregnant = pend.length
          const dues = pend.map((b) => Math.max(1, Math.ceil(diffDays(t, b.expectedDate) / 30.4)))
          patch.dueInMonths = Math.round(dues.reduce((a, b) => a + b, 0) / dues.length)
          sources.pregnant = 'pregnant'
          sources.dueInMonths = 'pregnant'
        } else patch.pregnant = 0
      } else if (sp?.mode === 'group' && heads > 0) {
        patch.buyStart = false
        patch.females = Math.round(heads * 0.85)
        patch.males = Math.max(1, heads - Math.round(heads * 0.85))
        sources.females = 'herd'
      }
      set('salePricePerKg', sale?.perKg ? Math.round(sale.perKg) : undefined, 'lastSale')
      set('cullPricePerKg', sale?.perKg ? Math.round(sale.perKg) : undefined, 'lastSale')
      set('feedPricePerKg', feedPrice ? Math.round(feedPrice) : undefined, 'feedPrice')
      set('purchasePrice', purchase?.amount, 'purchase')
      set('milkPricePerL', unitPriceOf('in_milk', 'l'), 'milk')
      set('woolPricePerKg', unitPriceOf('in_wool', 'kg'), 'wool')
      break
    }
    case 'batch':
      set('salePricePerKg', sale?.perKg ? Math.round(sale.perKg) : undefined, 'lastSale')
      set('feedPricePerKg', feedPrice ? Math.round(feedPrice) : undefined, 'feedPrice')
      set('unitPrice', purchase?.amount, 'purchase')
      break
    case 'layer':
      set('flockSize', heads, 'herd')
      if (heads > 0) patch.buyStart = false
      set('eggPrice', unitPriceOf('in_eggs', 'dona'), 'eggs')
      set('feedPricePerKg', feedPrice ? Math.round(feedPrice) : undefined, 'feedPrice')
      break
    case 'apiary':
      set('colonies', heads, 'herd')
      if (heads > 0) patch.buyStart = false
      set('honeyPricePerKg', unitPriceOf('in_honey', 'kg'), 'honey')
      break
  }
  return { patch: patch as Partial<ForecastInput>, sources }
}
