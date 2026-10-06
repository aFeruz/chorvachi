import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Minus, Plus } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Callout, Card, DateInput, Field, IconButton, Input, NumInput, Page, Segmented, Select, Textarea, useUi } from '../../components/ui'
import { recordBirth, type KidInput } from '../../db/repo'
import { formatDate, today } from '../../lib/dates'
import type { ID } from '../../db/types'
import { sexOptions } from '../../components/SexLabel'

export function BirthForm() {
  const [sp] = useSearchParams()
  const f = useFarm()
  const { t, lt, farmId } = useSettings()
  const { toast } = useUi()
  const nav = useNavigate()
  const females = f.activeAnimals.filter((a) => a.sex === 'f' && (f.speciesMap.get(a.speciesId)?.gestationDays ?? 0) > 0)
  // bo'g'oz bo'lganlar ro'yxat boshida
  const pendingByFemale = new Map(f.breedings.filter((b) => b.status === 'pending').map((b) => [b.femaleId, b]))
  females.sort((a, b) => (pendingByFemale.has(b.id) ? 1 : 0) - (pendingByFemale.has(a.id) ? 1 : 0))

  const [motherId, setMotherId] = useState<ID>(sp.get('mother') ?? '')
  const mother = f.animalMap.get(motherId)
  const species = mother ? f.speciesMap.get(mother.speciesId) : undefined
  const pending = mother ? pendingByFemale.get(mother.id) : undefined
  const [date, setDate] = useState(today())
  const [kids, setKids] = useState<KidInput[]>([])
  const [dead, setDead] = useState<number | undefined>(0)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const tagFor = (i: number) => (mother ? `${mother.tag}/${(f.births.filter((b) => b.motherId === mother.id).length ? `${f.births.filter((b) => b.motherId === mother.id).length + 1}.` : '')}${i + 1}` : String(i + 1))

  useEffect(() => {
    if (!mother) return
    const n = Math.max(1, Math.round(species?.avgLitter ?? 1))
    setKids(Array.from({ length: n }, (_, i) => ({ tag: tagFor(i), sex: i % 2 ? 'm' : 'f' })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motherId])

  const setKid = (i: number, patch: Partial<KidInput>) => setKids(kids.map((k, j) => (j === i ? { ...k, ...patch } : k)))

  const save = async () => {
    if (!mother) return
    setBusy(true)
    try {
      await recordBirth({ farmId, motherId: mother.id, breedingId: pending?.id, date, kids: kids.map((k) => ({ ...k, tag: k.tag.trim() || '?' })), dead: dead ?? 0, note: note.trim() || undefined })
      toast(t(`${kids.length} ta bola podaga qo'shildi`, `В стадо добавлено: ${kids.length}`))
      nav(-1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page back title={t("Tug'ish (bola qo'shish)", 'Окот / отёл')}>
      <Field label={t('Onasi', 'Мать')}>
        <Select
          value={motherId}
          onChange={(e) => setMotherId(e.target.value)}
          placeholder={t('— tanlang —', '— выберите —')}
          options={females.map((a) => ({
            value: a.id,
            label: `${a.tag}${a.name ? ' · ' + a.name : ''}${pendingByFemale.has(a.id) ? ' — ' + t('kutilmoqda', 'ожидается') + ' ' + formatDate(pendingByFemale.get(a.id)!.expectedDate) : ''}`,
          }))}
        />
      </Field>
      {females.length === 0 && (
        <Callout tone="warn">{t("Avval urg'ochi hayvon qo'shing (qo'y, sigir, echki...)", 'Сначала добавьте самку (овца, корова, коза...)')}</Callout>
      )}
      {mother && (
        <>
          {pending ? (
            <Callout tone="good">
              {t('Qochirilgan', 'Случка')}: {formatDate(pending.date)} · {t('kutilgan', 'ожидалось')}: {formatDate(pending.expectedDate)}
            </Callout>
          ) : (
            <Callout tone="info">{t("Bu ona uchun qochirish yozilmagan — mayli, tug'ish baribir saqlanadi.", 'Случка не записана — ничего, роды всё равно сохранятся.')}</Callout>
          )}
          <div className="h-3" />
          <Field label={t("Tug'ilgan sana", 'Дата родов')}>
            <DateInput value={date} onChange={setDate} />
          </Field>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-stone-600 dark:text-stone-300">{t('Tirik bolalar', 'Живой приплод')} ({lt(species?.name)})</span>
            <div className="flex items-center gap-1">
              <IconButton onClick={() => setKids(kids.slice(0, -1))} disabled={kids.length === 0} className="bg-white dark:bg-stone-900"><Minus size={18} /></IconButton>
              <span className="w-8 text-center text-lg font-bold">{kids.length}</span>
              <IconButton onClick={() => setKids([...kids, { tag: tagFor(kids.length), sex: 'f' }])} className="bg-white dark:bg-stone-900"><Plus size={18} /></IconButton>
            </div>
          </div>
          <div className="mb-3 space-y-2">
            {kids.map((k, i) => (
              <Card key={i} className="p-3">
                <div className="grid grid-cols-[1fr_7rem] gap-2">
                  <Input value={k.tag} onChange={(e) => setKid(i, { tag: e.target.value })} placeholder={t('Raqam', 'Номер')} />
                  <NumInput value={k.weight} onChange={(v) => setKid(i, { weight: v })} decimals suffix="kg" placeholder={t('vazn', 'вес')} />
                </div>
                <Segmented className="mt-2" value={k.sex} onChange={(s) => setKid(i, { sex: s })} options={sexOptions(t)} />
              </Card>
            ))}
          </div>
          <Field label={t("O'lik tug'ilganlar", 'Мертворождённые')}>
            <NumInput value={dead} onChange={setDead} />
          </Field>
          <Field label={t('Izoh', 'Примечание')}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Callout tone="info">
            {t("Bolalar onaning guruhiga avtomatik qo'shiladi. Ularning tannarxi tug'ilgandan keyingi xarajatlardan hisoblanadi.", 'Приплод автоматически попадёт в группу матери. Его себестоимость считается из расходов после рождения.')}
          </Callout>
          <Button full size="lg" className="mt-4" disabled={busy || (kids.length === 0 && !dead)} onClick={save}>
            {t('Saqlash', 'Сохранить')}
          </Button>
        </>
      )}
    </Page>
  )
}
