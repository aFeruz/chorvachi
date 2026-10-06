import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, cx, DateInput, Field, Input, NumInput, Page, Select, Textarea, useUi } from '../../components/ui'
import { PURPOSES, purposeLabel } from '../../components/labels'
import { db, uid } from '../../db/db'
import { addMovement } from '../../db/repo'
import type { GroupPurpose, ID } from '../../db/types'
import { today } from '../../lib/dates'
import { SpeciesIcon } from '../../components/icons'

export function GroupForm() {
  const { id } = useParams()
  const f = useFarm()
  const { t, lt, farmId, money } = useSettings()
  const { toast } = useUi()
  const nav = useNavigate()
  const old = id ? f.groupMap.get(id) : undefined
  const enabled = f.species.filter((s) => s.enabled || s.id === old?.speciesId)
  const [speciesId, setSpeciesId] = useState<ID>(old?.speciesId ?? enabled[0]?.id ?? 'sp_sheep')
  const [name, setName] = useState(old?.name ?? '')
  const [purpose, setPurpose] = useState<GroupPurpose>(old?.purpose ?? 'fattening')
  const [startDate, setStartDate] = useState(old?.startDate ?? today())
  const [note, setNote] = useState(old?.note ?? '')
  const [count, setCount] = useState<number | undefined>()
  const [price, setPrice] = useState<number | undefined>()
  const sp = f.speciesMap.get(speciesId)
  const groupMode = sp?.mode === 'group'

  const save = async () => {
    if (!name.trim()) return
    if (old) {
      await db.groups.update(old.id, { name: name.trim(), purpose, startDate, note: note.trim() || undefined })
      toast(t('Saqlandi', 'Сохранено'))
      nav(-1)
      return
    }
    const gid = uid()
    await db.groups.add({ id: gid, farmId, name: name.trim(), speciesId, purpose, startDate, status: 'active', note: note.trim() || undefined, createdAt: Date.now() })
    if (groupMode && count)
      await addMovement({ farmId, groupId: gid, date: startDate, type: 'in', count, amount: (price ?? 0) * count })
    toast(t('Guruh yaratildi', 'Группа создана'))
    nav('/group/' + gid, { replace: true })
  }

  return (
    <Page back title={old ? t('Guruhni tahrirlash', 'Изменить группу') : t('Yangi guruh', 'Новая группа')}>
      <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-300">{t('Hayvon turi', 'Вид животных')}</span>
      <div className="no-scrollbar -mx-3 mb-3 flex gap-2 overflow-x-auto px-3">
        {enabled.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={!!old}
            onClick={() => setSpeciesId(s.id)}
            className={cx(
              'flex shrink-0 flex-col items-center rounded-2xl border-2 px-3 py-2 text-xs font-medium',
              speciesId === s.id ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30' : 'border-transparent bg-white dark:bg-stone-900',
              old && speciesId !== s.id && 'hidden',
            )}
          >
            <SpeciesIcon s={s} size={26} />
            {lt(s.name)}
          </button>
        ))}
      </div>
      <p className="-mt-1 mb-3 px-1 text-xs text-stone-500">
        {groupMode
          ? t("Bu tur bosh soni bilan hisoblanadi (har birini alohida kiritish shart emas).", 'Этот вид учитывается количеством голов (без поштучного ввода).')
          : t("Bu guruhga hayvonlarni alohida qo'shasiz (har birining tannarxi bo'ladi).", 'В эту группу животные добавляются поштучно (у каждого своя себестоимость).')}
      </p>
      <Field label={t('Guruh nomi', 'Название группы')}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={groupMode ? t('Masalan: Broyler partiya #1', 'Например: Бройлер партия №1') : t("Masalan: Bo'rdoqi buqachalar", 'Например: Бычки на откорм')} />
      </Field>
      <Field label={t('Maqsadi', 'Назначение')}>
        <Select value={purpose} onChange={(e) => setPurpose(e.target.value as GroupPurpose)} options={PURPOSES.map((p) => ({ value: p, label: purposeLabel(t, p) }))} />
      </Field>
      <Field label={t('Boshlangan sana', 'Дата начала')}>
        <DateInput value={startDate} onChange={setStartDate} />
      </Field>
      {groupMode && !old && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Boshlang\'ich soni', 'Начальное кол-во')}>
            <NumInput value={count} onChange={setCount} suffix={t('bosh', 'гол.')} />
          </Field>
          <Field label={t('1 bosh narxi', 'Цена 1 головы')}>
            <NumInput value={price} onChange={setPrice} suffix={t("so'm", 'сум')} />
          </Field>
          {count && price ? <div className="col-span-2 -mt-2 mb-3 px-1 text-sm text-stone-500">{t('Jami', 'Итого')}: <b>{money(count * price)}</b></div> : null}
        </div>
      )}
      <Field label={t('Izoh', 'Примечание')}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="mt-4 flex gap-3">
        <Button variant="secondary" onClick={() => nav(-1)}>{t('Bekor', 'Отмена')}</Button>
        <Button className="flex-1" disabled={!name.trim()} onClick={save}>{t('Saqlash', 'Сохранить')}</Button>
      </div>
    </Page>
  )
}
