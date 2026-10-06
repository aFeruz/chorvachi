import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Baby, Bell, Check, DatabaseBackup, Pin, Plus, Syringe, Wheat } from 'lucide-react'
import { IconTile } from '../../components/icons'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Badge, Button, DateInput, Empty, Fab, Field, IconButton, Input, List, ListRow, Page, Sheet, Textarea } from '../../components/ui'
import { db, uid } from '../../db/db'
import { computeReminders, dueLabel } from '../../lib/reminders'
import { addDays, formatDate, today } from '../../lib/dates'

const ICON = {
  birth: [Baby, '#db2777'],
  health: [Syringe, '#dc2626'],
  custom: [Pin, '#2563eb'],
  feed: [Wheat, '#a16207'],
  backup: [DatabaseBackup, '#475569'],
} as const

export function RemindersPage() {
  const f = useFarm()
  const { t, settings, farmId } = useSettings()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(addDays(today(), 1))
  const [note, setNote] = useState('')
  const items = computeReminders(f, t, settings.lastBackup)
  return (
    <Page back title={t('Eslatmalar', 'Напоминания')}>
      {items.length === 0 ? (
        <Empty icon={<Bell size={30} />} title={t("Eslatma yo'q", 'Напоминаний нет')} text={t("Tug'ish, emlash va yem tugashi haqida eslatmalar avtomatik paydo bo'ladi.", 'Напоминания о родах, вакцинации и окончании корма появляются автоматически.')} />
      ) : (
        <List>
          {items.map((r) => {
            const d = dueLabel(t, r.date)
            return (
              <ListRow
                key={r.id}
                left={<IconTile icon={ICON[r.kind][0]} color={ICON[r.kind][1]} />}
                title={r.title}
                sub={[r.sub, formatDate(r.date)].filter(Boolean).join(' · ')}
                onClick={() => r.kind !== 'custom' && r.link && nav(r.link)}
                right={
                  <div className="flex items-center gap-1">
                    <Badge tone={d.tone}>{d.text}</Badge>
                    {r.customId && (
                      <IconButton onClick={() => db.reminders.update(r.customId!, { done: true })} aria-label="done">
                        <Check size={20} className="text-brand-600" />
                      </IconButton>
                    )}
                  </div>
                }
              />
            )
          })}
        </List>
      )}
      <Fab onClick={() => setOpen(true)} icon={<Plus />} label={t('Eslatma', 'Напоминание')} />
      <Sheet open={open} onClose={() => setOpen(false)} title={t('Yangi eslatma', 'Новое напоминание')}>
        <Field label={t('Nima qilish kerak', 'Что сделать')}><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label={t('Sana', 'Дата')}><DateInput value={date} onChange={setDate} /></Field>
        <Field label={t('Izoh', 'Примечание')}><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Button
          full
          disabled={!title.trim()}
          onClick={async () => {
            await db.reminders.add({ id: uid(), farmId, date, title: title.trim(), note: note.trim() || undefined, done: false, createdAt: Date.now() })
            setTitle('')
            setNote('')
            setOpen(false)
          }}
        >
          {t('Saqlash', 'Сохранить')}
        </Button>
      </Sheet>
    </Page>
  )
}
