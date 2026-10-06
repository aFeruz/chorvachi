import { diffDays } from '../dates'

export interface WeightPoint {
  date: string
  kg: number
}

/** O'rtacha kunlik vazn qo'shish (kg/kun) — birinchi va oxirgi o'lchov bo'yicha */
export function adg(points: WeightPoint[]): number | undefined {
  if (points.length < 2) return undefined
  const s = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const first = s[0]
  const last = s[s.length - 1]
  const days = diffDays(first.date, last.date)
  if (days <= 0) return undefined
  return (last.kg - first.kg) / days
}

export function latestWeight(points: WeightPoint[]): WeightPoint | undefined {
  return [...points].sort((a, b) => b.date.localeCompare(a.date))[0]
}

/** Yem konversiyasi: 1 kg vazn uchun necha kg yem */
export function fcr(feedKg: number, gainKg: number): number | undefined {
  return gainKg > 0 ? feedKg / gainKg : undefined
}

export interface HoldInput {
  adgKg: number // kunlik o'sish
  dailyCost: number // 1 kunlik xarajat (shu hayvon uchun)
  pricePerKgLive: number
  days?: number
}

export interface HoldResult {
  days: number
  gainKg: number
  gainValue: number
  cost: number
  net: number
  recommend: 'hold' | 'sell'
  /** 1 kg qo'shimcha vazn tannarxi */
  costPerKgGain?: number
}

/** "Hozir sotish yoki yana boqish?" */
export function holdOrSell(i: HoldInput): HoldResult {
  const days = i.days ?? 30
  const gainKg = Math.max(0, i.adgKg) * days
  const gainValue = gainKg * i.pricePerKgLive
  const cost = i.dailyCost * days
  const net = gainValue - cost
  return {
    days,
    gainKg,
    gainValue,
    cost,
    net,
    recommend: net > 0 ? 'hold' : 'sell',
    costPerKgGain: gainKg > 0 ? cost / gainKg : undefined,
  }
}
