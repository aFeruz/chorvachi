import type { ApiaryInput, BaseInput, BatchInput, ForecastInput, HerdInput, LayerInput, ModelKind } from './types'

/**
 * Turlar bo'yicha boshlang'ich qiymatlar.
 * Faqat biologik me'yorlar (bo'g'ozlik, bola soni, o'sish, o'lim, yem miqdori kg da).
 * Narxlar BERILMAYDI — ular fermangiz tarixidan olinadi yoki foydalanuvchi kiritadi.
 */

export function baseDefaults(startMonth: string): BaseInput {
  return {
    months: 36,
    startMonth,
    startCash: 0,
    buyStart: true,
    purchasePrice: 0,
    setupCost: 0,
    laborMonth: 0,
    otherMonth: 0,
    vetPerHeadYear: 0,
    priceGrowthPct: 0,
    costGrowthPct: 0,
    priceVolatilityPct: 10,
    diseaseRiskPct: 15,
    diseaseLossPct: 10,
    diseaseCostPerHead: 0,
  }
}

const RUMINANT_PASTURE = [4, 5, 6, 7, 8, 9, 10]

const HERD_BASE: Omit<HerdInput, keyof BaseInput | 'model'> = {
  females: 10,
  femaleAgeMonths: 24,
  pregnant: 0,
  dueInMonths: 3,
  males: 1,
  young: [],
  gestationMonths: 5,
  birthIntervalMonths: 12,
  litterSize: 1.3,
  conceptionPct: 90,
  maturityMonths: 8,
  youngMortalityPct: 8,
  adultMortalityPct: 3,
  productiveYears: 6,
  useAI: false,
  aiCostPerFemale: 0,
  birthWeightKg: 4,
  adgKg: 0.18,
  adultWeightKg: 60,
  sellAgeMonths: 6,
  keepFemales: true,
  maxBreedingFemales: 50,
  maxHeads: 0,
  salePricePerKg: 0,
  cullPricePerKg: 0,
  malePrice: 0,
  feedKgPerDay: 2,
  youngFeedFactor: 0.4,
  feedPricePerKg: 0,
  pastureMonths: RUMINANT_PASTURE,
  pastureSavingPct: 60,
  woolKgPerYear: 0,
  woolPricePerKg: 0,
  shearMonth: 5,
  milkLPerDay: 0,
  lactationMonths: 0,
  milkPricePerL: 0,
}

const HERD: Record<string, Partial<HerdInput>> = {
  sheep: { woolKgPerYear: 2.5 },
  goat: { litterSize: 1.6, youngMortalityPct: 10, adultMortalityPct: 4, birthWeightKg: 3, adgKg: 0.14, adultWeightKg: 45, feedKgPerDay: 1.6 },
  cattle: {
    females: 5, femaleAgeMonths: 36, gestationMonths: 9, birthIntervalMonths: 13, litterSize: 1, conceptionPct: 85, maturityMonths: 15,
    youngMortalityPct: 6, adultMortalityPct: 2, productiveYears: 8, birthWeightKg: 35, adgKg: 0.7, adultWeightKg: 450, sellAgeMonths: 15,
    feedKgPerDay: 10, youngFeedFactor: 0.5, pastureSavingPct: 50, maxBreedingFemales: 20, diseaseRiskPct: 10, diseaseLossPct: 5,
  },
  horse: {
    females: 3, femaleAgeMonths: 60, gestationMonths: 11, birthIntervalMonths: 24, litterSize: 1, conceptionPct: 75, maturityMonths: 36,
    youngMortalityPct: 8, adultMortalityPct: 2, productiveYears: 12, birthWeightKg: 45, adgKg: 0.6, adultWeightKg: 400, sellAgeMonths: 24,
    feedKgPerDay: 9, youngFeedFactor: 0.5, pastureSavingPct: 50, maxBreedingFemales: 10, diseaseRiskPct: 8, diseaseLossPct: 5,
  },
  camel: {
    females: 3, femaleAgeMonths: 72, gestationMonths: 13, birthIntervalMonths: 24, litterSize: 1, conceptionPct: 70, maturityMonths: 48,
    youngMortalityPct: 10, adultMortalityPct: 2, productiveYears: 15, birthWeightKg: 35, adgKg: 0.5, adultWeightKg: 500, sellAgeMonths: 24,
    feedKgPerDay: 10, youngFeedFactor: 0.5, pastureSavingPct: 60, maxBreedingFemales: 10, diseaseRiskPct: 8, diseaseLossPct: 5,
  },
  rabbit: {
    females: 10, femaleAgeMonths: 8, gestationMonths: 1, birthIntervalMonths: 2, litterSize: 7, conceptionPct: 80, maturityMonths: 5,
    youngMortalityPct: 15, adultMortalityPct: 10, productiveYears: 2.5, birthWeightKg: 0.06, adgKg: 0.03, adultWeightKg: 4.5, sellAgeMonths: 3,
    feedKgPerDay: 0.15, youngFeedFactor: 0.5, pastureMonths: [], pastureSavingPct: 0, maxBreedingFemales: 50, diseaseRiskPct: 20, diseaseLossPct: 25,
  },
}

const BATCH_BASE: Omit<BatchInput, keyof BaseInput | 'model'> = {
  batchSize: 500,
  cycleDays: 42,
  downtimeDays: 14,
  batchCount: 0,
  growthPct: 0,
  maxBatchSize: 0,
  startWeightKg: 0.04,
  finalWeightKg: 2.5,
  mortalityPct: 5,
  feedMode: 'fcr',
  fcr: 1.7,
  feedKgPerDay: 0,
  feedPricePerKg: 0,
  unitPrice: 0,
  otherCostPerBatch: 0,
  salePricePerKg: 0,
}

/** Partiya modeli: parranda, baliq va bo'rdoqi */
const BATCH: Record<string, Partial<BatchInput>> = {
  broiler: {},
  turkey: { batchSize: 300, cycleDays: 140, downtimeDays: 21, startWeightKg: 0.06, finalWeightKg: 12, mortalityPct: 8, fcr: 2.8 },
  duck: { batchSize: 300, cycleDays: 56, downtimeDays: 14, startWeightKg: 0.05, finalWeightKg: 3.2, mortalityPct: 6, fcr: 2.6 },
  fish: { batchSize: 5000, cycleDays: 180, downtimeDays: 60, startWeightKg: 0.01, finalWeightKg: 0.8, mortalityPct: 20, fcr: 1.5 },
  // bo'rdoqi: sotib olib boqish
  sheep: { batchSize: 20, cycleDays: 90, downtimeDays: 15, startWeightKg: 30, finalWeightKg: 52, mortalityPct: 2, feedMode: 'perDay', feedKgPerDay: 2.2, fcr: 0 },
  goat: { batchSize: 20, cycleDays: 90, downtimeDays: 15, startWeightKg: 22, finalWeightKg: 35, mortalityPct: 3, feedMode: 'perDay', feedKgPerDay: 1.6, fcr: 0 },
  cattle: { batchSize: 10, cycleDays: 180, downtimeDays: 20, startWeightKg: 250, finalWeightKg: 410, mortalityPct: 2, feedMode: 'perDay', feedKgPerDay: 12, fcr: 0 },
}

const LAYER_BASE: Omit<LayerInput, keyof BaseInput | 'model'> = {
  flockSize: 300,
  pulletPrice: 0,
  layMonths: 14,
  peakLayPct: 90,
  layDeclinePct: 1.2,
  feedKgPerDay: 0.12,
  feedPricePerKg: 0,
  eggPrice: 0,
  spentHenPrice: 0,
  monthlyMortalityPct: 0.8,
  restock: true,
  restockGapMonths: 1,
}

const APIARY_BASE: Omit<ApiaryInput, keyof BaseInput | 'model'> = {
  colonies: 10,
  maxColonies: 50,
  honeyKgPerColony: 15,
  honeyPricePerKg: 0,
  harvestMonths: [6, 7, 8],
  waxKgPerColony: 0.5,
  waxPricePerKg: 0,
  splitPct: 40,
  splitMonth: 5,
  winterLossPct: 15,
  winterMonth: 2,
  newHiveCost: 0,
  colonySalePrice: 0,
  sugarKgPerColony: 8,
  sugarPricePerKg: 0,
  varroaCostPerColony: 0,
}

/** Tur uchun mumkin bo'lgan modellar (birinchisi — asosiy) */
export function modelsFor(speciesKey?: string): ModelKind[] {
  switch (speciesKey) {
    case 'sheep':
    case 'goat':
    case 'cattle':
      return ['herd', 'batch']
    case 'horse':
    case 'camel':
    case 'rabbit':
      return ['herd']
    case 'broiler':
    case 'turkey':
    case 'duck':
    case 'fish':
      return ['batch']
    case 'layer':
      return ['layer']
    case 'bee':
      return ['apiary']
    default:
      return ['herd', 'batch']
  }
}

/** 1 boshga kerakli joy, m² (taxminiy me'yor) */
export const SPACE_M2: Record<string, number> = {
  sheep: 1.5, goat: 1.5, cattle: 6, horse: 10, camel: 10, rabbit: 0.5, broiler: 0.08, turkey: 0.3, duck: 0.25, layer: 0.15,
}

export function defaultInput(model: ModelKind, speciesKey: string | undefined, startMonth: string): ForecastInput {
  const base = baseDefaults(startMonth)
  const key = speciesKey ?? ''
  switch (model) {
    case 'herd':
      return { ...base, model, ...HERD_BASE, ...(HERD[key] ?? {}) }
    case 'batch':
      return { ...base, model, months: 24, diseaseRiskPct: 20, diseaseLossPct: 15, ...BATCH_BASE, ...(BATCH[key] ?? {}) }
    case 'layer':
      return { ...base, model, months: 24, diseaseRiskPct: 15, diseaseLossPct: 10, ...LAYER_BASE }
    case 'apiary':
      return { ...base, model, months: 36, diseaseRiskPct: 10, diseaseLossPct: 20, ...APIARY_BASE }
  }
}
