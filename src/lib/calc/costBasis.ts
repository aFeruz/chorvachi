import type { Animal, Expense, Group, GroupMovement, ID, Species } from '../../db/types'

/**
 * Tannarx taqsimoti.
 *
 * Har bir xarajat o'z sanasida mavjud bo'lgan "birlik"larga taqsimlanadi:
 *  - birlik = individual hayvon yoki guruh rejimidagi guruh (parranda, baliq ...)
 *  - og'irlik = shartli bosh koeffitsienti (lu) × bosh soni,
 *    shunda butun ferma xarajati sigir va tovuq o'rtasida adolatli bo'linadi.
 */

export type CostAnimal = Pick<Animal, 'id' | 'speciesId' | 'groupId' | 'acquiredDate' | 'exitDate'>
export type CostGroup = Pick<Group, 'id' | 'speciesId'>
export type CostSpecies = Pick<Species, 'id' | 'lu' | 'mode'>
export type CostExpense = Pick<Expense, 'id' | 'date' | 'amount' | 'categoryId' | 'scope' | 'targetId'>
export type CostMovement = Pick<GroupMovement, 'groupId' | 'date' | 'type' | 'count'>

export interface CostInput {
  animals: CostAnimal[]
  groups: CostGroup[]
  species: CostSpecies[]
  movements: CostMovement[]
  expenses: CostExpense[]
}

export interface CostLine {
  total: number
  direct: number // to'g'ridan-to'g'ri shu birlikka yozilgan
  shared: number // guruh/tur/ferma ulushi
  byCategory: Record<ID, number>
}

export interface CostResult {
  /** kalit: animal.id yoki guruh-rejimidagi group.id */
  units: Map<ID, CostLine>
  unallocated: number
}

const SIGN: Record<CostMovement['type'], number> = { in: 1, birth: 1, death: -1, sold: -1, slaughter: -1 }

export function groupHeadsAt(movements: CostMovement[], groupId: ID, date: string): number {
  let n = 0
  for (const m of movements) if (m.groupId === groupId && m.date <= date) n += SIGN[m.type] * m.count
  return Math.max(0, n)
}

export function isPresent(a: CostAnimal, date: string): boolean {
  return a.acquiredDate <= date && (!a.exitDate || a.exitDate >= date)
}

interface Unit {
  id: ID
  speciesId: ID
  groupId?: ID
  kind: 'animal' | 'group'
  lu: number
  animal?: CostAnimal
}

export function allocateCosts(input: CostInput, opts: { from?: string; to?: string } = {}): CostResult {
  const spMap = new Map(input.species.map((s) => [s.id, s]))
  const groupMode = new Set(input.groups.filter((g) => spMap.get(g.speciesId)?.mode === 'group').map((g) => g.id))

  const units: Unit[] = [
    ...input.animals.map<Unit>((a) => ({
      id: a.id, speciesId: a.speciesId, groupId: a.groupId, kind: 'animal', lu: spMap.get(a.speciesId)?.lu ?? 0.1, animal: a,
    })),
    ...input.groups
      .filter((g) => groupMode.has(g.id))
      .map<Unit>((g) => ({ id: g.id, speciesId: g.speciesId, kind: 'group', lu: spMap.get(g.speciesId)?.lu ?? 0.01 })),
  ]

  // guruh bosh sonlari tarixini oldindan saralab qo'yamiz
  const movByGroup = new Map<ID, CostMovement[]>()
  for (const m of input.movements) {
    if (!movByGroup.has(m.groupId)) movByGroup.set(m.groupId, [])
    movByGroup.get(m.groupId)!.push(m)
  }

  const weightAt = (u: Unit, date: string): number => {
    if (u.kind === 'animal') return isPresent(u.animal!, date) ? u.lu : 0
    return u.lu * groupHeadsAt(movByGroup.get(u.id) ?? [], u.id, date)
  }

  const out = new Map<ID, CostLine>()
  const line = (id: ID) => {
    let l = out.get(id)
    if (!l) {
      l = { total: 0, direct: 0, shared: 0, byCategory: {} }
      out.set(id, l)
    }
    return l
  }
  const add = (id: ID, amount: number, cat: ID, direct: boolean) => {
    const l = line(id)
    l.total += amount
    if (direct) l.direct += amount
    else l.shared += amount
    l.byCategory[cat] = (l.byCategory[cat] ?? 0) + amount
  }

  let unallocated = 0
  const animalIds = new Set(input.animals.map((a) => a.id))

  const split = (candidates: Unit[], e: CostExpense, fallbackAll: boolean) => {
    let weights = candidates.map((u) => weightAt(u, e.date))
    let sum = weights.reduce((a, b) => a + b, 0)
    if (sum <= 0 && fallbackAll && candidates.length) {
      weights = candidates.map((u) => u.lu)
      sum = weights.reduce((a, b) => a + b, 0)
    }
    if (sum <= 0) {
      unallocated += e.amount
      return
    }
    candidates.forEach((u, i) => {
      if (weights[i] > 0) add(u.id, (e.amount * weights[i]) / sum, e.categoryId, false)
    })
  }

  for (const e of input.expenses) {
    if (opts.from && e.date < opts.from) continue
    if (opts.to && e.date > opts.to) continue
    switch (e.scope) {
      case 'animal':
        if (e.targetId && animalIds.has(e.targetId)) add(e.targetId, e.amount, e.categoryId, true)
        else unallocated += e.amount
        break
      case 'group':
        if (e.targetId && groupMode.has(e.targetId)) add(e.targetId, e.amount, e.categoryId, true)
        else split(units.filter((u) => u.kind === 'animal' && u.groupId === e.targetId), e, true)
        break
      case 'species':
        split(units.filter((u) => u.speciesId === e.targetId), e, false)
        break
      default:
        split(units, e, false)
    }
  }

  return { units: out, unallocated }
}

export function emptyLine(): CostLine {
  return { total: 0, direct: 0, shared: 0, byCategory: {} }
}

/** Bir nechta birlik tannarxini jamlash (masalan individual hayvonlardan iborat guruh) */
export function sumLines(lines: (CostLine | undefined)[]): CostLine {
  const r = emptyLine()
  for (const l of lines) {
    if (!l) continue
    r.total += l.total
    r.direct += l.direct
    r.shared += l.shared
    for (const [k, v] of Object.entries(l.byCategory)) r.byCategory[k] = (r.byCategory[k] ?? 0) + v
  }
  return r
}
