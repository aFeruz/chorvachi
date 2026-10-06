import { useState } from 'react'
import { Check, Plus, Syringe, Trash2 } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Badge, Button, DateInput, Empty, Fab, Field, IconButton, Input, List, ListRow, NumInput, Page, Section, Select, Sheet, Textarea, useUi } from '../../components/ui'
import { ScopePicker, useScopeName } from '../../components/ScopePicker'
import { healthLabel } from '../../components/labels'
import { deleteHealth, saveHealth } from '../../db/repo'
import { db } from '../../db/db'
import { addDays, formatDate, today } from '../../lib/dates'
import { dueLabel } from '../../lib/reminders'
import type { HealthEvent, HealthType, ID, Scope } from '../../db/types'

const TYPES: HealthType[] = ['vaccine', 'deworm', 'treatment', 'checkup', 'other']
const PRESETS: Record<HealthType, string[]> = {
  vaccine: ['Oqsil (yashur)', 'Kuydirgi', 'Brutsellyoz', 'Enterotoksemiya', "Qo'y chechagi", 'Nyukasl'],
  deworm: ['Albendazol', 'Ivermektin', 'Fenbendazol'],
  treatment: ['Antibiotik', 'Vitamin', "Oyoq (tuyoq) davolash"],
  checkup: ["Bo'g'ozlikka tekshirish", "Umumiy ko'rik"],
  other: ['Qirqim (jun olish)', "Tuyoq kesish", 'Dezinfeksiya'],
}

export function HealthPage() {
  const f = useFarm()
  const { t, money, farmId } = useSettings()
  const { confirm, toast } = useUi()
  const scopeName = useScopeName()
  const [edit, setEdit] = useState<HealthEvent | 'new' | null>(null)
  const old = edit && edit !== 'new' ? edit : undefined
  const [type, setType] = useState<HealthType>('vaccine')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today())
  const [scope, setScope] = useState<Scope>('farm')
  const [targetId, setTargetId] = useState<ID | undefined>()
  const [cost, setCost] = useState<number | undefined>()
  const [nextDate, setNextDate] = useState('')
  const [note, setNote] = useState('')

  const open = (h?: HealthEvent) => {
    setType(h?.type ?? 'vaccine')
    setTitle(h?.title ?? '')
    setDate(h?.date ?? today())
    setScope(h?.scope ?? 'farm')
    setTargetId(h?.targetId)
    setCost(h?.cost)
    setNextDate(h?.nextDate ?? '')
    setNote(h?.note ?? '')
    setEdit(h ?? 'new')
  }

  const upcoming = f.health.filter((h) => h.nextDate && !h.nextDone).sort((a, b) => a.nextDate!.localeCompare(b.nextDate!))
  const history = [...f.health].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <Page back title={t("Sog'liq va emlash", 'Здоровье и вакцинация')}>
      {upcoming.length > 0 && (
        <Section title={t('Rejalashtirilgan', 'Запланировано')}>
          <List>
            {upcoming.map((h) => {
              const d = dueLabel(t, h.nextDate!)
              return (
                <ListRow
                  key={h.id}
                  title={`${healthLabel(t, h.type)}: ${h.title}`}
                  sub={`${scopeName(h.scope, h.targetId)} · ${formatDate(h.nextDate)}`}
                  right={
                    <div className="flex items-center gap-2">
                      <Badge tone={d.tone}>{d.text}</Badge>
                      <IconButton
                        aria-label="done"
                        onClick={async () => {
                          await db.health.update(h.id, { nextDone: true })
                          setType(h.type)
                          setTitle(h.title)
                          setDate(today())
                          setScope(h.scope)
                          setTargetId(h.targetId)
                          setCost(undefined)
                          setNextDate('')
                          setNote('')
                          setEdit('new')
                        }}
                      >
                        <Check size={20} className="text-brand-600" />
                      </IconButton>
                    </div>
                  }
                />
              )
            })}
          </List>
          <p className="mt-1 px-1 text-xs text-stone-500">{t('Belgi tugmasi — bajarildi deb belgilaydi va yangi yozuv ochadi', 'Кнопка-галочка отмечает выполненным и открывает новую запись')}</p>
        </Section>
      )}
      <Section title={t('Tarix', 'История')}>
        {history.length === 0 ? (
          <Empty icon={<Syringe size={30} />} title={t("Yozuv yo'q", 'Записей нет')} text={t("Emlash, davolash va gijjaga qarshi ishlov berishni yozing. Keyingi sanani kiritsangiz, eslatma qo'yiladi.", 'Записывайте вакцинации, лечение, дегельминтизацию. Укажите следующую дату — будет напоминание.')} />
        ) : (
          <List>
            {history.map((h) => (
              <ListRow key={h.id} onClick={() => open(h)} title={`${healthLabel(t, h.type)}: ${h.title}`} sub={`${formatDate(h.date)} · ${scopeName(h.scope, h.targetId)}`} right={h.cost ? <span className="text-sm tabular-nums">{money(h.cost)}</span> : undefined} />
            ))}
          </List>
        )}
      </Section>
      <Fab onClick={() => open()} icon={<Plus />} label={t('Yozish', 'Записать')} />

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={old ? t('Tahrirlash', 'Изменить') : t("Sog'liq yozuvi", 'Запись о здоровье')}>
        <Field label={t('Turi', 'Тип')}>
          <Select value={type} onChange={(e) => setType(e.target.value as HealthType)} options={TYPES.map((x) => ({ value: x, label: healthLabel(t, x) }))} />
        </Field>
        <Field label={t('Nomi (dori, vaksina)', 'Название (препарат)')}>
          <Input list="hp" value={title} onChange={(e) => setTitle(e.target.value)} />
          <datalist id="hp">{PRESETS[type].map((p) => <option key={p} value={p} />)}</datalist>
        </Field>
        <Field label={t('Sana', 'Дата')}><DateInput value={date} onChange={setDate} /></Field>
        <ScopePicker scope={scope} targetId={targetId} onChange={(s, id) => { setScope(s); setTargetId(id) }} />
        <Field label={t('Narxi', 'Стоимость')} hint={t('Xarajatlarga avtomatik yoziladi', 'Автоматически запишется в расходы')}>
          <NumInput value={cost} onChange={setCost} suffix={t("so'm", 'сум')} />
        </Field>
        <Field label={t('Keyingi sana (eslatma)', 'Следующая дата (напоминание)')}>
          <DateInput value={nextDate} onChange={setNextDate} />
          <div className="mt-2 flex gap-2">
            {[[30, t('1 oy', '1 мес')], [90, t('3 oy', '3 мес')], [180, t('6 oy', '6 мес')], [365, t('1 yil', '1 год')]].map(([d, l]) => (
              <button key={d} type="button" onClick={() => setNextDate(addDays(date, d as number))} className="rounded-lg bg-stone-200 px-2 py-1 text-xs dark:bg-stone-800">+{l}</button>
            ))}
          </div>
        </Field>
        <Field label={t('Izoh', 'Примечание')}><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="flex gap-2">
          {old && (
            <Button
              variant="ghost"
              className="text-red-600"
              onClick={async () => {
                const ok = await confirm({ title: t("O'chirasizmi?", 'Удалить?'), ok: t("O'chirish", 'Удалить'), danger: true })
                if (ok) {
                  await deleteHealth(old.id)
                  setEdit(null)
                }
              }}
            >
              <Trash2 size={18} />
            </Button>
          )}
          <Button
            className="flex-1"
            disabled={!title.trim() || (scope !== 'farm' && !targetId)}
            onClick={async () => {
              await saveHealth(
                { farmId, date, type, title: title.trim(), scope, targetId: scope === 'farm' ? undefined : targetId, cost, nextDate: nextDate || undefined, nextDone: old?.nextDone, note: note.trim() || undefined },
                old?.id,
              )
              setEdit(null)
              toast(t('Saqlandi', 'Сохранено'))
            }}
          >
            {t('Saqlash', 'Сохранить')}
          </Button>
        </div>
      </Sheet>
    </Page>
  )
}
