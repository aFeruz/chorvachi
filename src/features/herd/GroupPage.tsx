import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Egg, MoreVertical, Pencil, Plus, Scale, SearchX, ShoppingCart, Trash2 } from 'lucide-react'
import { SpeciesAvatar } from '../../components/icons'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import {
  Badge, Button, Callout, Card, DateInput, Empty, Field, IconButton, KV, List, ListRow, NumInput, Page, Section, Segmented, Sheet, Stat, Textarea, useUi,
} from '../../components/ui'
import { movementLabel, purposeLabel, sexLabel, statusLabel, statusTone } from '../../components/labels'
import { WeightChart } from '../../components/Sparkline'
import { WeightSheet } from '../../components/WeightSheet'
import { SaleSheet } from './SaleSheet'
import { TxRow } from '../finance/TxRow'
import { addMovement, deleteGroup, deleteMovement } from '../../db/repo'
import { db } from '../../db/db'
import { breakEven } from '../../lib/calc/pricing'
import { formatDate, today } from '../../lib/dates'
import { formatNum, pct } from '../../lib/money'
import { FEED_CATEGORY_KEYS } from '../../db/seed'
import type { MovementType } from '../../db/types'

export function GroupPage() {
  const { id = '' } = useParams()
  const f = useFarm()
  const { t, lt, money, short, farmId } = useSettings()
  const { confirm, toast } = useUi()
  const nav = useNavigate()
  const g = f.groupMap.get(id)
  const [menu, setMenu] = useState(false)
  const [sale, setSale] = useState(false)
  const [weightOpen, setWeightOpen] = useState(false)
  const [mvOpen, setMvOpen] = useState(false)
  const [mvType, setMvType] = useState<MovementType>('death')
  const [mvCount, setMvCount] = useState<number | undefined>()
  const [mvAmount, setMvAmount] = useState<number | undefined>()
  const [mvDate, setMvDate] = useState(today())
  const [mvNote, setMvNote] = useState('')

  const txs = useMemo(() => f.expenses.filter((e) => e.scope === 'group' && e.targetId === id), [f.expenses, id])
  const incomes = useMemo(() => f.incomes.filter((e) => (e.scope === 'group' && e.targetId === id)), [f.incomes, id])

  if (!g) return <Page back="/herd" title="—"><Empty icon={<SearchX size={30} />} title={t('Topilmadi', 'Не найдено')} /></Page>

  const sp = f.speciesMap.get(g.speciesId)
  const gm = f.isGroupMode(g)
  const heads = f.headsOf(g)
  const cost = f.groupCost(g)
  const members = f.animals.filter((a) => a.groupId === g.id)
  const activeMembers = members.filter((a) => a.status === 'active')
  const movements = f.movements.filter((m) => m.groupId === g.id).sort((a, b) => b.date.localeCompare(a.date))
  const weights = f.weights.filter((w) => w.groupId === g.id)
  const avgW = gm ? f.groupWeightOf(g.id) : activeMembers.length ? activeMembers.reduce((s, a) => s + (f.weightOf(a.id) ?? 0), 0) / activeMembers.length : undefined

  const totalIn = movements.filter((m) => m.type === 'in' || m.type === 'birth').reduce((s, m) => s + m.count, 0)
  const deaths = movements.filter((m) => m.type === 'death').reduce((s, m) => s + m.count, 0)
  const soldHeads = movements.filter((m) => m.type === 'sold' || m.type === 'slaughter').reduce((s, m) => s + m.count, 0)
  const incomeTotal = incomes.reduce((s, i) => s + i.amount, 0) + (gm ? 0 : f.incomes.filter((i) => i.animalIds?.some((a) => members.some((m) => m.id === a))).reduce((s, i) => s + i.amount, 0))
  const feedKg = txs.filter((e) => FEED_CATEGORY_KEYS.includes(f.catMap.get(e.categoryId)?.key ?? '') && e.unit === 'kg').reduce((s, e) => s + (e.qty ?? 0), 0)

  // Ochiq guruh: hozir qolgan boshlarga to'g'ri keladigan tannarx
  const remainingCost = gm
    ? Math.max(0, cost.total - (totalIn ? (cost.total * soldHeads) / totalIn : 0))
    : activeMembers.reduce((s, a) => s + f.costOf(a.id).total, 0)
  const be = breakEven({ cost: remainingCost, heads: Math.max(1, gm ? heads : activeMembers.length), weightKg: avgW, dressingPct: sp?.dressingPct })

  const addMv = async () => {
    if (!mvCount) return
    await addMovement({ farmId, groupId: g.id, date: mvDate, type: mvType, count: mvCount, amount: mvType === 'in' ? mvAmount : undefined, note: mvNote.trim() || undefined })
    setMvOpen(false)
    setMvCount(undefined)
    setMvAmount(undefined)
    setMvNote('')
    toast(t('Saqlandi', 'Сохранено'))
  }

  return (
    <Page
      back
      title={g.name}
      actions={
        <>
          <IconButton onClick={() => nav(`/group/${g.id}/edit`)} aria-label="edit"><Pencil size={20} /></IconButton>
          <IconButton onClick={() => setMenu(true)} aria-label="menu"><MoreVertical size={20} /></IconButton>
        </>
      }
    >
      <Card className="mb-3 flex items-center gap-3">
        <SpeciesAvatar s={sp} />
        <div className="flex-1">
          <div className="font-semibold">{lt(sp?.name)} · {purposeLabel(t, g.purpose)}</div>
          <div className="text-sm text-stone-500">{t('Boshlangan', 'Начало')}: {formatDate(g.startDate)}</div>
        </div>
        {g.status === 'closed' && <Badge>{t('Yopilgan', 'Закрыта')}</Badge>}
      </Card>

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('Hozir', 'Сейчас')} value={`${formatNum(gm ? heads : activeMembers.length, 0)} ${t('bosh', 'гол.')}`} sub={gm && deaths ? t(`o'lim ${pct(totalIn ? (deaths / totalIn) * 100 : 0)}`, `падёж ${pct(totalIn ? (deaths / totalIn) * 100 : 0)}`) : undefined} />
        <Stat label={t('Jami xarajat', 'Всего затрат')} value={short(cost.total)} />
        <Stat label={t('Daromad', 'Доход')} value={short(incomeTotal)} tone="pos" />
        <Stat label={t('Natija', 'Итог')} value={short(incomeTotal - cost.total)} tone={incomeTotal - cost.total >= 0 ? 'pos' : 'neg'} sub={t('qolganlar hisobga olinmagan', 'без учёта остатка')} />
      </div>

      {g.status === 'active' && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {gm ? (
            <Button onClick={() => setSale(true)} disabled={!heads} icon={<ShoppingCart size={18} />}>{t('Sotish', 'Продать')}</Button>
          ) : (
            <Button onClick={() => nav(`/animal/new?species=${g.speciesId}&group=${g.id}`)} icon={<Plus size={18} />}>{t('Hayvon', 'Животное')}</Button>
          )}
          <Button variant="secondary" onClick={() => setWeightOpen(true)} icon={<Scale size={18} />} disabled={!gm}>{t('Vazn', 'Вес')}</Button>
          <Button variant="secondary" onClick={() => nav(`/expense/new?scope=group&target=${g.id}`)} icon={<Plus size={18} />}>{t('Xarajat', 'Расход')}</Button>
        </div>
      )}

      <Section title={t('Necha pulga sotish kerak?', 'За сколько продавать?')}>
        <Card>
          <KV label={t('Qolgan boshlar tannarxi', 'Себестоимость остатка')} value={money(remainingCost)} />
          <KV label={t('Zararsiz narx: 1 bosh', 'Без убытка: 1 гол.')} value={money(be.perHead)} strong />
          {be.perKgLive !== undefined && <KV label={t('Zararsiz: 1 kg tirik vazn', 'Без убытка: 1 кг живого веса')} value={money(be.perKgLive)} />}
          {be.perKgMeat !== undefined && <KV label={t("Zararsiz: 1 kg go'sht", 'Без убытка: 1 кг мяса')} value={money(be.perKgMeat)} />}
          {avgW !== undefined && <KV label={t("O'rtacha vazn", 'Средний вес')} value={`${formatNum(avgW)} kg`} />}
          {feedKg > 0 && <KV label={t('Sarflangan yem', 'Израсходовано корма')} value={`${formatNum(feedKg, 0)} kg${totalIn ? ` (${formatNum(feedKg / totalIn)} kg / ${t('bosh', 'гол.')})` : ''}`} />}
          {gm && feedKg > 0 && avgW && heads + soldHeads > 0 && (
            <KV label={t('Yem konversiyasi (FCR)', 'Конверсия корма (FCR)')} value={formatNum(feedKg / (avgW * (heads + soldHeads)), 2)} />
          )}
          {avgW === undefined && <p className="mt-2 text-xs text-stone-500">{t("1 kg narxini ko'rish uchun o'rtacha vaznni kiriting", 'Укажите средний вес, чтобы увидеть цену за кг')}</p>}
        </Card>
      </Section>

      {gm && weights.length >= 2 && (
        <Section title={t("O'rtacha vazn", 'Средний вес')}>
          <Card><WeightChart points={weights} /></Card>
        </Section>
      )}

      {gm ? (
        <Section title={t('Bosh soni harakati', 'Движение поголовья')} action={g.status === 'active' && <Button size="sm" variant="ghost" onClick={() => setMvOpen(true)}><Plus size={16} />{t("Qo'shish", 'Добавить')}</Button>}>
          {movements.length === 0 ? (
            <Card className="text-sm text-stone-500">{t("Hali harakat yo'q", 'Движений нет')}</Card>
          ) : (
            <List>
              {movements.map((m) => {
                const sign = m.type === 'in' || m.type === 'birth' ? '+' : '−'
                return (
                  <ListRow
                    key={m.id}
                    title={movementLabel(t, m.type)}
                    sub={[formatDate(m.date), m.note].filter(Boolean).join(' · ')}
                    right={
                      <div className="flex items-center gap-2">
                        <span className={sign === '+' ? 'font-semibold text-brand-700 dark:text-brand-400' : 'font-semibold text-red-600'}>{sign}{formatNum(m.count, 0)}</span>
                        <IconButton
                          onClick={async () => {
                            const ok = await confirm({ title: t("O'chirasizmi?", 'Удалить?'), text: m.linkedIncomeId || m.linkedExpenseId ? t("Bog'langan pul yozuvi ham o'chadi", 'Связанная денежная запись тоже удалится') : undefined, ok: t("O'chirish", 'Удалить'), danger: true })
                            if (ok) await deleteMovement(m.id)
                          }}
                        >
                          <Trash2 size={16} className="text-stone-400" />
                        </IconButton>
                      </div>
                    }
                  />
                )
              })}
            </List>
          )}
          {(g.purpose === 'eggs' || g.purpose === 'dairy' || sp?.key === 'layer' || sp?.key === 'bee') && (
            <Button variant="soft" full className="mt-2" icon={<Egg size={18} />} onClick={() => nav('/production')}>{t('Mahsulot jurnali', 'Журнал продукции')}</Button>
          )}
        </Section>
      ) : (
        <Section title={t('Hayvonlar', 'Животные')}>
          {members.length === 0 ? (
            <Card className="text-sm text-stone-500">{t("Guruhda hayvon yo'q", 'В группе нет животных')}</Card>
          ) : (
            <List>
              {members.map((a) => (
                <ListRow
                  key={a.id}
                  onClick={() => nav('/animal/' + a.id)}
                  left={<SpeciesAvatar s={sp} />}
                  title={<span className="flex items-center gap-2">{a.tag}{a.status !== 'active' && <Badge tone={statusTone(a.status)}>{statusLabel(t, a.status)}</Badge>}</span>}
                  sub={[sexLabel(t, a.sex), f.weightOf(a.id) ? `${formatNum(f.weightOf(a.id)!)} kg` : ''].filter(Boolean).join(' · ')}
                  right={<span className="text-sm font-semibold tabular-nums">{short(f.costOf(a.id).total)}</span>}
                />
              ))}
            </List>
          )}
        </Section>
      )}

      <Section title={t('Guruh xarajatlari', 'Расходы группы')}>
        {txs.length ? <List>{txs.map((e) => <TxRow key={e.id} kind="expense" e={e} />)}</List> : <Card className="text-sm text-stone-500">{t("Yo'q", 'Нет')}</Card>}
      </Section>
      {incomes.length > 0 && (
        <Section title={t('Guruh daromadlari', 'Доходы группы')}>
          <List>{incomes.map((e) => <TxRow key={e.id} kind="income" e={e} />)}</List>
        </Section>
      )}
      <div className="h-2" />

      <Sheet open={mvOpen} onClose={() => setMvOpen(false)} title={t('Bosh soni harakati', 'Движение поголовья')}>
        <Segmented
          className="mb-3"
          value={mvType}
          onChange={setMvType}
          options={[
            { value: 'death', label: t("O'ldi", 'Падёж') },
            { value: 'in', label: t('Kirim', 'Приход') },
            { value: 'birth', label: t("Tug'ildi", 'Приплод') },
          ]}
        />
        <Field label={t('Soni', 'Количество')}><NumInput autoFocus value={mvCount} onChange={setMvCount} suffix={t('bosh', 'гол.')} /></Field>
        {mvType === 'in' && (
          <Field label={t('Jami narxi', 'Общая цена')} hint={t('Xarajat sifatida yoziladi', 'Запишется как расход')}><NumInput value={mvAmount} onChange={setMvAmount} suffix={t("so'm", 'сум')} /></Field>
        )}
        <Field label={t('Sana', 'Дата')}><DateInput value={mvDate} onChange={setMvDate} /></Field>
        <Field label={t('Izoh', 'Примечание')}><Textarea value={mvNote} onChange={(e) => setMvNote(e.target.value)} /></Field>
        <p className="mb-3 text-xs text-stone-500">{t('Sotish uchun «Sotish» tugmasidan foydalaning — daromad ham yoziladi.', 'Для продажи используйте кнопку «Продать» — доход запишется автоматически.')}</p>
        <Button full disabled={!mvCount} onClick={addMv}>{t('Saqlash', 'Сохранить')}</Button>
      </Sheet>

      <Sheet open={menu} onClose={() => setMenu(false)} title={t('Amallar', 'Действия')}>
        <div className="space-y-2">
          <Button full variant="secondary" onClick={async () => { await db.groups.update(g.id, { status: g.status === 'active' ? 'closed' : 'active' }); setMenu(false) }}>
            {g.status === 'active' ? t('Guruhni yopish (arxiv)', 'Закрыть группу (архив)') : t('Qayta ochish', 'Открыть снова')}
          </Button>
          <Button
            full
            variant="danger"
            onClick={async () => {
              setMenu(false)
              const ok = await confirm({
                title: t("Guruhni o'chirasizmi?", 'Удалить группу?'),
                text: t("Guruhning bosh harakati, vazn va guruhga yozilgan xarajatlari o'chadi. Hayvonlar o'chmaydi — guruhsiz qoladi.", 'Удалятся движения, взвешивания и расходы группы. Животные останутся без группы.'),
                ok: t("O'chirish", 'Удалить'),
                danger: true,
              })
              if (!ok) return
              await deleteGroup(g.id)
              nav('/herd?tab=groups', { replace: true })
            }}
          >
            {t("O'chirish", 'Удалить')}
          </Button>
        </div>
      </Sheet>

      {g.status === 'closed' && (
        <Callout tone="info">{t("Guruh yopilgan. Hisobotlarda ma'lumotlari saqlanadi.", 'Группа закрыта. Данные сохраняются в отчётах.')}</Callout>
      )}

      {sale && <SaleSheet groupId={g.id} onClose={() => setSale(false)} />}
      {weightOpen && <WeightSheet groupId={g.id} avg onClose={() => setWeightOpen(false)} />}
    </Page>
  )
}
