import { useState } from 'react'
import { db, uid } from '../db/db'
import type { ID } from '../db/types'
import { useSettings } from '../state/settings'
import { today } from '../lib/dates'
import { Button, DateInput, Field, NumInput, Sheet, useUi } from './ui'

export function WeightSheet({ animalId, groupId, onClose, avg }: { animalId?: ID; groupId?: ID; onClose: () => void; avg?: boolean }) {
  const { t, farmId } = useSettings()
  const { toast } = useUi()
  const [kg, setKg] = useState<number | undefined>()
  const [date, setDate] = useState(today())
  return (
    <Sheet open onClose={onClose} title={t('Vazn yozish', 'Записать вес')}>
      <Field label={avg ? t("1 boshning o'rtacha vazni", 'Средний вес 1 головы') : t('Vazn', 'Вес')}>
        <NumInput autoFocus value={kg} onChange={setKg} decimals suffix="kg" />
      </Field>
      <Field label={t('Sana', 'Дата')}>
        <DateInput value={date} onChange={setDate} />
      </Field>
      <Button
        full
        disabled={!kg}
        onClick={async () => {
          await db.weights.add({ id: uid(), farmId, animalId, groupId, date, kg: kg!, createdAt: Date.now() })
          toast(t('Saqlandi', 'Сохранено'))
          onClose()
        }}
      >
        {t('Saqlash', 'Сохранить')}
      </Button>
    </Sheet>
  )
}
