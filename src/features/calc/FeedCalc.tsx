import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Card, Field, IconButton, Input, KV, NumInput, Page, Section } from '../../components/ui'
import { formatNum } from '../../lib/money'

interface Row { name: string; kg?: number; price?: number }

export function FeedCalc() {
  const f = useFarm()
  const { t, money } = useSettings()
  const totalHeads = [...f.headsBySpecies.values()].reduce((a, b) => a + b, 0)
  const [heads, setHeads] = useState<number | undefined>(totalHeads || 10)
  const [days, setDays] = useState<number | undefined>(30)
  const [rows, setRows] = useState<Row[]>([
    { name: t('Pichan / beda', 'Сено'), kg: 2, price: 2000 },
    { name: t('Arpa', 'Ячмень'), kg: 0.4, price: 3500 },
    { name: t('Kepak', 'Отруби'), kg: 0.2, price: 2500 },
  ])
  const set = (i: number, p: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const perHeadDay = rows.reduce((s, r) => s + (r.kg ?? 0) * (r.price ?? 0), 0)
  const kgHeadDay = rows.reduce((s, r) => s + (r.kg ?? 0), 0)
  const H = heads ?? 0
  const D = days ?? 0

  return (
    <Page back title={t('Yem kalkulyatori', 'Калькулятор кормов')}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Bosh soni', 'Голов')}><NumInput value={heads} onChange={setHeads} /></Field>
        <Field label={t('Necha kunga', 'На сколько дней')}><NumInput value={days} onChange={setDays} suffix={t('kun', 'дн.')} /></Field>
      </div>
      <Section title={t('Ratsion (1 bosh / kun)', 'Рацион (1 гол./день)')}>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <Card key={i} className="p-3">
              <div className="mb-2 flex gap-2">
                <Input value={r.name} onChange={(e) => set(i, { name: e.target.value })} />
                <IconButton onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 size={18} className="text-stone-400" /></IconButton>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumInput value={r.kg} onChange={(v) => set(i, { kg: v })} decimals suffix={t('kg/kun', 'кг/д')} />
                <NumInput value={r.price} onChange={(v) => set(i, { price: v })} suffix={t("so'm/kg", 'сум/кг')} />
              </div>
              <div className="mt-1 text-right text-xs text-stone-500">
                {t('Jami', 'Всего')}: {formatNum((r.kg ?? 0) * H * D, 0)} kg · {money((r.kg ?? 0) * (r.price ?? 0) * H * D)}
              </div>
            </Card>
          ))}
        </div>
        <Button variant="soft" full className="mt-2" icon={<Plus size={18} />} onClick={() => setRows([...rows, { name: '' }])}>{t("Yem qo'shish", 'Добавить корм')}</Button>
      </Section>
      <Card>
        <KV label={t('1 bosh / kun', '1 гол./день')} value={`${formatNum(kgHeadDay, 2)} kg · ${money(perHeadDay)}`} />
        <KV label={t('Butun poda / kun', 'Всё стадо / день')} value={`${formatNum(kgHeadDay * H)} kg · ${money(perHeadDay * H)}`} />
        <KV label={t('Butun poda / oy', 'Всё стадо / месяц')} value={money(perHeadDay * H * 30.4)} />
        <KV label={t(`Jami ${D} kunga`, `Всего на ${D} дн.`)} value={<b>{formatNum(kgHeadDay * H * D, 0)} kg · {money(perHeadDay * H * D)}</b>} strong />
      </Card>
    </Page>
  )
}
