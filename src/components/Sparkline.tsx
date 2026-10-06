import { formatDate } from '../lib/dates'
import { formatNum } from '../lib/money'

/** Oddiy vazn grafigi (kutubxonasiz, yengil) */
export function WeightChart({ points }: { points: { date: string; kg: number }[] }) {
  const s = [...points].sort((a, b) => a.date.localeCompare(b.date))
  if (s.length < 2) return null
  const W = 320
  const H = 120
  const pad = 24
  const t0 = new Date(s[0].date).getTime()
  const t1 = new Date(s[s.length - 1].date).getTime() || t0 + 1
  const min = Math.min(...s.map((p) => p.kg))
  const max = Math.max(...s.map((p) => p.kg))
  const x = (d: string) => pad + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - pad * 2)
  const y = (kg: number) => H - pad - ((kg - min) / Math.max(0.001, max - min)) * (H - pad * 2)
  const path = s.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full text-brand-600" role="img">
      <path d={`${path} L${x(s[s.length - 1].date)},${H - pad} L${x(s[0].date)},${H - pad} Z`} fill="currentColor" opacity="0.1" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {s.map((p) => (
        <g key={p.date + p.kg}>
          <circle cx={x(p.date)} cy={y(p.kg)} r="3.5" fill="currentColor" />
          <text x={x(p.date)} y={y(p.kg) - 8} textAnchor="middle" className="fill-stone-600 text-[10px] dark:fill-stone-300">
            {formatNum(p.kg)}
          </text>
        </g>
      ))}
      <text x={pad} y={H - 6} className="fill-stone-400 text-[9px]">{formatDate(s[0].date)}</text>
      <text x={W - pad} y={H - 6} textAnchor="end" className="fill-stone-400 text-[9px]">{formatDate(s[s.length - 1].date)}</text>
    </svg>
  )
}
