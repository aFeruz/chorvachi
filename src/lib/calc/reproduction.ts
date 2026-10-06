import type { Birth, Breeding } from '../../db/types'
import { addDays } from '../dates'

export function expectedBirthDate(matingDate: string, gestationDays: number): string {
  return addDays(matingDate, gestationDays)
}

export interface ReproStats {
  matings: number
  confirmedBirths: number
  failed: number
  pending: number
  conceptionPct: number // tug'gan / (tug'gan + qaytgan)
  births: number
  bornAlive: number
  bornDead: number
  litterAvg: number
  stillbirthPct: number
  /** 100 ona boshiga tirik bola (qo'zilash %) */
  yieldPer100: number
}

export function reproStats(
  breedings: Pick<Breeding, 'status' | 'date'>[],
  births: Pick<Birth, 'alive' | 'dead' | 'motherId' | 'date'>[],
  from?: string,
  to?: string,
): ReproStats {
  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to)
  const b = breedings.filter((x) => inRange(x.date))
  const br = births.filter((x) => inRange(x.date))
  const confirmed = b.filter((x) => x.status === 'born').length
  const failed = b.filter((x) => x.status === 'failed').length
  const pending = b.filter((x) => x.status === 'pending').length
  const alive = br.reduce((s, x) => s + x.alive, 0)
  const dead = br.reduce((s, x) => s + x.dead, 0)
  const mothers = new Set(br.map((x) => x.motherId)).size
  return {
    matings: b.length,
    confirmedBirths: confirmed,
    failed,
    pending,
    conceptionPct: confirmed + failed > 0 ? (confirmed / (confirmed + failed)) * 100 : 0,
    births: br.length,
    bornAlive: alive,
    bornDead: dead,
    litterAvg: br.length ? (alive + dead) / br.length : 0,
    stillbirthPct: alive + dead > 0 ? (dead / (alive + dead)) * 100 : 0,
    yieldPer100: mothers ? (alive / mothers) * 100 : 0,
  }
}
