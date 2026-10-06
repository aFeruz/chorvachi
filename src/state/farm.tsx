import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type {
  Animal, Birth, Breeding, Category, Expense, Farm, FeedItem, FeedMove, Group, GroupMovement,
  HealthEvent, ID, Income, Production, Ration, Reminder, Species, Weight,
} from '../db/types'
import { allocateCosts, emptyLine, groupHeadsAt, sumLines, type CostLine } from '../lib/calc/costBasis'
import { latestWeight } from '../lib/calc/growth'
import { today } from '../lib/dates'
import { useSettings } from './settings'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SPECIES_SEED } from '../db/seed'

const SPECIES_ORDER = new Map(SPECIES_SEED.map((s, i) => ['sp_' + s.key, i]))
const CAT_ORDER = new Map([
  ...EXPENSE_CATEGORIES.map((c, i) => ['ex_' + c.key, i] as const),
  ...INCOME_CATEGORIES.map((c, i) => ['in_' + c.key, i] as const),
])

export interface FarmData {
  farm?: Farm
  farms: Farm[]
  species: Species[]
  categories: Category[]
  groups: Group[]
  movements: GroupMovement[]
  animals: Animal[]
  expenses: Expense[]
  incomes: Income[]
  weights: Weight[]
  breedings: Breeding[]
  births: Birth[]
  production: Production[]
  feedItems: FeedItem[]
  feedMoves: FeedMove[]
  rations: Ration[]
  health: HealthEvent[]
  reminders: Reminder[]
}

export interface Farmx extends FarmData {
  speciesMap: Map<ID, Species>
  catMap: Map<ID, Category>
  groupMap: Map<ID, Group>
  animalMap: Map<ID, Animal>
  activeAnimals: Animal[]
  /** tannarx: animal.id yoki guruh-rejimidagi group.id bo'yicha */
  costs: Map<ID, CostLine>
  unallocated: number
  costOf: (id: ID) => CostLine
  groupCost: (g: Group) => CostLine
  isGroupMode: (g: Group) => boolean
  headsOf: (g: Group, date?: string) => number
  weightOf: (animalId: ID) => number | undefined
  groupWeightOf: (groupId: ID) => number | undefined
  /** Jami faol bosh soni tur bo'yicha */
  headsBySpecies: Map<ID, number>
  /** Joriy bozor narxi bo'yicha poda qiymati */
  herdValue: number
  valueOfAnimal: (a: Animal) => number | undefined
  /** Shu turdagi oxirgi tirik sotuvingiz: 1 kg narxi va sanasi */
  lastSaleOf: (speciesId: ID) => { perKg: number; date: string } | undefined
  /** 1 kg tirik vazn narxi: qo'lda kiritilgan bozor narxi, bo'lmasa oxirgi sotuv narxi */
  marketPerKg: (speciesId: ID) => number | undefined
}

const FarmCtx = createContext<Farmx | null>(null)

async function loadAll(farmId: string): Promise<FarmData> {
  const byFarm = <T,>(t: { where: (k: string) => { equals: (v: string) => { toArray: () => Promise<T[]> } } }) =>
    t.where('farmId').equals(farmId).toArray()
  const [farms, species, categories, groups, movements, animals, expenses, incomes, weights, breedings, births,
    production, feedItems, feedMoves, rations, health, reminders] = await Promise.all([
    db.farms.toArray(),
    db.species.toArray(),
    db.categories.toArray(),
    byFarm<Group>(db.groups),
    byFarm<GroupMovement>(db.movements),
    byFarm<Animal>(db.animals),
    byFarm<Expense>(db.expenses),
    byFarm<Income>(db.incomes),
    byFarm<Weight>(db.weights),
    byFarm<Breeding>(db.breedings),
    byFarm<Birth>(db.births),
    byFarm<Production>(db.production),
    byFarm<FeedItem>(db.feedItems),
    byFarm<FeedMove>(db.feedMoves),
    byFarm<Ration>(db.rations),
    byFarm<HealthEvent>(db.health),
    byFarm<Reminder>(db.reminders),
  ])
  const byDateDesc = <T extends { date: string; createdAt: number }>(a: T, b: T) =>
    b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  return {
    farm: farms.find((f) => f.id === farmId),
    farms,
    species: species.sort((a, b) => (SPECIES_ORDER.get(a.id) ?? 99) - (SPECIES_ORDER.get(b.id) ?? 99)),
    categories: categories.sort((a, b) => (CAT_ORDER.get(a.id) ?? 99) - (CAT_ORDER.get(b.id) ?? 99)),
    groups,
    movements,
    animals: animals.sort((a, b) => a.tag.localeCompare(b.tag, undefined, { numeric: true })),
    expenses: expenses.sort(byDateDesc),
    incomes: incomes.sort(byDateDesc),
    weights,
    breedings,
    births,
    production: production.sort(byDateDesc),
    feedItems,
    feedMoves,
    rations,
    health,
    reminders,
  }
}

export function FarmProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const { farmId, settings } = useSettings()
  const data = useLiveQuery(() => loadAll(farmId), [farmId])

  const value = useMemo<Farmx | null>(() => {
    if (!data) return null
    const speciesMap = new Map(data.species.map((s) => [s.id, s]))
    const catMap = new Map(data.categories.map((c) => [c.id, c]))
    const groupMap = new Map(data.groups.map((g) => [g.id, g]))
    const animalMap = new Map(data.animals.map((a) => [a.id, a]))
    const isGroupMode = (g: Group) => speciesMap.get(g.speciesId)?.mode === 'group'
    const { units, unallocated } = allocateCosts({
      animals: data.animals,
      groups: data.groups,
      species: data.species,
      movements: data.movements,
      expenses: data.expenses,
    })
    const costOf = (id: ID) => units.get(id) ?? emptyLine()
    const activeAnimals = data.animals.filter((a) => a.status === 'active')
    const groupCost = (g: Group) =>
      isGroupMode(g) ? costOf(g.id) : sumLines(data.animals.filter((a) => a.groupId === g.id).map((a) => units.get(a.id)))
    const headsOf = (g: Group, date = today()) =>
      isGroupMode(g)
        ? groupHeadsAt(data.movements, g.id, date)
        : data.animals.filter((a) => a.groupId === g.id && a.status === 'active').length

    const wByAnimal = new Map<ID, { date: string; kg: number }[]>()
    const wByGroup = new Map<ID, { date: string; kg: number }[]>()
    for (const w of data.weights) {
      const m = w.animalId ? wByAnimal : wByGroup
      const k = (w.animalId ?? w.groupId)!
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(w)
    }
    const weightOf = (id: ID) => {
      const lw = latestWeight(wByAnimal.get(id) ?? [])
      if (lw) return lw.kg
      const a = animalMap.get(id)
      return a?.purchaseWeight
    }
    const groupWeightOf = (id: ID) => latestWeight(wByGroup.get(id) ?? [])?.kg

    const headsBySpecies = new Map<ID, number>()
    for (const a of activeAnimals) headsBySpecies.set(a.speciesId, (headsBySpecies.get(a.speciesId) ?? 0) + 1)
    for (const g of data.groups)
      if (isGroupMode(g) && g.status === 'active')
        headsBySpecies.set(g.speciesId, (headsBySpecies.get(g.speciesId) ?? 0) + headsOf(g))

    // Har bir tur bo'yicha oxirgi tirik sotuv narxi (1 kg)
    const lastSale = new Map<ID, { perKg: number; date: string }>()
    for (const inc of data.incomes) {
      if (inc.categoryId !== 'in_animal_sale' || !inc.weightKg) continue
      const sid = inc.animalIds?.length ? animalMap.get(inc.animalIds[0])?.speciesId : groupMap.get(inc.targetId ?? '')?.speciesId
      if (!sid) continue
      const prev = lastSale.get(sid)
      if (!prev || inc.date > prev.date) lastSale.set(sid, { perKg: inc.amount / inc.weightKg, date: inc.date })
    }
    const lastSaleOf = (sid: ID) => lastSale.get(sid)
    const marketPerKg = (sid: ID) => settings.marketPrices[sid]?.perKg || lastSale.get(sid)?.perKg

    const valueOfAnimal = (a: Animal) => {
      const perKg = marketPerKg(a.speciesId)
      const w = weightOf(a.id)
      if (perKg && w) return perKg * w
      const perHead = settings.marketPrices[a.speciesId]?.perHead
      if (perHead) return perHead
      return undefined
    }
    let herdValue = 0
    for (const a of activeAnimals) herdValue += valueOfAnimal(a) ?? 0
    for (const g of data.groups) {
      if (!isGroupMode(g) || g.status !== 'active') continue
      const perKg = marketPerKg(g.speciesId)
      const perHead = settings.marketPrices[g.speciesId]?.perHead
      const heads = headsOf(g)
      const w = groupWeightOf(g.id)
      if (perKg && w) herdValue += perKg * w * heads
      else if (perHead) herdValue += perHead * heads
    }

    return {
      ...data,
      speciesMap, catMap, groupMap, animalMap, activeAnimals,
      costs: units, unallocated, costOf, groupCost, isGroupMode, headsOf, weightOf, groupWeightOf,
      headsBySpecies, herdValue, valueOfAnimal, lastSaleOf, marketPerKg,
    }
  }, [data, settings.marketPrices])

  if (!value) return <>{fallback}</>
  return <FarmCtx.Provider value={value}>{children}</FarmCtx.Provider>
}

export function useFarm(): Farmx {
  const c = useContext(FarmCtx)
  if (!c) throw new Error('FarmProvider missing')
  return c
}
