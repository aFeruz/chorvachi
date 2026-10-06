/**
 * Tasodifiylik manbai.
 * - Det (deterministik) rejim: har bir hodisa o'rtacha kutilgan qiymat bilan hisoblanadi (kasr sonlar).
 * - Stoxastik rejim: urug'li (seed) tasodifiy generator, butun sonlar — Monte-Karlo uchun.
 */

export interface Rand {
  readonly det: boolean
  /** n ta mustaqil hodisadan p ehtimol bilan nechtasi ro'y beradi */
  binom(n: number, p: number): number
  /** hodisa intensivligi: det -> p, stoxastik -> 0 yoki 1 */
  event(p: number): number
  /** o'rtacha 1 atrofida ko'paytiruvchi (cv — variatsiya koeffitsienti) */
  factor(cv: number): number
  uniform(): number
}

export const DET: Rand = {
  det: true,
  binom: (n, p) => n * clamp01(p),
  event: (p) => clamp01(p),
  factor: () => 1,
  uniform: () => 0.5,
}

/** mulberry32 — tez va yetarlicha sifatli urug'li generator */
export function seeded(seed: number): Rand {
  let s = seed >>> 0
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const normal = () => {
    let u = 0
    while (u === 0) u = next()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next())
  }
  return {
    det: false,
    uniform: next,
    event: (p) => (next() < clamp01(p) ? 1 : 0),
    factor: (cv) => Math.max(0, 1 + normal() * cv),
    binom(n, p) {
      const k = Math.round(n)
      const q = clamp01(p)
      if (k <= 0 || q <= 0) return 0
      if (q >= 1) return k
      if (k < 60) {
        let c = 0
        for (let i = 0; i < k; i++) if (next() < q) c++
        return c
      }
      // katta n uchun normal yaqinlashuv
      const v = Math.round(k * q + normal() * Math.sqrt(k * q * (1 - q)))
      return Math.min(k, Math.max(0, v))
    },
  }
}

export function clamp01(x: number): number {
  // NaN ham 0 deb olinadi
  return !(x > 0) ? 0 : x > 1 ? 1 : x
}

/** yillik ehtimolni oylik ehtimolga o'tkazish */
export function monthlyProb(yearPct: number): number {
  const p = clamp01(yearPct / 100)
  return 1 - Math.pow(1 - p, 1 / 12)
}
