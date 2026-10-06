import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Camera, X } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Callout, cx, DateInput, Field, Input, NumInput, Page, Segmented, Select, Textarea, useUi } from '../../components/ui'
import { nextTag, saveAnimal } from '../../db/repo'
import type { ID, Sex } from '../../db/types'
import { today } from '../../lib/dates'
import { sexOptions } from '../../components/SexLabel'
import { SpeciesIcon } from '../../components/icons'

/** Rasmni kichraytirib base64 qilish (ma'lumotlar bazasi yengil bo'lishi uchun) */
async function resizeImage(file: File, max = 480): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const k = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * k)
    c.height = Math.round(img.height * k)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.75)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function AnimalForm() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const f = useFarm()
  const { t, lt, farmId } = useSettings()
  const { toast } = useUi()
  const nav = useNavigate()
  const old = id ? f.animalMap.get(id) : undefined
  const oldPrice = old?.purchaseExpenseId ? f.expenses.find((e) => e.id === old.purchaseExpenseId)?.amount : undefined

  const individualSpecies = f.species.filter((s) => (s.enabled && s.mode === 'individual') || s.id === old?.speciesId)
  const [speciesId, setSpeciesId] = useState<ID>(old?.speciesId ?? sp.get('species') ?? individualSpecies[0]?.id ?? 'sp_sheep')
  const [tag, setTag] = useState(old?.tag ?? nextTag(f.animals.filter((a) => a.speciesId === speciesId).map((a) => a.tag)))
  const [name, setName] = useState(old?.name ?? '')
  const [sex, setSex] = useState<Sex>(old?.sex ?? 'f')
  const [breed, setBreed] = useState(old?.breed ?? '')
  const [birthDate, setBirthDate] = useState(old?.birthDate ?? '')
  const [origin, setOrigin] = useState<'bought' | 'born'>(old?.origin ?? 'bought')
  const [acquiredDate, setAcquiredDate] = useState(old?.acquiredDate ?? today())
  const [price, setPrice] = useState<number | undefined>(oldPrice)
  const [weight, setWeight] = useState<number | undefined>(old?.purchaseWeight)
  const [groupId, setGroupId] = useState<ID | undefined>(old?.groupId ?? sp.get('group') ?? undefined)
  const [motherId, setMotherId] = useState<ID | undefined>(old?.motherId)
  const [note, setNote] = useState(old?.note ?? '')
  const [photo, setPhoto] = useState<string | undefined>(old?.photo)
  const [count, setCount] = useState<number | undefined>(1)

  const breeds = useMemo(
    () => [...new Set(f.animals.filter((a) => a.speciesId === speciesId && a.breed).map((a) => a.breed!))],
    [f.animals, speciesId],
  )
  const tagTaken = f.animals.some((a) => a.tag === tag.trim() && a.id !== id && a.speciesId === speciesId)
  const bulk = !id && (count ?? 1) > 1
  const valid = tag.trim() && acquiredDate && (count ?? 1) >= 1

  const save = async () => {
    if (!valid) return
    const n = bulk ? Math.min(500, count ?? 1) : 1
    // Ko'p sonli qo'shishda raqamni ketma-ket oshiramiz: S-1, S-2...
    const m = tag.trim().match(/^(.*?)(\d+)$/)
    for (let i = 0; i < n; i++) {
      const tg = i === 0 ? tag.trim() : m ? m[1] + (parseInt(m[2], 10) + i) : `${tag.trim()}-${i + 1}`
      await saveAnimal(
        farmId,
        {
          tag: tg, name: bulk ? undefined : name.trim() || undefined, speciesId, sex, breed: breed.trim() || undefined,
          birthDate: birthDate || undefined, origin, acquiredDate, purchaseWeight: weight || undefined, groupId,
          motherId: motherId || undefined, note: note.trim() || undefined, photo: bulk ? undefined : photo,
        },
        origin === 'bought' ? price ?? 0 : 0,
        id,
      )
    }
    toast(bulk ? t(`${n} ta hayvon qo'shildi`, `Добавлено: ${n}`) : t('Saqlandi', 'Сохранено'))
    nav(-1)
  }

  const groups = f.groups.filter((g) => g.speciesId === speciesId && !f.isGroupMode(g) && (g.status === 'active' || g.id === groupId))
  const mothers = f.animals.filter((a) => a.speciesId === speciesId && a.sex === 'f' && a.id !== id)

  return (
    <Page back title={id ? t('Hayvonni tahrirlash', 'Изменить животное') : t("Hayvon qo'shish", 'Добавить животное')}>
      <div className="mb-3 flex items-center gap-4">
        <label className="relative grid size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl bg-stone-200 dark:bg-stone-800">
          {photo ? <img src={photo} className="size-full object-cover" alt="" /> : <Camera className="text-stone-500" />}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) setPhoto(await resizeImage(file))
            }}
          />
          {photo && (
            <button type="button" onClick={(e) => { e.preventDefault(); setPhoto(undefined) }} className="absolute top-1 right-1 rounded-full bg-black/50 p-0.5 text-white">
              <X size={14} />
            </button>
          )}
        </label>
        <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
          {individualSpecies.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={!!id}
              onClick={() => {
                setSpeciesId(s.id)
                setGroupId(undefined)
                setMotherId(undefined)
                if (!id) setTag(nextTag(f.animals.filter((a) => a.speciesId === s.id).map((a) => a.tag)))
              }}
              className={cx(
                'flex shrink-0 flex-col items-center rounded-2xl border-2 px-3 py-2 text-xs font-medium',
                speciesId === s.id ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30' : 'border-transparent bg-white dark:bg-stone-900',
                id && speciesId !== s.id && 'hidden',
              )}
            >
              <SpeciesIcon s={s} size={26} />
              {lt(s.name)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Raqam / sirg\'a', 'Номер / бирка')} hint={tagTaken ? <span className="text-amber-600">{t('Bu raqam band', 'Номер уже занят')}</span> : undefined}>
          <Input value={tag} onChange={(e) => setTag(e.target.value)} />
        </Field>
        {!id && (
          <Field label={t('Nechta?', 'Сколько?')} hint={bulk ? t('Raqamlar ketma-ket beriladi', 'Номера по порядку') : undefined}>
            <NumInput value={count} onChange={setCount} suffix={t('bosh', 'гол.')} />
          </Field>
        )}
        {!bulk && (
          <Field label={t('Laqabi (ixtiyoriy)', 'Кличка (необяз.)')} className={id ? '' : 'col-span-2'}>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        )}
      </div>

      <Field label={t('Jinsi', 'Пол')}>
        <Segmented value={sex} onChange={setSex} options={sexOptions(t)} />
      </Field>

      <Field label={t('Zoti', 'Порода')}>
        <Input list="breeds" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder={t('Masalan: Hisori, Golshtin', 'Например: Гиссарская, Голштинская')} />
        <datalist id="breeds">{breeds.map((b) => <option key={b} value={b} />)}</datalist>
      </Field>

      <Field label={t('Qayerdan', 'Происхождение')}>
        <Segmented value={origin} onChange={setOrigin} options={[{ value: 'bought', label: t('Sotib olingan', 'Куплено') }, { value: 'born', label: t("Fermada tug'ilgan", 'Родилось на ферме') }]} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={origin === 'bought' ? t('Sotib olingan sana', 'Дата покупки') : t("Tug'ilgan sana", 'Дата рождения')}>
          <DateInput value={acquiredDate} onChange={(v) => { setAcquiredDate(v); if (origin === 'born') setBirthDate(v) }} />
        </Field>
        <Field label={t("Tug'ilgan sana (taxminan)", 'Дата рождения (прибл.)')}>
          <DateInput value={origin === 'born' ? birthDate || acquiredDate : birthDate} onChange={setBirthDate} />
        </Field>
      </div>

      {origin === 'bought' && (
        <Field label={bulk ? t('1 boshning narxi', 'Цена за 1 голову') : t('Sotib olish narxi', 'Цена покупки')} hint={t('Tannarxga avtomatik qo\'shiladi', 'Автоматически войдёт в себестоимость')}>
          <NumInput value={price} onChange={setPrice} suffix={t("so'm", 'сум')} />
        </Field>
      )}
      <Field label={t('Vazni', 'Вес')} hint={t('Ixtiyoriy — o\'sishni kuzatish uchun', 'Необязательно — для учёта привеса')}>
        <NumInput value={weight} onChange={setWeight} decimals suffix="kg" />
      </Field>

      {groups.length > 0 && (
        <Field label={t('Guruh', 'Группа')}>
          <Select value={groupId ?? ''} onChange={(e) => setGroupId(e.target.value || undefined)} options={groups.map((g) => ({ value: g.id, label: g.name }))} placeholder={t('— guruhsiz —', '— без группы —')} />
        </Field>
      )}
      {origin === 'born' && mothers.length > 0 && (
        <Field label={t('Onasi', 'Мать')}>
          <Select value={motherId ?? ''} onChange={(e) => setMotherId(e.target.value || undefined)} options={mothers.map((a) => ({ value: a.id, label: a.tag + (a.name ? ' · ' + a.name : '') }))} placeholder="—" />
        </Field>
      )}
      <Field label={t('Izoh', 'Примечание')}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      {!id && origin === 'born' && (
        <Callout tone="info">
          {t("Maslahat: tug'ishni «Tug'ildi» bo'limidan kiritsangiz, ona bilan bog'lanadi va statistika yuritiladi.", 'Совет: вносите окот через «Приплод» — так он свяжется с матерью и попадёт в статистику.')}
        </Callout>
      )}

      <div className="mt-4 flex gap-3">
        <Button variant="secondary" onClick={() => nav(-1)}>{t('Bekor', 'Отмена')}</Button>
        <Button className="flex-1" disabled={!valid} onClick={save}>{t('Saqlash', 'Сохранить')}</Button>
      </div>
    </Page>
  )
}
