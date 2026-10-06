const NBSP = ' '

/** 1250000 -> "1 250 000" */
export function groupDigits(n: number): string {
  const sign = n < 0 ? '-' : ''
  const s = Math.round(Math.abs(n)).toString()
  return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
}

export function formatSom(n: number, suffix = "so'm"): string {
  return groupDigits(n) + NBSP + suffix
}

/** Qisqa ko'rinish: 1.25 mln, 3.4 mlrd */
export function formatShort(n: number, lang: 'uz' | 'ru' = 'uz'): string {
  const a = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  const units = lang === 'ru' ? ['млрд', 'млн', 'тыс'] : ['mlrd', 'mln', 'ming']
  if (a >= 1e9) return sign + trim(a / 1e9) + NBSP + units[0]
  if (a >= 1e6) return sign + trim(a / 1e6) + NBSP + units[1]
  if (a >= 1e4) return sign + trim(a / 1e3) + NBSP + units[2]
  return sign + groupDigits(a)
}

function trim(x: number): string {
  return (Math.round(x * 100) / 100).toString().replace('.', ',')
}

export function formatUsd(n: number, rate: number): string {
  if (!rate) return ''
  const v = n / rate
  return '$' + (Math.abs(v) >= 100 ? groupDigits(v) : (Math.round(v * 100) / 100).toString())
}

/** "1 250 000" yoki "1250000,5" -> son */
export function parseNumber(s: string): number {
  const clean = s.replace(/[\s ]/g, '').replace(',', '.')
  const n = parseFloat(clean)
  return Number.isFinite(n) ? n : 0
}

export function formatNum(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—'
  const r = Math.round(n * 10 ** digits) / 10 ** digits
  const [i, d] = r.toString().split('.')
  return groupDigits(Number(i)) + (d ? ',' + d : '')
}

export function pct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—'
  return formatNum(n, digits) + '%'
}
