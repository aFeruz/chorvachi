export type ID = string

export type Lang = 'uz' | 'ru'
export type LText = { uz: string; ru: string }

export type CountMode = 'individual' | 'group'

export interface Farm {
  id: ID
  name: string
  address?: string
  createdAt: number
}

export interface Species {
  id: ID
  key?: string // builtin key
  name: LText
  icon?: string // ikonka kaliti (components/icons.tsx)
  color?: string
  mode: CountMode
  gestationDays: number // 0 = tug'ilish yo'q (masalan broyler)
  avgLitter: number
  maturityMonths: number
  dressingPct: number // so'yish chiqimi, % (go'sht / tirik vazn)
  lu: number // shartli bosh koeffitsienti (qoramol = 1)
  enabled: boolean
  builtin: boolean
}

export type GroupPurpose = 'fattening' | 'breeding' | 'dairy' | 'eggs' | 'wool' | 'mixed'

export interface Group {
  id: ID
  farmId: ID
  name: string
  speciesId: ID
  purpose: GroupPurpose
  startDate: string // yyyy-MM-dd
  status: 'active' | 'closed'
  note?: string
  createdAt: number
}

export type MovementType = 'in' | 'birth' | 'death' | 'sold' | 'slaughter'

/** Faqat 'group' rejimidagi guruhlar (parranda, baliq) uchun bosh soni harakati */
export interface GroupMovement {
  id: ID
  farmId: ID
  groupId: ID
  date: string
  type: MovementType
  count: number
  note?: string
  linkedExpenseId?: ID
  linkedIncomeId?: ID
  createdAt: number
}

export type Sex = 'f' | 'm'
export type AnimalStatus = 'active' | 'sold' | 'slaughtered' | 'dead' | 'lost'

export interface Animal {
  id: ID
  farmId: ID
  tag: string
  name?: string
  speciesId: ID
  sex: Sex
  breed?: string
  birthDate?: string
  origin: 'bought' | 'born'
  acquiredDate: string
  purchaseWeight?: number
  purchaseExpenseId?: ID
  motherId?: ID
  fatherId?: ID
  birthId?: ID
  groupId?: ID
  status: AnimalStatus
  exitDate?: string
  exitNote?: string
  saleIncomeId?: ID
  photo?: string
  note?: string
  createdAt: number
}

export type Scope = 'farm' | 'species' | 'group' | 'animal'

export interface Category {
  id: ID
  kind: 'expense' | 'income'
  key?: string
  name: LText
  color: string
  builtin: boolean
  hidden?: boolean
}

export interface Expense {
  id: ID
  farmId: ID
  date: string
  categoryId: ID
  amount: number // so'm, butun son
  qty?: number
  unit?: string
  scope: Scope
  targetId?: ID
  feedItemId?: ID
  note?: string
  createdAt: number
}

export interface Income {
  id: ID
  farmId: ID
  date: string
  categoryId: ID
  amount: number
  qty?: number
  unit?: string
  scope: Scope
  targetId?: ID
  animalIds?: ID[] // sotilgan/so'yilgan hayvonlar
  headCount?: number // guruh rejimida sotilgan bosh soni
  weightKg?: number
  note?: string
  createdAt: number
}

export interface Weight {
  id: ID
  farmId: ID
  animalId?: ID
  groupId?: ID
  date: string
  kg: number
  createdAt: number
}

export interface Breeding {
  id: ID
  farmId: ID
  femaleId: ID
  maleId?: ID
  maleNote?: string
  date: string
  method: 'natural' | 'ai'
  expectedDate: string
  status: 'pending' | 'born' | 'failed'
  birthId?: ID
  note?: string
  createdAt: number
}

export interface Birth {
  id: ID
  farmId: ID
  motherId: ID
  breedingId?: ID
  date: string
  alive: number
  dead: number
  kidIds: ID[]
  note?: string
  createdAt: number
}

export type ProductType = 'milk' | 'eggs' | 'wool' | 'honey' | 'manure' | 'other'

export interface Production {
  id: ID
  farmId: ID
  date: string
  type: ProductType
  qty: number
  unit: string
  scope: Scope
  targetId?: ID
  note?: string
  createdAt: number
}

export interface FeedItem {
  id: ID
  farmId: ID
  name: string
  unit: string
  stock: number
  avgPrice: number // 1 birlik narxi
  createdAt: number
}

export interface FeedMove {
  id: ID
  farmId: ID
  feedItemId: ID
  date: string
  qty: number // + kirim, - sarf
  price?: number // kirimda 1 birlik narxi
  expenseId?: ID
  note?: string
  createdAt: number
}

export interface Ration {
  id: ID
  farmId: ID
  feedItemId: ID
  scope: 'species' | 'group'
  targetId: ID
  perHeadDay: number
}

export type HealthType = 'vaccine' | 'treatment' | 'deworm' | 'checkup' | 'other'

export interface HealthEvent {
  id: ID
  farmId: ID
  date: string
  type: HealthType
  title: string
  scope: Scope
  targetId?: ID
  cost?: number
  expenseId?: ID
  nextDate?: string
  nextDone?: boolean
  note?: string
  createdAt: number
}

export interface Reminder {
  id: ID
  farmId: ID
  date: string
  title: string
  note?: string
  done: boolean
  createdAt: number
}

export interface KV {
  key: string
  value: unknown
}

export interface Settings {
  lang: Lang
  theme: 'system' | 'light' | 'dark'
  usdRate: number
  showUsd: boolean
  activeFarmId?: ID
  onboarded: boolean
  lastBackup?: number
  /** tur bo'yicha joriy bozor narxi: 1 kg tirik vazn va 1 bosh */
  marketPrices: Record<ID, { perKg?: number; perHead?: number }>
  notifications: boolean
  /** "Avtomatik sozlash" ishlatilgan yoki taklif yopilgan */
  setupDone?: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'uz',
  theme: 'system',
  usdRate: 12700,
  showUsd: false,
  onboarded: false,
  marketPrices: {},
  notifications: true,
}
