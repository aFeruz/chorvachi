import { db, defaultMarketPrices, FARM_TABLES, TABLES, uid } from './db'
import type {
  Animal, AnimalStatus, Expense, HealthEvent, ID, Income, MovementType, Sex,
} from './types'
import { loadSettings, saveSettings } from '../state/settings'
import { addDays, today } from '../lib/dates'

const now = () => Date.now()

/* ---------------- Ferma ---------------- */

export async function createFarm(name: string, address?: string): Promise<ID> {
  const id = uid()
  await db.farms.add({ id, name, address, createdAt: now() })
  const s = await loadSettings()
  await saveSettings({
    activeFarmId: id,
    marketPrices: Object.keys(s.marketPrices).length ? s.marketPrices : defaultMarketPrices(),
  })
  return id
}

export async function deleteFarm(id: ID) {
  await db.transaction('rw', [...FARM_TABLES, 'farms'].map((t) => db.table(t)), async () => {
    for (const t of FARM_TABLES) await db.table(t).where('farmId').equals(id).delete()
    await db.farms.delete(id)
  })
  const rest = await db.farms.toArray()
  await saveSettings({ activeFarmId: rest[0]?.id })
}

/* ---------------- Hayvonlar ---------------- */

export interface AnimalInput {
  tag: string
  name?: string
  speciesId: ID
  sex: Sex
  breed?: string
  birthDate?: string
  origin: 'bought' | 'born'
  acquiredDate: string
  purchaseWeight?: number
  motherId?: ID
  fatherId?: ID
  groupId?: ID
  note?: string
  photo?: string
}

export async function saveAnimal(farmId: ID, input: AnimalInput, purchasePrice: number, id?: ID): Promise<ID> {
  return db.transaction('rw', db.animals, db.expenses, db.weights, async () => {
    const existing = id ? await db.animals.get(id) : undefined
    const animalId = existing?.id ?? uid()
    let purchaseExpenseId = existing?.purchaseExpenseId
    if (purchasePrice > 0) {
      const exp: Expense = {
        id: purchaseExpenseId ?? uid(),
        farmId,
        date: input.acquiredDate,
        categoryId: 'ex_purchase',
        amount: Math.round(purchasePrice),
        scope: 'animal',
        targetId: animalId,
        note: input.tag,
        createdAt: now(),
      }
      await db.expenses.put(exp)
      purchaseExpenseId = exp.id
    } else if (purchaseExpenseId) {
      await db.expenses.delete(purchaseExpenseId)
      purchaseExpenseId = undefined
    }
    if (existing) {
      await db.animals.update(animalId, { ...input, purchaseExpenseId })
    } else {
      await db.animals.add({ ...input, id: animalId, farmId, status: 'active', purchaseExpenseId, createdAt: now() })
      if (input.purchaseWeight)
        await db.weights.add({ id: uid(), farmId, animalId, date: input.acquiredDate, kg: input.purchaseWeight, createdAt: now() })
    }
    return animalId
  })
}

export async function deleteAnimal(id: ID) {
  await db.transaction('rw', [db.animals, db.expenses, db.weights, db.breedings, db.health, db.incomes], async () => {
    await db.expenses.where('[scope+targetId]').equals(['animal', id]).delete()
    await db.weights.where('animalId').equals(id).delete()
    await db.breedings.where('femaleId').equals(id).delete()
    await db.health.filter((h) => h.scope === 'animal' && h.targetId === id).delete()
    await db.animals.delete(id)
  })
}

export async function setAnimalExit(id: ID, status: AnimalStatus, date?: string, note?: string) {
  if (status === 'active') await db.animals.update(id, { status, exitDate: undefined, exitNote: undefined })
  else await db.animals.update(id, { status, exitDate: date ?? today(), exitNote: note })
}

export async function moveAnimalsToGroup(ids: ID[], groupId?: ID) {
  await db.animals.where('id').anyOf(ids).modify({ groupId })
}

/* ---------------- Sotish ---------------- */

export interface SaleInput {
  farmId: ID
  date: string
  amount: number
  categoryId: ID
  animalIds?: ID[]
  groupId?: ID
  headCount?: number
  weightKg?: number
  extraCost?: number
  note?: string
  slaughter?: boolean
}

export async function recordSale(i: SaleInput): Promise<ID> {
  return db.transaction('rw', [db.incomes, db.animals, db.expenses, db.movements], async () => {
    const incomeId = uid()
    const inc: Income = {
      id: incomeId,
      farmId: i.farmId,
      date: i.date,
      categoryId: i.categoryId,
      amount: Math.round(i.amount),
      scope: i.animalIds?.length === 1 ? 'animal' : i.groupId ? 'group' : 'farm',
      targetId: i.animalIds?.length === 1 ? i.animalIds[0] : i.groupId,
      animalIds: i.animalIds,
      headCount: i.headCount,
      weightKg: i.weightKg,
      note: i.note,
      createdAt: now(),
    }
    await db.incomes.add(inc)
    const status: AnimalStatus = i.slaughter ? 'slaughtered' : 'sold'
    if (i.animalIds?.length) {
      for (const aid of i.animalIds)
        await db.animals.update(aid, { status, exitDate: i.date, saleIncomeId: incomeId })
      if (i.extraCost && i.extraCost > 0) {
        const per = i.extraCost / i.animalIds.length
        for (const aid of i.animalIds)
          await db.expenses.add({
            id: uid(), farmId: i.farmId, date: i.date, categoryId: i.slaughter ? 'ex_slaughter' : 'ex_market',
            amount: Math.round(per), scope: 'animal', targetId: aid, note: 'sale:' + incomeId, createdAt: now(),
          })
      }
    } else if (i.groupId && i.headCount) {
      await db.movements.add({
        id: uid(), farmId: i.farmId, groupId: i.groupId, date: i.date, type: i.slaughter ? 'slaughter' : 'sold',
        count: i.headCount, linkedIncomeId: incomeId, createdAt: now(),
      })
      if (i.extraCost && i.extraCost > 0)
        await db.expenses.add({
          id: uid(), farmId: i.farmId, date: i.date, categoryId: i.slaughter ? 'ex_slaughter' : 'ex_market',
          amount: Math.round(i.extraCost), scope: 'group', targetId: i.groupId, note: 'sale:' + incomeId, createdAt: now(),
        })
    }
    return incomeId
  })
}

/* ---------------- Daromad / xarajat ---------------- */

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt'>

export async function saveExpense(input: ExpenseInput, id?: ID): Promise<ID> {
  return db.transaction('rw', [db.expenses, db.feedMoves, db.feedItems], async () => {
    const old = id ? await db.expenses.get(id) : undefined
    const eid = old?.id ?? uid()
    await db.expenses.put({ ...input, amount: Math.round(input.amount), id: eid, createdAt: old?.createdAt ?? now() })
    // yem ombori bilan bog'lash
    const oldMove = await db.feedMoves.filter((m) => m.expenseId === eid).first()
    if (oldMove && (!input.feedItemId || !input.qty)) {
      await db.feedMoves.delete(oldMove.id)
      await recomputeFeed(oldMove.feedItemId)
    }
    if (input.feedItemId && input.qty && input.qty > 0) {
      const move = {
        id: oldMove?.id ?? uid(),
        farmId: input.farmId,
        feedItemId: input.feedItemId,
        date: input.date,
        qty: input.qty,
        price: input.amount / input.qty,
        expenseId: eid,
        createdAt: oldMove?.createdAt ?? now(),
      }
      await db.feedMoves.put(move)
      await recomputeFeed(input.feedItemId)
      if (oldMove && oldMove.feedItemId !== input.feedItemId) await recomputeFeed(oldMove.feedItemId)
    }
    return eid
  })
}

export async function deleteExpense(id: ID) {
  await db.transaction('rw', [db.expenses, db.feedMoves, db.feedItems, db.animals, db.health], async () => {
    const moves = await db.feedMoves.filter((m) => m.expenseId === id).toArray()
    for (const m of moves) {
      await db.feedMoves.delete(m.id)
      await recomputeFeed(m.feedItemId)
    }
    await db.animals.filter((a) => a.purchaseExpenseId === id).modify({ purchaseExpenseId: undefined })
    await db.health.filter((h) => h.expenseId === id).modify({ expenseId: undefined, cost: undefined })
    await db.expenses.delete(id)
  })
}

export type IncomeInput = Omit<Income, 'id' | 'createdAt'>

export async function saveIncome(input: IncomeInput, id?: ID): Promise<ID> {
  const old = id ? await db.incomes.get(id) : undefined
  const iid = old?.id ?? uid()
  await db.incomes.put({ ...input, amount: Math.round(input.amount), id: iid, createdAt: old?.createdAt ?? now() })
  return iid
}

/** Daromadni o'chirish: sotilgan hayvonlar yana "faol" holatga qaytadi */
export async function deleteIncome(id: ID) {
  await db.transaction('rw', [db.incomes, db.animals, db.movements, db.expenses], async () => {
    const inc = await db.incomes.get(id)
    if (!inc) return
    if (inc.animalIds?.length)
      for (const aid of inc.animalIds) {
        const a = await db.animals.get(aid)
        if (a?.saleIncomeId === id)
          await db.animals.update(aid, { status: 'active', exitDate: undefined, saleIncomeId: undefined })
      }
    await db.movements.filter((m) => m.linkedIncomeId === id).delete()
    await db.expenses.filter((e) => e.note === 'sale:' + id).delete()
    await db.incomes.delete(id)
  })
}

/* ---------------- Guruhlar ---------------- */

export async function addMovement(p: {
  farmId: ID
  groupId: ID
  date: string
  type: MovementType
  count: number
  amount?: number
  note?: string
}) {
  await db.transaction('rw', [db.movements, db.expenses], async () => {
    let linkedExpenseId: ID | undefined
    if (p.type === 'in' && p.amount && p.amount > 0) {
      linkedExpenseId = uid()
      await db.expenses.add({
        id: linkedExpenseId, farmId: p.farmId, date: p.date, categoryId: 'ex_purchase', amount: Math.round(p.amount),
        qty: p.count, unit: 'bosh', scope: 'group', targetId: p.groupId, note: p.note, createdAt: now(),
      })
    }
    await db.movements.add({
      id: uid(), farmId: p.farmId, groupId: p.groupId, date: p.date, type: p.type, count: p.count, note: p.note,
      linkedExpenseId, createdAt: now(),
    })
  })
}

export async function deleteMovement(id: ID) {
  await db.transaction('rw', [db.movements, db.expenses, db.incomes], async () => {
    const m = await db.movements.get(id)
    if (!m) return
    if (m.linkedExpenseId) await db.expenses.delete(m.linkedExpenseId)
    if (m.linkedIncomeId) await db.incomes.delete(m.linkedIncomeId)
    await db.movements.delete(id)
  })
}

export async function deleteGroup(id: ID) {
  await db.transaction('rw', [db.groups, db.movements, db.animals, db.expenses, db.weights, db.rations], async () => {
    await db.movements.where('groupId').equals(id).delete()
    await db.weights.where('groupId').equals(id).delete()
    await db.rations.filter((r) => r.scope === 'group' && r.targetId === id).delete()
    await db.expenses.where('[scope+targetId]').equals(['group', id]).delete()
    await db.animals.where('groupId').equals(id).modify({ groupId: undefined })
    await db.groups.delete(id)
  })
}

/* ---------------- Ko'payish ---------------- */

export async function addBreeding(p: {
  farmId: ID
  femaleId: ID
  maleId?: ID
  maleNote?: string
  date: string
  method: 'natural' | 'ai'
  gestationDays: number
  note?: string
}): Promise<ID> {
  const id = uid()
  await db.breedings.add({
    id, farmId: p.farmId, femaleId: p.femaleId, maleId: p.maleId, maleNote: p.maleNote, date: p.date,
    method: p.method, expectedDate: addDays(p.date, p.gestationDays), status: 'pending', note: p.note, createdAt: now(),
  })
  return id
}

export interface KidInput {
  tag: string
  sex: Sex
  weight?: number
}

/** Tug'ish: tirik bolalar avtomatik podaga qo'shiladi */
export async function recordBirth(p: {
  farmId: ID
  motherId: ID
  breedingId?: ID
  date: string
  kids: KidInput[]
  dead: number
  note?: string
}): Promise<ID[]> {
  return db.transaction('rw', [db.animals, db.births, db.breedings, db.weights], async () => {
    const mother = await db.animals.get(p.motherId)
    if (!mother) throw new Error('mother not found')
    const breeding = p.breedingId ? await db.breedings.get(p.breedingId) : undefined
    const birthId = uid()
    const kidIds: ID[] = []
    for (const k of p.kids) {
      const id = uid()
      kidIds.push(id)
      const kid: Animal = {
        id, farmId: p.farmId, tag: k.tag, speciesId: mother.speciesId, sex: k.sex, breed: mother.breed,
        birthDate: p.date, origin: 'born', acquiredDate: p.date, motherId: mother.id, fatherId: breeding?.maleId,
        birthId, groupId: mother.groupId, status: 'active', createdAt: now(),
      }
      await db.animals.add(kid)
      if (k.weight) await db.weights.add({ id: uid(), farmId: p.farmId, animalId: id, date: p.date, kg: k.weight, createdAt: now() })
    }
    await db.births.add({
      id: birthId, farmId: p.farmId, motherId: p.motherId, breedingId: p.breedingId, date: p.date,
      alive: p.kids.length, dead: p.dead, kidIds, note: p.note, createdAt: now(),
    })
    if (breeding) await db.breedings.update(breeding.id, { status: 'born', birthId })
    return kidIds
  })
}

export async function deleteBirth(id: ID) {
  await db.transaction('rw', [db.animals, db.births, db.breedings, db.weights, db.expenses], async () => {
    const b = await db.births.get(id)
    if (!b) return
    for (const k of b.kidIds) {
      await db.weights.where('animalId').equals(k).delete()
      await db.expenses.where('[scope+targetId]').equals(['animal', k]).delete()
      await db.animals.delete(k)
    }
    if (b.breedingId) await db.breedings.update(b.breedingId, { status: 'pending', birthId: undefined })
    await db.births.delete(id)
  })
}

/** Keyingi bo'sh raqamni taklif qilish: "Q-12" -> "Q-13" */
export function nextTag(tags: string[], prefix = ''): string {
  let max = 0
  for (const t of tags) {
    if (prefix && !t.startsWith(prefix)) continue
    const m = t.match(/(\d+)(?!.*\d)/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return prefix + (max + 1)
}

/* ---------------- Yem ombori ---------------- */

export async function recomputeFeed(feedItemId: ID) {
  const moves = await db.feedMoves.where('feedItemId').equals(feedItemId).toArray()
  const stock = moves.reduce((s, m) => s + m.qty, 0)
  const ins = moves.filter((m) => m.qty > 0 && m.price != null)
  const inQty = ins.reduce((s, m) => s + m.qty, 0)
  const avgPrice = inQty > 0 ? ins.reduce((s, m) => s + m.qty * (m.price ?? 0), 0) / inQty : 0
  await db.feedItems.update(feedItemId, { stock, avgPrice })
}

export async function addFeedMove(p: { farmId: ID; feedItemId: ID; date: string; qty: number; price?: number; note?: string }) {
  await db.transaction('rw', [db.feedMoves, db.feedItems], async () => {
    await db.feedMoves.add({ id: uid(), ...p, createdAt: now() })
    await recomputeFeed(p.feedItemId)
  })
}

export async function deleteFeedMove(id: ID) {
  await db.transaction('rw', [db.feedMoves, db.feedItems, db.expenses], async () => {
    const m = await db.feedMoves.get(id)
    if (!m) return
    await db.feedMoves.delete(id)
    if (m.expenseId) await db.expenses.update(m.expenseId, { feedItemId: undefined })
    await recomputeFeed(m.feedItemId)
  })
}

export async function deleteFeedItem(id: ID) {
  await db.transaction('rw', [db.feedMoves, db.feedItems, db.rations, db.expenses], async () => {
    await db.feedMoves.where('feedItemId').equals(id).delete()
    await db.rations.where('feedItemId').equals(id).delete()
    await db.expenses.filter((e) => e.feedItemId === id).modify({ feedItemId: undefined })
    await db.feedItems.delete(id)
  })
}

/* ---------------- Sog'liq ---------------- */

const HEALTH_CAT: Record<HealthEvent['type'], ID> = {
  vaccine: 'ex_vaccine', treatment: 'ex_medicine', deworm: 'ex_medicine', checkup: 'ex_vet', other: 'ex_vet',
}

export async function saveHealth(input: Omit<HealthEvent, 'id' | 'createdAt' | 'expenseId'>, id?: ID) {
  await db.transaction('rw', [db.health, db.expenses], async () => {
    const old = id ? await db.health.get(id) : undefined
    const hid = old?.id ?? uid()
    let expenseId = old?.expenseId
    if (input.cost && input.cost > 0) {
      expenseId = expenseId ?? uid()
      await db.expenses.put({
        id: expenseId, farmId: input.farmId, date: input.date, categoryId: HEALTH_CAT[input.type],
        amount: Math.round(input.cost), scope: input.scope, targetId: input.targetId, note: input.title,
        createdAt: now(),
      })
    } else if (expenseId) {
      await db.expenses.delete(expenseId)
      expenseId = undefined
    }
    await db.health.put({ ...input, id: hid, expenseId, createdAt: old?.createdAt ?? now() })
  })
}

export async function deleteHealth(id: ID) {
  await db.transaction('rw', [db.health, db.expenses], async () => {
    const h = await db.health.get(id)
    if (h?.expenseId) await db.expenses.delete(h.expenseId)
    await db.health.delete(id)
  })
}

/* ---------------- Zaxira ---------------- */

export interface Backup {
  app: 'chorva-hisob'
  version: 1
  createdAt: number
  tables: Record<string, unknown[]>
}

export async function exportBackup(): Promise<Backup> {
  const tables: Record<string, unknown[]> = {}
  for (const t of TABLES) tables[t] = await db.table(t).toArray()
  return { app: 'chorva-hisob', version: 1, createdAt: now(), tables }
}

export async function importBackup(b: Backup) {
  if (b?.app !== 'chorva-hisob' || !b.tables) throw new Error('invalid backup')
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      const rows = b.tables[t]
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkPut(rows)
    }
  })
}

export async function wipeAll() {
  await db.delete()
  await db.open()
}

