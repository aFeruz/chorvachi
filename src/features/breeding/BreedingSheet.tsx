import { useState } from 'react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Callout, DateInput, Field, Input, Segmented, Select, Sheet, useUi } from '../../components/ui'
import { addBreeding } from '../../db/repo'
import { addDays, formatDate, today } from '../../lib/dates'
import type { ID } from '../../db/types'

export function BreedingSheet({ femaleId: fixedFemale, onClose }: { femaleId?: ID; onClose: () => void }) {
  const f = useFarm()
  const { t, lt, farmId } = useSettings()
  const { toast } = useUi()
  const females = f.activeAnimals.filter((a) => a.sex === 'f' && (f.speciesMap.get(a.speciesId)?.gestationDays ?? 0) > 0)
  const [femaleId, setFemaleId] = useState<ID>(fixedFemale ?? '')
  const female = f.animalMap.get(femaleId)
  const sp = female ? f.speciesMap.get(female.speciesId) : undefined
  const males = f.activeAnimals.filter((a) => a.sex === 'm' && a.speciesId === female?.speciesId)
  const [maleId, setMaleId] = useState<ID>('')
  const [maleNote, setMaleNote] = useState('')
  const [method, setMethod] = useState<'natural' | 'ai'>('natural')
  const [date, setDate] = useState(today())
  const gest = sp?.gestationDays ?? 0

  return (
    <Sheet open onClose={onClose} title={t("Qochirish / urug'lantirish", 'Случка / осеменение')}>
      {!fixedFemale && (
        <Field label={t('Ona hayvon', 'Самка')}>
          <Select
            value={femaleId}
            onChange={(e) => setFemaleId(e.target.value)}
            placeholder={t('— tanlang —', '— выберите —')}
            options={females.map((a) => ({ value: a.id, label: `${a.tag}${a.name ? ' · ' + a.name : ''}` }))}
          />
        </Field>
      )}
      <Field label={t('Usul', 'Способ')}>
        <Segmented value={method} onChange={setMethod} options={[{ value: 'natural', label: t('Tabiiy', 'Естественный') }, { value: 'ai', label: t("Sun'iy", 'Искусственный') }]} />
      </Field>
      {method === 'natural' && males.length > 0 && (
        <Field label={t('Ota (naslchi)', 'Производитель')}>
          <Select value={maleId} onChange={(e) => setMaleId(e.target.value)} placeholder={t('— boshqa / noma\'lum —', '— другой / неизвестно —')} options={males.map((a) => ({ value: a.id, label: a.tag + (a.name ? ' · ' + a.name : '') }))} />
        </Field>
      )}
      {(method === 'ai' || !maleId) && (
        <Field label={method === 'ai' ? t("Urug' (buqa nomi / raqami)", 'Семя (бык / номер)') : t('Ota haqida izoh', 'Об отце')}>
          <Input value={maleNote} onChange={(e) => setMaleNote(e.target.value)} />
        </Field>
      )}
      <Field label={t('Sana', 'Дата')}>
        <DateInput value={date} onChange={setDate} />
      </Field>
      {sp && gest > 0 && (
        <Callout tone="good">
          {lt(sp.name)}: {t(`bo'g'ozlik ~${gest} kun`, `беременность ~${gest} дн.`)}.{' '}
          {t("Kutilayotgan tug'ish", 'Ожидаемые роды')}: <b>{formatDate(addDays(date, gest))}</b>
        </Callout>
      )}
      <Button
        full
        className="mt-3"
        disabled={!femaleId}
        onClick={async () => {
          await addBreeding({
            farmId, femaleId, maleId: maleId || undefined, maleNote: maleNote.trim() || undefined, date, method, gestationDays: gest,
          })
          toast(t('Saqlandi. Eslatma qo\'yildi', 'Сохранено. Напоминание создано'))
          onClose()
        }}
      >
        {t('Saqlash', 'Сохранить')}
      </Button>
    </Sheet>
  )
}
