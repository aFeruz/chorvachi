/** Prognoz modellari uchun umumiy turlar */

export type ModelKind = 'herd' | 'batch' | 'layer' | 'apiary'

export type CostKey = 'feed' | 'vet' | 'labor' | 'other' | 'stock' | 'disease' | 'breeding'
export type RevKey = 'animals' | 'culls' | 'milk' | 'wool' | 'eggs' | 'honey' | 'other'

export const COST_KEYS: CostKey[] = ['feed', 'vet', 'labor', 'other', 'stock', 'disease', 'breeding']
export const REV_KEYS: RevKey[] = ['animals', 'culls', 'milk', 'wool', 'eggs', 'honey', 'other']

/** Barcha modellarga umumiy: muddat, pul, doimiy xarajatlar, xatarlar */
export interface BaseInput {
  months: number
  /** boshlanish oyi, yyyy-MM */
  startMonth: string
  /** hozirgi naqd holat: hozirgacha qilingan foyda (+) yoki sarflangan pul (−) */
  startCash: number
  /** boshlang'ich hayvonlar endi sotib olinadimi (yo'q bo'lsa — fermada bor) */
  buyStart: boolean
  /** 1 bosh (ona / jo'ja / tovuq / oila) sotib olish narxi */
  purchasePrice: number
  /** bir martalik sarmoya: bino, jihoz, qo'ra */
  setupCost: number
  laborMonth: number
  otherMonth: number
  vetPerHeadYear: number
  /** sotish narxlarining yillik o'sishi, % */
  priceGrowthPct: number
  /** xarajatlarning yillik o'sishi (inflyatsiya), % */
  costGrowthPct: number
  /** narx tebranishi (bir yildan ikkinchisiga), % — faqat xatar tahlilida */
  priceVolatilityPct: number
  /** yiliga kasallik chiqish ehtimoli, % */
  diseaseRiskPct: number
  /** kasallik chiqsa, nobud bo'ladigan ulush, % */
  diseaseLossPct: number
  /** kasallik chiqsa, 1 boshga davolash xarajati */
  diseaseCostPerHead: number
}

/** Ko'paytirish: qo'y, echki, qoramol, ot, tuya, quyon */
export interface HerdInput extends BaseInput {
  model: 'herd'
  // boshlang'ich poda
  females: number
  femaleAgeMonths: number
  /** onalar yoshi bo'yicha (fermadan olinganda); bo'lmasa hammasi femaleAgeMonths yoshida */
  femaleGroups?: { ageMonths: number; count: number }[]
  pregnant: number
  dueInMonths: number
  males: number
  young: { ageMonths: number; females: number; males: number }[]
  // biologiya
  gestationMonths: number
  birthIntervalMonths: number
  litterSize: number
  conceptionPct: number
  maturityMonths: number
  youngMortalityPct: number
  adultMortalityPct: number
  productiveYears: number
  useAI: boolean
  aiCostPerFemale: number
  // o'sish
  birthWeightKg: number
  adgKg: number
  adultWeightKg: number
  // siyosat
  sellAgeMonths: number
  keepFemales: boolean
  maxBreedingFemales: number
  maxHeads: number
  // narxlar
  salePricePerKg: number
  cullPricePerKg: number
  malePrice: number
  // yem
  feedKgPerDay: number
  youngFeedFactor: number
  feedPricePerKg: number
  pastureMonths: number[]
  pastureSavingPct: number
  // mahsulot
  woolKgPerYear: number
  woolPricePerKg: number
  shearMonth: number
  milkLPerDay: number
  lactationMonths: number
  milkPricePerL: number
}

/** Partiya: broyler, kurka, o'rdak, baliq, bo'rdoqi (sotib olib boqish) */
export interface BatchInput extends BaseInput {
  model: 'batch'
  batchSize: number
  cycleDays: number
  downtimeDays: number
  /** 0 — muddat oxirigacha uzluksiz */
  batchCount: number
  growthPct: number
  maxBatchSize: number
  startWeightKg: number
  finalWeightKg: number
  mortalityPct: number
  feedMode: 'fcr' | 'perDay'
  fcr: number
  feedKgPerDay: number
  feedPricePerKg: number
  unitPrice: number
  otherCostPerBatch: number
  salePricePerKg: number
}

/** Tuxum tovuq */
export interface LayerInput extends BaseInput {
  model: 'layer'
  flockSize: number
  pulletPrice: number
  layMonths: number
  peakLayPct: number
  layDeclinePct: number
  feedKgPerDay: number
  feedPricePerKg: number
  eggPrice: number
  spentHenPrice: number
  monthlyMortalityPct: number
  restock: boolean
  restockGapMonths: number
}

/** Asalarichilik */
export interface ApiaryInput extends BaseInput {
  model: 'apiary'
  colonies: number
  maxColonies: number
  honeyKgPerColony: number
  honeyPricePerKg: number
  harvestMonths: number[]
  waxKgPerColony: number
  waxPricePerKg: number
  splitPct: number
  splitMonth: number
  winterLossPct: number
  winterMonth: number
  newHiveCost: number
  colonySalePrice: number
  sugarKgPerColony: number
  sugarPricePerKg: number
  varroaCostPerColony: number
}

export type ForecastInput = HerdInput | BatchInput | LayerInput | ApiaryInput

export interface MonthRow {
  m: number
  /** yyyy-MM */
  month: string
  heads: number
  /** ona hayvonlar / tovuqlar / oilalar */
  core: number
  young: number
  born: number
  died: number
  sold: number
  revenue: number
  rev: Record<RevKey, number>
  cost: number
  costs: Record<CostKey, number>
  net: number
  /** jamg'arma naqd natija: startCash − investment + Σ net */
  cash: number
  herdValue: number
  /** naqd + poda qiymati */
  wealth: number
  feedKg: number
  /** shu oyda kasallik chiqdimi (stoxastik rejimda 0/1, det rejimda ehtimol) */
  outbreak: number
}

export interface RunResult {
  rows: MonthRow[]
  /** sarmoyadan keyingi boshlang'ich holat: naqd + poda qiymati */
  startWealth: number
  startHerdValue: number
  warnings: string[]
}

export const emptyCosts = (): Record<CostKey, number> => ({ feed: 0, vet: 0, labor: 0, other: 0, stock: 0, disease: 0, breeding: 0 })
export const emptyRev = (): Record<RevKey, number> => ({ animals: 0, culls: 0, milk: 0, wool: 0, eggs: 0, honey: 0, other: 0 })
