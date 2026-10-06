import { useState } from 'react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Card, DateInput, Field, KV, Page, Segmented, Select } from '../../components/ui'
import { addDays, diffDays, formatDate, today } from '../../lib/dates'

export function GestationCalc() {
  const f = useFarm()
  const { t, lt } = useSettings()
  const list = f.species.filter((s) => s.gestationDays > 0)
  const [sid, setSid] = useState(list[0]?.id ?? 'sp_sheep')
  const [mode, setMode] = useState<'fwd' | 'back'>('fwd')
  const [date, setDate] = useState(today())
  const sp = f.speciesMap.get(sid)
  const g = sp?.gestationDays ?? 0
  const result = mode === 'fwd' ? addDays(date, g) : addDays(date, -g)
  const left = diffDays(today(), result)
  return (
    <Page back title={t("Tug'ish sanasi", 'Дата родов')}>
      <Field label={t('Hayvon turi', 'Вид')}>
        <Select value={sid} onChange={(e) => setSid(e.target.value)} options={list.map((s) => ({ value: s.id, label: `${lt(s.name)} — ${s.gestationDays} ${t('kun', 'дн.')}` }))} />
      </Field>
      <Segmented className="mb-3" value={mode} onChange={setMode} options={[{ value: 'fwd', label: t("Qochirish → tug'ish", 'Случка → роды') }, { value: 'back', label: t("Tug'ish → qochirish", 'Роды → случка') }]} />
      <Field label={mode === 'fwd' ? t('Qochirilgan sana', 'Дата случки') : t("Qachon tug'ishini xohlaysiz", 'Желаемая дата родов')}>
        <DateInput value={date} onChange={setDate} />
      </Field>
      <Card className="text-center">
        <div className="text-sm text-stone-500">{mode === 'fwd' ? t("Kutilayotgan tug'ish", 'Ожидаемые роды') : t('Qochirish kerak bo\'lgan sana', 'Дата случки')}</div>
        <div className="my-1 text-3xl font-bold text-brand-700 dark:text-brand-400">{formatDate(result)}</div>
        <div className="text-sm text-stone-500">{left >= 0 ? t(`${left} kundan keyin`, `через ${left} дн.`) : t(`${-left} kun oldin`, `${-left} дн. назад`)}</div>
      </Card>
      {mode === 'fwd' && (
        <Card className="mt-3">
          <KV label={t("Erta tug'ish (−5 kun)", 'Ранние роды (−5 дн.)')} value={formatDate(addDays(result, -5))} />
          <KV label={t("Kech tug'ish (+5 kun)", 'Поздние роды (+5 дн.)')} value={formatDate(addDays(result, 5))} />
          <KV label={t("Tayyorgarlik boshlash", 'Начать подготовку')} value={formatDate(addDays(result, -14))} />
        </Card>
      )}
    </Page>
  )
}
