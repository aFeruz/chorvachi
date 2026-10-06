import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, ShoppingCart, Trash2, Wand2, Wheat } from 'lucide-react'
import { IconTile } from '../../components/icons'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Badge, Button, Callout, Card, DateInput, Empty, Fab, Field, IconButton, Input, KV, List, ListRow, NumInput, Page, Section, Segmented, Select, Sheet, useUi } from '../../components/ui'
import { db, uid } from '../../db/db'
import { addFeedMove, deleteFeedItem, deleteFeedMove } from '../../db/repo'
import { dailyFeedCost, dailyFeedUse, feedDaysLeft } from '../../lib/feed'
import { formatDate, today } from '../../lib/dates'
import { formatNum } from '../../lib/money'
import type { ID } from '../../db/types'

export function FeedPage() {
  const f = useFarm()
  const { t, lt, money, farmId } = useSettings()
  const { confirm, toast } = useUi()
  const nav = useNavigate()
  const [newOpen, setNewOpen] = useState(false)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kg')
  const [itemId, setItemId] = useState<ID | null>(null)
  const item = f.feedItems.find((x) => x.id === itemId)
  const [mvKind, setMvKind] = useState<'use' | 'in'>('use')
  const [mvQty, setMvQty] = useState<number | undefined>()
  const [mvPrice, setMvPrice] = useState<number | undefined>()
  const [mvDate, setMvDate] = useState(today())
  const [rScope, setRScope] = useState<'species' | 'group'>('species')
  const [rTarget, setRTarget] = useState('')
  const [rQty, setRQty] = useState<number | undefined>()

  const daily = dailyFeedCost(f)
  const stockValue = f.feedItems.reduce((s, x) => s + Math.max(0, x.stock) * x.avgPrice, 0)

  return (
    <Page back title={t('Yem ombori', 'Склад кормов')}>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="text-xs text-stone-500">{t('Ombordagi yem qiymati', 'Стоимость запасов')}</div>
          <div className="text-lg font-semibold">{money(stockValue)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-stone-500">{t('Ratsion bo\'yicha kunlik', 'По рациону в день')}</div>
          <div className="text-lg font-semibold">{money(daily)}</div>
          <div className="text-xs text-stone-500">{t('oyiga', 'в месяц')} ~{money(daily * 30.4)}</div>
        </Card>
      </div>
      {f.feedItems.length === 0 ? (
        <Empty
          icon={<Wheat size={30} />}
          title={t("Ombor bo'sh", 'Склад пуст')}
          text={t("Yem turlarini qo'shing (pichan, arpa, omuxta...). Kunlik ratsion kiritsangiz, yem necha kunga yetishini ko'rsatamiz.", 'Добавьте корма (сено, ячмень, комбикорм...). Укажите рацион — покажем, на сколько дней хватит.')}
          action={
            <div className="flex flex-col gap-2">
              <Button onClick={() => nav('/setup')} icon={<Wand2 size={18} />}>{t('Avtomatik to\'ldirish', 'Заполнить автоматически')}</Button>
              <Button variant="secondary" onClick={() => setNewOpen(true)} icon={<Plus size={18} />}>{t("Qo'lda qo'shish", 'Добавить вручную')}</Button>
            </div>
          }
        />
      ) : (
        <List>
          {f.feedItems.map((x) => {
            const d = feedDaysLeft(f, x.id)
            return (
              <ListRow
                key={x.id}
                onClick={() => setItemId(x.id)}
                left={<IconTile icon={Wheat} color="#a16207" />}
                title={x.name}
                sub={`${t('narx', 'цена')}: ${x.avgPrice ? money(x.avgPrice) + '/' + x.unit : t('hali xarid yo\'q', 'покупок ещё нет')}${dailyFeedUse(f, x.id) ? ` · ${formatNum(dailyFeedUse(f, x.id))} ${x.unit}/${t('kun', 'день')}` : ''}`}
                right={
                  <div>
                    <div className="font-semibold tabular-nums">{formatNum(x.stock)} {x.unit}</div>
                    {d !== undefined && <Badge tone={d < 7 ? 'red' : d < 20 ? 'amber' : 'green'}>{t(`${Math.floor(d)} kunga`, `на ${Math.floor(d)} дн.`)}</Badge>}
                  </div>
                }
              />
            )
          })}
        </List>
      )}
      <Callout tone="info">
        {t("Yem sotib olganda «Xarajat» qo'shing va yem turini tanlang — omborga avtomatik kirim bo'ladi.", 'При покупке корма добавьте «Расход» и выберите корм — он автоматически поступит на склад.')}
      </Callout>

      <Fab onClick={() => setNewOpen(true)} icon={<Plus />} label={t('Yem turi', 'Корм')} />

      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title={t('Yangi yem turi', 'Новый корм')}>
        <Field label={t('Nomi', 'Название')}><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Masalan: Beda pichani', 'Например: Сено люцерны')} /></Field>
        <Field label={t('Birlik', 'Единица')}><Select value={unit} onChange={(e) => setUnit(e.target.value)} options={['kg', 'tonna', 'qop', "bog'", 'l'].map((u) => ({ value: u, label: u }))} /></Field>
        <Button
          full
          disabled={!name.trim()}
          onClick={async () => {
            await db.feedItems.add({ id: uid(), farmId, name: name.trim(), unit, stock: 0, avgPrice: 0, createdAt: Date.now() })
            setName('')
            setNewOpen(false)
          }}
        >
          {t('Saqlash', 'Сохранить')}
        </Button>
      </Sheet>

      {item && (
        <Sheet open onClose={() => setItemId(null)} title={item.name}>
          <KV label={t('Qoldiq', 'Остаток')} value={`${formatNum(item.stock)} ${item.unit}`} strong />
          <KV label={t("O'rtacha narx", 'Средняя цена')} value={`${money(item.avgPrice)} / ${item.unit}`} />
          <Button variant="soft" full className="my-3" icon={<ShoppingCart size={18} />} onClick={() => nav(`/expense/new?cat=ex_hay&feed=${item.id}`)}>
            {t('Sotib olish (xarajat bilan)', 'Купить (с расходом)')}
          </Button>
          <Section title={t('Sarf / kirim', 'Расход / приход')}>
            <Segmented className="mb-2" value={mvKind} onChange={setMvKind} options={[{ value: 'use', label: t('Sarflandi', 'Израсходовано') }, { value: 'in', label: t("Kirim (o'zimizniki)", 'Приход (своё)') }]} />
            <div className="grid grid-cols-2 gap-2">
              <NumInput value={mvQty} onChange={setMvQty} decimals suffix={item.unit} placeholder={t('miqdor', 'кол-во')} />
              {mvKind === 'in' ? <NumInput value={mvPrice} onChange={setMvPrice} suffix={t("so'm", 'сум')} placeholder={t('narxi (1 birlik)', 'цена за ед.')} /> : <DateInput value={mvDate} onChange={setMvDate} />}
            </div>
            <Button
              full
              className="mt-2"
              disabled={!mvQty}
              icon={mvKind === 'use' ? <Minus size={18} /> : <Plus size={18} />}
              onClick={async () => {
                await addFeedMove({ farmId, feedItemId: item.id, date: mvDate, qty: mvKind === 'use' ? -mvQty! : mvQty!, price: mvKind === 'in' ? mvPrice ?? 0 : undefined })
                setMvQty(undefined)
                setMvPrice(undefined)
                toast(t('Saqlandi', 'Сохранено'))
              }}
            >
              {t('Yozish', 'Записать')}
            </Button>
          </Section>

          <Section title={t('Kunlik ratsion (1 bosh)', 'Рацион (1 гол./день)')}>
            {f.rations.filter((r) => r.feedItemId === item.id).map((r) => (
              <div key={r.id} className="flex items-center justify-between py-1 text-sm">
                <span>{r.scope === 'species' ? lt(f.speciesMap.get(r.targetId)?.name) : f.groupMap.get(r.targetId)?.name}</span>
                <span className="flex items-center gap-2">
                  {formatNum(r.perHeadDay, 2)} {item.unit}
                  <IconButton onClick={() => db.rations.delete(r.id)}><Trash2 size={16} className="text-stone-400" /></IconButton>
                </span>
              </div>
            ))}
            <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
              <Select value={rScope} onChange={(e) => { setRScope(e.target.value as 'species' | 'group'); setRTarget('') }} options={[{ value: 'species', label: t('Tur', 'Вид') }, { value: 'group', label: t('Guruh', 'Группа') }]} className="w-28" />
              <Select
                value={rTarget}
                onChange={(e) => setRTarget(e.target.value)}
                placeholder="—"
                options={rScope === 'species' ? f.species.filter((s) => s.enabled).map((s) => ({ value: s.id, label: lt(s.name) })) : f.groups.filter((g) => g.status === 'active').map((g) => ({ value: g.id, label: g.name }))}
              />
            </div>
            <div className="mt-2 flex gap-2">
              <NumInput className="flex-1" value={rQty} onChange={setRQty} decimals suffix={`${item.unit}/${t('kun', 'день')}`} />
              <Button
                disabled={!rTarget || !rQty}
                onClick={async () => {
                  await db.rations.add({ id: uid(), farmId, feedItemId: item.id, scope: rScope, targetId: rTarget, perHeadDay: rQty! })
                  setRQty(undefined)
                }}
              >
                {t("Qo'shish", 'Добавить')}
              </Button>
            </div>
          </Section>

          <Section title={t('Tarix', 'История')}>
            <div className="max-h-60 overflow-y-auto">
              {f.feedMoves.filter((m) => m.feedItemId === item.id).sort((a, b) => b.date.localeCompare(a.date)).map((m) => (
                <div key={m.id} className="flex items-center justify-between border-b border-stone-100 py-1.5 text-sm dark:border-stone-800">
                  <span>{formatDate(m.date)} {m.expenseId && <Badge tone="blue">{t('xarid', 'покупка')}</Badge>}</span>
                  <span className="flex items-center gap-2">
                    <span className={m.qty > 0 ? 'text-brand-700' : 'text-red-600'}>{m.qty > 0 ? '+' : ''}{formatNum(m.qty)} {item.unit}</span>
                    {!m.expenseId && <IconButton onClick={() => deleteFeedMove(m.id)}><Trash2 size={16} className="text-stone-400" /></IconButton>}
                  </span>
                </div>
              ))}
            </div>
          </Section>
          <Button
            variant="ghost"
            full
            className="text-red-600"
            onClick={async () => {
              const ok = await confirm({ title: t("Yem turini o'chirasizmi?", 'Удалить корм?'), text: t("Xarajatlar o'chmaydi, faqat ombor yozuvlari.", 'Расходы останутся, удалятся только складские записи.'), ok: t("O'chirish", 'Удалить'), danger: true })
              if (ok) {
                await deleteFeedItem(item.id)
                setItemId(null)
              }
            }}
          >
            {t("O'chirish", 'Удалить')}
          </Button>
        </Sheet>
      )}
    </Page>
  )
}
