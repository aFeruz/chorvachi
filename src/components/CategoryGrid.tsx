import { useState } from 'react'
import type { Category, ID } from '../db/types'
import { useSettings } from '../state/settings'
import { cx } from './ui'

/** Kategoriya tanlash: eng ko'p ishlatilganlar birinchi */
export function CategoryGrid({
  categories, value, onChange, usage,
}: { categories: Category[]; value: ID; onChange: (id: ID) => void; usage?: Map<ID, number> }) {
  const { t, lt } = useSettings()
  const [all, setAll] = useState(false)
  const sorted = [...categories.filter((c) => !c.hidden)].sort((a, b) => (usage?.get(b.id) ?? 0) - (usage?.get(a.id) ?? 0))
  const shown = all ? sorted : sorted.slice(0, 9)
  if (!all && value && !shown.some((c) => c.id === value)) {
    const sel = sorted.find((c) => c.id === value)
    if (sel) shown[shown.length - 1] = sel
  }
  return (
    <div className="mb-3">
      <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-300">{t('Turi', 'Категория')}</span>
      <div className="flex flex-wrap gap-2">
        {shown.map((c) => (
          <button
            type="button"
            key={c.id}
            onClick={() => onChange(c.id)}
            className={cx(
              'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition',
              value === c.id ? 'border-transparent text-white shadow' : 'border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900',
            )}
            style={value === c.id ? { background: c.color } : undefined}
          >
            {value !== c.id && <span className="size-2.5 rounded-full" style={{ background: c.color }} />}
            {lt(c.name)}
          </button>
        ))}
        {sorted.length > 9 && (
          <button type="button" onClick={() => setAll(!all)} className="rounded-xl px-3 py-2 text-sm font-medium text-brand-700 dark:text-brand-400">
            {all ? t('Kamroq', 'Меньше') : t(`Yana ${sorted.length - 9} ta`, `Ещё ${sorted.length - 9}`)}
          </button>
        )}
      </div>
    </div>
  )
}
