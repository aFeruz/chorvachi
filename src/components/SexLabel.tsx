import { Mars, Venus } from 'lucide-react'
import type { Sex } from '../db/types'
import type { T } from '../state/settings'

export function SexLabel({ sex, t }: { sex: Sex; t: T }) {
  return sex === 'f' ? (
    <span className="inline-flex items-center gap-1.5">
      <Venus size={16} className="text-pink-600" />
      {t("Urg'ochi", 'Самка')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5">
      <Mars size={16} className="text-sky-600" />
      {t('Erkak', 'Самец')}
    </span>
  )
}

export const sexOptions = (t: T) => [
  { value: 'f' as Sex, label: <SexLabel sex="f" t={t} /> },
  { value: 'm' as Sex, label: <SexLabel sex="m" t={t} /> },
]
