import Dexie, { type EntityTable } from 'dexie'
import type {
  Animal, Birth, Breeding, Category, Expense, Farm, FeedItem, FeedMove, Group, GroupMovement,
  HealthEvent, Income, KV, Production, Ration, Reminder, Species, Weight,
} from './types'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, SPECIES_SEED } from './seed'

export class ChorvaDB extends Dexie {
  farms!: EntityTable<Farm, 'id'>
  species!: EntityTable<Species, 'id'>
  categories!: EntityTable<Category, 'id'>
  groups!: EntityTable<Group, 'id'>
  movements!: EntityTable<GroupMovement, 'id'>
  animals!: EntityTable<Animal, 'id'>
  expenses!: EntityTable<Expense, 'id'>
  incomes!: EntityTable<Income, 'id'>
  weights!: EntityTable<Weight, 'id'>
  breedings!: EntityTable<Breeding, 'id'>
  births!: EntityTable<Birth, 'id'>
  production!: EntityTable<Production, 'id'>
  feedItems!: EntityTable<FeedItem, 'id'>
  feedMoves!: EntityTable<FeedMove, 'id'>
  rations!: EntityTable<Ration, 'id'>
  health!: EntityTable<HealthEvent, 'id'>
  reminders!: EntityTable<Reminder, 'id'>
  kv!: EntityTable<KV, 'key'>

  constructor(name = 'chorva-hisob') {
    super(name)
    this.version(1).stores({
      farms: 'id',
      species: 'id, key',
      categories: 'id, kind, key',
      groups: 'id, farmId, speciesId, status',
      movements: 'id, farmId, groupId, date',
      animals: 'id, farmId, speciesId, groupId, status, motherId, tag',
      expenses: 'id, farmId, date, categoryId, [scope+targetId]',
      incomes: 'id, farmId, date, categoryId, [scope+targetId]',
      weights: 'id, farmId, animalId, groupId, date',
      breedings: 'id, farmId, femaleId, status, expectedDate',
      births: 'id, farmId, motherId, date',
      production: 'id, farmId, date, type',
      feedItems: 'id, farmId',
      feedMoves: 'id, farmId, feedItemId, date',
      rations: 'id, farmId, feedItemId',
      health: 'id, farmId, date, nextDate',
      reminders: 'id, farmId, date, done',
      kv: 'key',
    })
    this.on('populate', (tx) => {
      tx.table('species').bulkAdd(
        SPECIES_SEED.map((s) => ({ ...s, id: 'sp_' + s.key, builtin: true, enabled: true })),
      )
      tx.table('categories').bulkAdd(
        [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => ({
          ...c,
          id: (c.kind === 'expense' ? 'ex_' : 'in_') + c.key,
          builtin: true,
        })),
      )
    })
  }
}

export const db = new ChorvaDB()

/** Zaxira/eksport uchun barcha jadvallar nomi */
export const TABLES = [
  'farms', 'species', 'categories', 'groups', 'movements', 'animals', 'expenses', 'incomes',
  'weights', 'breedings', 'births', 'production', 'feedItems', 'feedMoves', 'rations', 'health',
  'reminders', 'kv',
] as const

/** Ferma bilan bog'liq jadvallar (fermani o'chirishda tozalanadi) */
export const FARM_TABLES = TABLES.filter((t) => !['farms', 'species', 'categories', 'kv'].includes(t))

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
