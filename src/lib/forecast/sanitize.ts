import { DEFAULT_GOAL, type Goal } from './analyze'
import type { ForecastInput } from './types'

const GOAL_TYPES: Goal['type'][] = ['profit', 'heads', 'cash', 'monthly', 'horizon', 'need', 'risk']

/** 0..100 oralig'ida bo'lishi kerak bo'lgan foiz maydonlari */
const PCT = [
  'diseaseRiskPct', 'diseaseLossPct', 'priceVolatilityPct', 'conceptionPct', 'youngMortalityPct', 'adultMortalityPct',
  'pastureSavingPct', 'mortalityPct', 'peakLayPct', 'monthlyMortalityPct', 'winterLossPct',
]
/** butun son bo'lishi kerak bo'lgan bosh soni maydonlari */
const COUNTS = ['females', 'pregnant', 'males', 'maxBreedingFemales', 'maxHeads', 'batchSize', 'batchCount', 'maxBatchSize', 'flockSize', 'colonies', 'maxColonies']
/** manfiy bo'lishi mumkin bo'lgan maydonlar (narx/xarajat o'sishi, hozirgi naqd holat) */
const SIGNED = ['priceGrowthPct', 'costGrowthPct', 'startCash']

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/**
 * Hisoblashdan oldin kiritilgan ma'lumotlarni tozalash:
 * - yetishmayotgan / NaN maydonlar standart qiymat bilan to'ldiriladi (eski saqlangan rejalar uchun)
 * - foizlar 0..100, bosh sonlari butun va manfiy emas, muddat 6..120 oy
 */
export function sanitizeInput(input: ForecastInput, defaults: ForecastInput): ForecastInput {
  const d = defaults as unknown as Record<string, unknown>
  const out: Record<string, unknown> = { ...d }
  for (const [k, v] of Object.entries(input as unknown as Record<string, unknown>)) {
    if (v === undefined || v === null || (typeof v === 'number' && !Number.isFinite(v))) continue
    out[k] = v
  }
  out.model = defaults.model
  for (const [k, v] of Object.entries(out)) {
    if (typeof v !== 'number') continue
    let x = v
    if (PCT.includes(k)) x = clamp(x, 0, 100)
    else if (SIGNED.includes(k)) x = k === 'startCash' ? x : clamp(x, -90, 500)
    else x = Math.max(0, x)
    if (COUNTS.includes(k)) x = Math.round(x)
    out[k] = x
  }
  out.months = clamp(Math.round((out.months as number) || 36), 6, 120)
  const i = out as unknown as ForecastInput
  switch (i.model) {
    case 'herd':
      i.pregnant = Math.min(i.pregnant, i.females)
      i.dueInMonths = clamp(Math.round(i.dueInMonths) || 1, 1, 24)
      i.gestationMonths = Math.max(0.5, i.gestationMonths)
      i.birthIntervalMonths = Math.max(i.gestationMonths + 0.5, i.birthIntervalMonths)
      i.sellAgeMonths = Math.max(1, i.sellAgeMonths)
      i.maturityMonths = Math.max(1, i.maturityMonths)
      i.young = (Array.isArray(i.young) ? i.young : [])
        .map((y) => ({ ageMonths: Math.max(0, Math.round(y.ageMonths || 0)), females: Math.max(0, Math.round(y.females || 0)), males: Math.max(0, Math.round(y.males || 0)) }))
        .filter((y) => y.females + y.males > 0)
      i.pastureMonths = Array.isArray(i.pastureMonths) ? i.pastureMonths : []
      if (i.femaleGroups && i.femaleGroups.reduce((s, g) => s + g.count, 0) !== i.females) i.femaleGroups = undefined
      break
    case 'batch':
      i.cycleDays = Math.max(1, Math.round(i.cycleDays))
      i.downtimeDays = Math.max(0, Math.round(i.downtimeDays))
      break
    case 'layer':
      i.layMonths = Math.max(1, Math.round(i.layMonths))
      break
    case 'apiary':
      i.harvestMonths = Array.isArray(i.harvestMonths) ? i.harvestMonths : []
      break
  }
  return i
}

export function sanitizeGoal(g: Partial<Goal> | undefined): Goal {
  const out = { ...DEFAULT_GOAL, ...(g ?? {}) }
  if (!GOAL_TYPES.includes(out.type)) out.type = 'profit'
  out.heads = Math.max(1, Math.round(out.heads || 1))
  out.amount = Math.max(0, out.amount || 0)
  out.byMonth = clamp(Math.round(out.byMonth || 1), 1, 120)
  if (out.headsMetric !== 'core') out.headsMetric = 'total'
  if (out.needKind !== 'cash') out.needKind = 'heads'
  return out
}

export const isGoalType = (x: unknown): x is Goal['type'] => GOAL_TYPES.includes(x as Goal['type'])
