import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Callout, DateInput, Field, IconButton, NumInput, Page, Select, Textarea, Toggle, useUi } from '../../components/ui'
import { CategoryGrid } from '../../components/CategoryGrid'
import { ScopePicker } from '../../components/ScopePicker'
import { deleteExpense, saveExpense } from '../../db/repo'
import { FEED_CATEGORY_KEYS } from '../../db/seed'
import type { ID, Scope } from '../../db/types'
import { today } from '../../lib/dates'

const UNITS = ['kg', 'tonna', 'l', 'dona', 'qop', "bog'", 'bosh', 'oy', 'kun', 'soat', 'kVt']

export function ExpenseForm() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const f = useFarm()
  const { t, farmId, money } = useSettings()
  const { confirm, toast } = useUi()
  const nav = useNavigate()
  const old = id ? f.expenses.find((e) => e.id === id) : undefined

  const [amount, setAmount] = useState<number | undefined>(old?.amount)
  const [categoryId, setCategoryId] = useState<ID>(old?.categoryId ?? sp.get('cat') ?? '')
  const [date, setDate] = useState(old?.date ?? today())
  const [qty, setQty] = useState<number | undefined>(old?.qty)
  const [unit, setUnit] = useState(old?.unit ?? 'kg')
  const [byUnit, setByUnit] = useState(false)
  const [unitPrice, setUnitPrice] = useState<number | undefined>(old?.qty && old.amount ? Math.round(old.amount / old.qty) : undefined)
  const [scope, setScope] = useState<Scope>(old?.scope ?? (sp.get('scope') as Scope) ?? 'farm')
  const [targetId, setTargetId] = useState<ID | undefined>(old?.targetId ?? sp.get('target') ?? undefined)
  const [feedItemId, setFeedItemId] = useState<ID | undefined>(old?.feedItemId ?? sp.get('feed') ?? undefined)
  const [note, setNote] = useState(old?.note ?? '')

  const usage = useMemo(() => {
    const m = new Map<ID, number>()
    for (const e of f.expenses) m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + 1)
    return m
  }, [f.expenses])

  const cat = f.catMap.get(categoryId)
  const isFeed = !!cat?.key && FEED_CATEGORY_KEYS.includes(cat.key)
  const total = byUnit ? Math.round((unitPrice ?? 0) * (qty ?? 0)) : amount ?? 0
  const valid = total > 0 && !!categoryId && (scope === 'farm' || !!targetId)

  const save = async () => {
    if (!valid) return
    await saveExpense(
      {
        farmId, date, categoryId, amount: total, qty: qty || undefined, unit: qty ? unit : undefined, scope,
        targetId: scope === 'farm' ? undefined : targetId, feedItemId: isFeed && qty ? feedItemId : undefined,
        note: note.trim() || undefined,
      },
      id,
    )
    toast(t('Saqlandi', 'Сохранено'))
    nav(-1)
  }

  const remove = async () => {
    if (!id) return
    const ok = await confirm({ title: t("Xarajatni o'chirasizmi?", 'Удалить расход?'), ok: t("O'chirish", 'Удалить'), danger: true })
    if (!ok) return
    await deleteExpense(id)
    toast(t("O'chirildi", 'Удалено'))
    nav(-1)
  }

  return (
    <Page
      back
      title={id ? t('Xarajatni tahrirlash', 'Изменить расход') : t('Yangi xarajat', 'Новый расход')}
      actions={id && <IconButton onClick={remove} aria-label="delete"><Trash2 size={20} className="text-red-600" /></IconButton>}
    >
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

      <CategoryGrid categories={f.categories.filter((c) => c.kind === 'expense')} value={categoryId} onChange={setCategoryId} usage={usage} />

      <Field label={t('Sana', 'Дата')}>
        <DateInput value={date} onChange={setDate} />
      </Field>

      {!byUnit && (
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label={t('Miqdori (ixtiyoriy)', 'Количество (необяз.)')}>
            <NumInput value={qty} onChange={setQty} decimals placeholder="—" />
          </Field>
          <Field label={t('Birlik', 'Ед.')}>
            <Select value={unit} onChange={(e) => setUnit(e.target.value)} options={UNITS.map((u) => ({ value: u, label: u }))} className="w-28" />
          </Field>
        </div>
      )}
      {byUnit && (
        <Field label={t('Birlik', 'Ед.')}>
          <Select value={unit} onChange={(e) => setUnit(e.target.value)} options={UNITS.map((u) => ({ value: u, label: u }))} />
        </Field>
      )}
      {!byUnit && qty && amount ? (
        <p className="-mt-2 mb-3 px-1 text-xs text-stone-500">
          1 {unit} = {money(amount / qty)}
        </p>
      ) : null}

      {isFeed && (
        <Field
          label={t("Yem omboriga qo'shish", 'Добавить на склад кормов')}
          hint={f.feedItems.length === 0 ? t("Ombor bo'limida yem turini yarating", 'Создайте корм в разделе «Склад»') : t("Miqdor omborga kirim bo'ladi", 'Количество поступит на склад')}
        >
          <Select
            value={feedItemId ?? ''}
            onChange={(e) => setFeedItemId(e.target.value || undefined)}
            options={f.feedItems.map((x) => ({ value: x.id, label: `${x.name} (${x.unit})` }))}
            placeholder={t("— qo'shilmasin —", '— не добавлять —')}
          />
        </Field>
      )}

      <ScopePicker scope={scope} targetId={targetId} onChange={(s, tid) => { setScope(s); setTargetId(tid) }} />

      <Field label={t('Izoh', 'Примечание')}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Masalan: 20 qop omuxta, Karimdan', 'Например: 20 мешков комбикорма')} />
      </Field>

      {categoryId === 'ex_purchase' && scope !== 'animal' && (
        <Callout tone="info">
          {t(
            "Maslahat: hayvonni sotib olganda narxini «Hayvon qo'shish» formasida kiriting — shunda u avtomatik o'sha hayvon tannarxiga yoziladi.",
            'Совет: цену покупки удобнее указывать в форме «Добавить животное» — она сразу попадёт в его себестоимость.',
          )}
        </Callout>
      )}

      <div className="mt-4 flex gap-3">
        <Button variant="secondary" onClick={() => nav(-1)}>{t('Bekor', 'Отмена')}</Button>
        <Button className="flex-1" disabled={!valid} onClick={save}>{t('Saqlash', 'Сохранить')}</Button>
      </div>
    </Page>
  )
}
