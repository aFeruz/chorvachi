import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Callout, DateInput, Field, IconButton, NumInput, Page, Select, Textarea, Toggle, useUi } from '../../components/ui'
import { CategoryGrid } from '../../components/CategoryGrid'
import { ScopePicker } from '../../components/ScopePicker'
import { deleteIncome, saveIncome } from '../../db/repo'
import type { ID, Scope } from '../../db/types'
import { today } from '../../lib/dates'

const UNITS = ['kg', 'l', 'dona', 'bosh', 'tonna', 'qop']

export function IncomeForm() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const f = useFarm()
  const { t, farmId, money } = useSettings()
  const { confirm, toast } = useUi()
  const nav = useNavigate()
  const old = id ? f.incomes.find((e) => e.id === id) : undefined

  const [amount, setAmount] = useState<number | undefined>(old?.amount)
  const [categoryId, setCategoryId] = useState<ID>(old?.categoryId ?? sp.get('cat') ?? '')
  const [date, setDate] = useState(old?.date ?? today())
  const [qty, setQty] = useState<number | undefined>(old?.qty ?? (sp.get('qty') ? Number(sp.get('qty')) : undefined))
  const [unit, setUnit] = useState(old?.unit ?? sp.get('unit') ?? 'kg')
  const [byUnit, setByUnit] = useState(false)
  const [unitPrice, setUnitPrice] = useState<number | undefined>()
  const [scope, setScope] = useState<Scope>(old?.scope ?? (sp.get('scope') as Scope) ?? 'farm')
  const [targetId, setTargetId] = useState<ID | undefined>(old?.targetId ?? sp.get('target') ?? undefined)
  const [note, setNote] = useState(old?.note ?? '')

  const usage = useMemo(() => {
    const m = new Map<ID, number>()
    for (const e of f.incomes) m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + 1)
    return m
  }, [f.incomes])

  const total = byUnit ? Math.round((unitPrice ?? 0) * (qty ?? 0)) : amount ?? 0
  const valid = total > 0 && !!categoryId && (scope === 'farm' || !!targetId)
  const soldAnimals = (old?.animalIds ?? []).map((a) => f.animalMap.get(a)).filter(Boolean)

  const save = async () => {
    if (!valid) return
    await saveIncome(
      {
        ...(old ?? {}),
        farmId, date, categoryId, amount: total, qty: qty || undefined, unit: qty ? unit : undefined,
        scope, targetId: scope === 'farm' ? undefined : targetId, note: note.trim() || undefined,
      },
      id,
    )
    toast(t('Saqlandi', 'Сохранено'))
    nav(-1)
  }

  const remove = async () => {
    if (!id) return
    const ok = await confirm({
      title: t("Daromadni o'chirasizmi?", 'Удалить доход?'),
      text: soldAnimals.length ? t("Sotilgan hayvonlar yana «faol» holatiga qaytadi.", 'Проданные животные снова станут «активными».') : undefined,
      ok: t("O'chirish", 'Удалить'),
      danger: true,
    })
    if (!ok) return
    await deleteIncome(id)
    toast(t("O'chirildi", 'Удалено'))
    nav(-1)
  }

  return (
    <Page
      back
      title={id ? t('Daromadni tahrirlash', 'Изменить доход') : t('Yangi daromad', 'Новый доход')}
      actions={id && <IconButton onClick={remove} aria-label="delete"><Trash2 size={20} className="text-red-600" /></IconButton>}
    >
      {!id && (
        <Callout tone="info">
          {t(
            "Hayvon sotayotgan bo'lsangiz, uni Poda bo'limida oching va «Sotish» tugmasini bosing — foyda/zarar avtomatik hisoblanadi.",
            'Если продаёте животное, откройте его в разделе «Стадо» и нажмите «Продать» — прибыль посчитается автоматически.',
          )}
        </Callout>
      )}
      {soldAnimals.length > 0 && (
        <Callout tone="good">
          {t('Sotilgan hayvonlar', 'Проданные животные')}: {soldAnimals.map((a) => a!.tag).join(', ')}
        </Callout>
      )}
      <div className="h-3" />
      <Toggle checked={byUnit} onChange={setByUnit} label={t('Narx × miqdor bilan hisoblash', 'Считать как цена × количество')} />
      {byUnit ? (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <Field label={t('1 birlik narxi', 'Цена за единицу')} className="mb-0">
            <NumInput value={unitPrice} onChange={setUnitPrice} suffix={t("so'm", 'сум')} />
          </Field>
          <Field label={t('Miqdori', 'Количество')} className="mb-0">
            <NumInput value={qty} onChange={setQty} decimals suffix={unit} />
          </Field>
          <div className="col-span-2 rounded-xl bg-stone-200/60 p-3 text-center dark:bg-stone-800">
            {t('Jami', 'Итого')}: <b className="tabular-nums">{money(total)}</b>
          </div>
        </div>
      ) : (
        <Field label={t('Summa', 'Сумма')}>
          <NumInput autoFocus={!id} value={amount} onChange={setAmount} suffix={t("so'm", 'сум')} className="[&_input]:h-14 [&_input]:text-2xl [&_input]:font-semibold" />
        </Field>
      )}

      <CategoryGrid categories={f.categories.filter((c) => c.kind === 'income')} value={categoryId} onChange={setCategoryId} usage={usage} />

      <Field label={t('Sana', 'Дата')}>
        <DateInput value={date} onChange={setDate} />
      </Field>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        {!byUnit && (
          <Field label={t('Miqdori (ixtiyoriy)', 'Количество (необяз.)')}>
            <NumInput value={qty} onChange={setQty} decimals placeholder="—" />
          </Field>
        )}
        <Field label={t('Birlik', 'Ед.')} className={byUnit ? 'col-span-2' : ''}>
          <Select value={unit} onChange={(e) => setUnit(e.target.value)} options={UNITS.map((u) => ({ value: u, label: u }))} className={byUnit ? '' : 'w-28'} />
        </Field>
      </div>

      <ScopePicker scope={scope} targetId={targetId} onChange={(s, tid) => { setScope(s); setTargetId(tid) }} label={t('Qayerdan', 'Источник')} />

      <Field label={t('Izoh', 'Примечание')}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="mt-4 flex gap-3">
        <Button variant="secondary" onClick={() => nav(-1)}>{t('Bekor', 'Отмена')}</Button>
        <Button className="flex-1" disabled={!valid} onClick={save}>{t('Saqlash', 'Сохранить')}</Button>
      </div>
    </Page>
  )
}
