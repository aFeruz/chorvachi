import type { ID, Scope } from '../db/types'
import { useFarm } from '../state/farm'
import { useSettings } from '../state/settings'
import { Field, Segmented, Select } from './ui'

/** Xarajat/daromad kimga tegishli: butun ferma, tur, guruh yoki bitta hayvon */
export function ScopePicker({
  scope, targetId, onChange, label, allowAnimal = true, includeInactive,
}: {
  scope: Scope
  targetId?: ID
  onChange: (scope: Scope, targetId?: ID) => void
  label?: string
  allowAnimal?: boolean
  includeInactive?: ID
}) {
  const f = useFarm()
  const { t, lt } = useSettings()
  const opts: { value: Scope; label: string }[] = [
    { value: 'farm', label: t('Ferma', 'Ферма') },
    { value: 'species', label: t('Tur', 'Вид') },
    { value: 'group', label: t('Guruh', 'Группа') },
  ]
  if (allowAnimal) opts.push({ value: 'animal', label: t('Hayvon', 'Животное') })

  const targets =
    scope === 'species'
      ? f.species.filter((s) => s.enabled || s.id === targetId).map((s) => ({ value: s.id, label: lt(s.name) }))
      : scope === 'group'
        ? f.groups
            .filter((g) => g.status === 'active' || g.id === targetId)
            .map((g) => ({ value: g.id, label: g.name }))
        : scope === 'animal'
          ? f.animals
              .filter((a) => a.status === 'active' || a.id === targetId || a.id === includeInactive)
              .map((a) => ({ value: a.id, label: `${a.tag}${a.name ? ' · ' + a.name : ''} (${lt(f.speciesMap.get(a.speciesId)?.name)})` }))
          : []

  return (
    <div className="mb-3">
      <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-300">{label ?? t('Kimga tegishli', 'К кому относится')}</span>
      <Segmented value={scope} onChange={(s) => onChange(s, undefined)} options={opts} />
      {scope !== 'farm' && (
        <Field className="mt-2 mb-0">
          <Select
            value={targetId ?? ''}
            onChange={(e) => onChange(scope, e.target.value || undefined)}
            options={targets}
            placeholder={t('— tanlang —', '— выберите —')}
          />
        </Field>
      )}
      <p className="mt-1 px-1 text-xs text-stone-500">
        {scope === 'farm' && t("Xarajat barcha hayvonlar o'rtasida (shartli bosh bo'yicha) taqsimlanadi", 'Расход делится между всеми животными (по условным головам)')}
        {scope === 'species' && t("Shu turdagi barcha hayvonlarga teng bo'linadi", 'Делится поровну на всех животных этого вида')}
        {scope === 'group' && t("Guruhdagi hayvonlarga teng bo'linadi", 'Делится поровну на животных группы')}
        {scope === 'animal' && t('Faqat shu hayvon tannarxiga qo\'shiladi', 'Добавляется только к себестоимости этого животного')}
      </p>
    </div>
  )
}

export function useScopeName() {
  const f = useFarm()
  const { t, lt } = useSettings()
  return (scope: Scope, targetId?: ID) => {
    if (scope === 'farm') return t('Butun ferma', 'Вся ферма')
    if (scope === 'species') {
      const s = f.speciesMap.get(targetId ?? '')
      return s ? lt(s.name) : '—'
    }
    if (scope === 'group') return f.groupMap.get(targetId ?? '')?.name ?? '—'
    const a = f.animalMap.get(targetId ?? '')
    return a ? a.tag : '—'
  }
}
