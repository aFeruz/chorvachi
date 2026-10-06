import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Milk, Plus, Trash2 } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Card, DateInput, Empty, Fab, Field, IconButton, List, ListRow, NumInput, Page, Section, Select, Sheet, Textarea, useUi } from '../../components/ui'
import { ScopePicker, useScopeName } from '../../components/ScopePicker'
import { PRODUCT_INCOME_CAT, PRODUCT_UNIT, productLabel } from '../../components/labels'
import { db, uid } from '../../db/db'
import { addDays, formatDate, today } from '../../lib/dates'
import { formatNum } from '../../lib/money'
import type { ID, ProductType, Scope } from '../../db/types'

const TYPES: ProductType[] = ['milk', 'eggs', 'wool', 'honey', 'manure', 'other']

export function ProductionPage() {
  const f = useFarm()
  const { t, farmId } = useSettings()
  const { confirm, toast } = useUi()
  const nav = useNavigate()
  const scopeName = useScopeName()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<ProductType>('milk')
  const [qty, setQty] = useState<number | undefined>()
  const [date, setDate] = useState(today())
  const [scope, setScope] = useState<Scope>('farm')
  const [targetId, setTargetId] = useState<ID | undefined>()
  const [note, setNote] = useState('')

  const last30 = useMemo(() => {
    const from = addDays(today(), -30)
    const m = new Map<ProductType, number>()
    for (const p of f.production) if (p.date >= from) m.set(p.type, (m.get(p.type) ?? 0) + p.qty)
    return [...m.entries()]
  }, [f.production])

  return (
    <Page back title={t('Mahsulot jurnali', 'Журнал продукции')}>
      {last30.length > 0 && (
        <Section title={t('Oxirgi 30 kun', 'За 30 дней')}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {last30.map(([k, v]) => (
              <Card key={k} className="p-3">
                <div className="text-xs text-stone-500">{productLabel(t, k)}</div>
                <div className="text-lg font-semibold">{formatNum(v)} {PRODUCT_UNIT[k]}</div>
                <div className="text-xs text-stone-500">{t('kuniga', 'в день')} ~{formatNum(v / 30)}</div>
              </Card>
            ))}
          </div>
        </Section>
      )}
      {f.production.length === 0 ? (
        <Empty icon={<Milk size={30} />} title={t("Hali yozuv yo'q", 'Записей нет')} text={t("Sut, tuxum, jun, asal kabi mahsulotlarni kunlik yozib boring. Sotganda «Daromad»ga aylantirasiz.", 'Записывайте надои, яйца, шерсть, мёд. При продаже превращайте в «Доход».')} />
      ) : (
        <List>
          {f.production.map((p) => (
            <ListRow
              key={p.id}
              title={`${productLabel(t, p.type)}: ${formatNum(p.qty)} ${p.unit}`}
              sub={`${formatDate(p.date)} · ${scopeName(p.scope, p.targetId)}${p.note ? ' · ' + p.note : ''}`}
              right={
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="soft" onClick={() => nav(`/income/new?cat=${PRODUCT_INCOME_CAT[p.type]}&qty=${p.qty}&unit=${encodeURIComponent(p.unit)}&scope=${p.scope}${p.targetId ? '&target=' + p.targetId : ''}`)}>
                    {t('Sotildi', 'Продано')}
                  </Button>
                  <IconButton
                    onClick={async () => {
                      if (await confirm({ title: t("O'chirasizmi?", 'Удалить?'), ok: t("O'chirish", 'Удалить'), danger: true })) await db.production.delete(p.id)
                    }}
                  >
                    <Trash2 size={16} className="text-stone-400" />
                  </IconButton>
                </div>
              }
            />
          ))}
        </List>
      )}
      <Fab onClick={() => setOpen(true)} icon={<Plus />} label={t('Yozish', 'Записать')} />
      <Sheet open={open} onClose={() => setOpen(false)} title={t('Mahsulot yozish', 'Записать продукцию')}>
        <Field label={t('Mahsulot', 'Продукция')}>
          <Select value={type} onChange={(e) => setType(e.target.value as ProductType)} options={TYPES.map((x) => ({ value: x, label: productLabel(t, x) }))} />
        </Field>
        <Field label={t('Miqdori', 'Количество')}><NumInput autoFocus value={qty} onChange={setQty} decimals suffix={PRODUCT_UNIT[type]} /></Field>
        <Field label={t('Sana', 'Дата')}><DateInput value={date} onChange={setDate} /></Field>
        <ScopePicker scope={scope} targetId={targetId} onChange={(s, id) => { setScope(s); setTargetId(id) }} label={t('Qayerdan', 'Источник')} />
        <Field label={t('Izoh', 'Примечание')}><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Button
          full
          disabled={!qty}
          onClick={async () => {
            await db.production.add({ id: uid(), farmId, date, type, qty: qty!, unit: PRODUCT_UNIT[type], scope, targetId: scope === 'farm' ? undefined : targetId, note: note.trim() || undefined, createdAt: Date.now() })
            setQty(undefined)
            setNote('')
            setOpen(false)
            toast(t('Saqlandi', 'Сохранено'))
          }}
        >
          {t('Saqlash', 'Сохранить')}
        </Button>
      </Sheet>
    </Page>
  )
}
