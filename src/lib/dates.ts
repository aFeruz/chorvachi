export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): string {
  return toISO(new Date())
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function addMonths(s: string, n: number): string {
  const d = parseISO(s)
  d.setMonth(d.getMonth() + n)
  return toISO(d)
}

/** b - a, kunlarda */
export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000)
}

export function formatDate(s?: string): string {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}

export function monthKey(s: string): string {
  return s.slice(0, 7)
}

export function startOfMonth(s: string): string {
  return s.slice(0, 7) + '-01'
}

export function startOfYear(s: string): string {
  return s.slice(0, 4) + '-01-01'
}

/** Yoshni "2 yil 3 oy" ko'rinishida qaytarish uchun oylar soni */
export function ageMonths(birth: string, at: string = today()): number {
  const a = parseISO(birth)
  const b = parseISO(at)
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (b.getDate() < a.getDate()) m--
  return Math.max(0, m)
}

export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = []
  let cur = startOfMonth(from)
  const end = monthKey(to)
  while (monthKey(cur) <= end && out.length < 600) {
    out.push(monthKey(cur))
    cur = addMonths(cur, 1)
  }
  return out
}
