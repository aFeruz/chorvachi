import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Baby, Heart, Plus, Trash2, X } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Badge, Button, Card, Chips, Empty, Fab, IconButton, List, ListRow, Page, Segmented, Stat, useUi } from '../../components/ui'
import { BreedingSheet } from './BreedingSheet'
import { deleteBirth } from '../../db/repo'
import { db } from '../../db/db'
import { reproStats } from '../../lib/calc/reproduction'
import { diffDays, formatDate, startOfYear, today } from '../../lib/dates'
import { formatNum, pct } from '../../lib/money'
import { dueLabel } from '../../lib/reminders'
import { SpeciesAvatar } from '../../components/icons'

type Tab = 'pending' | 'births' | 'all'

export function BreedingPage() {
  const f = useFarm()
  const { t } = useSettings()
  const { confirm, toast } = useUi()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('pending')
  const [period, setPeriod] = useState<'year' | 'all'>('year')
  const [open, setOpen] = useState(false)
  const from = period === 'year' ? startOfYear(today()) : undefined
  const stats = useMemo(() => reproStats(f.breedings, f.births, from), [f.breedings, f.births, from])
  const label = (id: string) => {
    const a = f.animalMap.get(id)
    return a ? `${a.tag}${a.name ? ' · ' + a.name : ''}` : '—'
  }
  const spOf = (id: string) => f.speciesMap.get(f.animalMap.get(id)?.speciesId ?? '')
  const pending = f.breedings.filter((b) => b.status === 'pending').sort((a, b) => a.expectedDate.localeCompare(b.expectedDate))
  const births = [...f.births].sort((a, b) => b.date.localeCompare(a.date))
  const all = [...f.breedings].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <Page back title={t("Ko'payish", 'Воспроизводство')}>
      <Chips value={period} onChange={setPeriod} options={[{ value: 'year', label: t('Shu yil', 'Этот год') }, { value: 'all', label: t('Hammasi', 'Всё время') }]} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('Bolalar (tirik)', 'Приплод (живой)')} value={stats.bornAlive} sub={t(`${stats.births} ta tug'ish`, `${stats.births} родов`)} />
        <Stat label={t("100 onaga bola", 'Выход на 100 маток')} value={formatNum(stats.yieldPer100, 0)} sub={t("qo'zilash / buzoqlash %", 'деловой выход')} />
        <Stat label={t("Bo'g'ozlik darajasi", 'Оплодотворяемость')} value={stats.confirmedBirths + stats.failed ? pct(stats.conceptionPct, 0) : '—'} sub={t(`${stats.failed} ta qaytgan`, `${stats.failed} перегулов`)} />
        <Stat label={t("O'lik tug'ilish", 'Мертворождение')} value={pct(stats.stillbirthPct, 0)} tone={stats.stillbirthPct > 10 ? 'neg' : undefined} sub={t(`o'rtacha ${formatNum(stats.litterAvg)} bola`, `в среднем ${formatNum(stats.litterAvg)}`)} />
      </div>

      <Segmented
        className="mb-3"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pending', label: `${t("Bo'g'ozlar", 'Стельные')} (${pending.length})` },
          { value: 'births', label: t("Tug'ishlar", 'Роды') },
          { value: 'all', label: t('Qochirishlar', 'Случки') },
        ]}
      />

      {tab === 'pending' &&
        (pending.length === 0 ? (
          <Empty icon={<Baby size={30} />} title={t("Bo'g'oz hayvon yo'q", 'Нет стельных')} text={t("Qochirish sanasini yozsangiz, tug'ish sanasi avtomatik hisoblanadi va eslatma qo'yiladi.", 'Запишите дату случки — дата родов посчитается автоматически, и появится напоминание.')} action={<Button onClick={() => setOpen(true)} icon={<Plus size={18} />}>{t('Qochirish yozish', 'Записать случку')}</Button>} />
        ) : (
          <div className="space-y-2">
            {pending.map((b) => {
              const d = dueLabel(t, b.expectedDate)
              const total = diffDays(b.date, b.expectedDate)
              const passed = Math.min(total, Math.max(0, diffDays(b.date, today())))
              return (
                <Card key={b.id}>
                  <div className="flex items-center gap-3">
                    <SpeciesAvatar s={spOf(b.femaleId)} />
                    <div className="min-w-0 flex-1">
                      <button className="font-semibold" onClick={() => nav('/animal/' + b.femaleId)}>{label(b.femaleId)}</button>
                      <div className="text-sm text-stone-500">
                        {formatDate(b.date)} → <b>{formatDate(b.expectedDate)}</b>
                        {b.maleId ? ` · ${t('ota', 'отец')}: ${label(b.maleId)}` : b.maleNote ? ` · ${t('ota', 'отец')}: ${b.maleNote}` : ''}
                      </div>
                    </div>
                    <Badge tone={d.tone}>{d.text}</Badge>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-stone-100 dark:bg-stone-800">
                    <div className="h-2 rounded-full bg-pink-500" style={{ width: `${total ? (passed / total) * 100 : 0}%` }} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1" icon={<Baby size={16} />} onClick={() => nav(`/birth/new?mother=${b.femaleId}`)}>{t("Tug'di", 'Родила')}</Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<X size={16} />}
                      onClick={async () => {
                        const ok = await confirm({ title: t("Bo'g'oz bo'lmadi (qaytdi)?", 'Не оплодотворилась (перегул)?'), ok: t('Ha', 'Да') })
                        if (ok) await db.breedings.update(b.id, { status: 'failed' })
                      }}
                    >
                      {t('Qaytdi', 'Перегул')}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        ))}

      {tab === 'births' &&
        (births.length === 0 ? (
          <Empty icon={<Baby size={30} />} title={t("Tug'ishlar yo'q", 'Родов нет')} action={<Button onClick={() => nav('/birth/new')} icon={<Baby size={18} />}>{t("Tug'ish yozish", 'Записать роды')}</Button>} />
        ) : (
          <List>
            {births.map((b) => (
              <ListRow
                key={b.id}
                left={<SpeciesAvatar s={spOf(b.motherId)} />}
                title={label(b.motherId)}
                sub={`${formatDate(b.date)} · ${t('tirik', 'живых')}: ${b.alive}${b.dead ? ` · ${t("o'lik", 'мёртвых')}: ${b.dead}` : ''}`}
                onClick={() => nav('/animal/' + b.motherId)}
                right={
                  <IconButton
                    onClick={async (e) => {
                      e.stopPropagation()
                      const ok = await confirm({ title: t("Tug'ish yozuvini o'chirasizmi?", 'Удалить запись о родах?'), text: t("Shu tug'ishda qo'shilgan bolalar ham o'chadi.", 'Будет удалён и приплод из этой записи.'), ok: t("O'chirish", 'Удалить'), danger: true })
                      if (ok) {
                        await deleteBirth(b.id)
                        toast(t("O'chirildi", 'Удалено'))
                      }
                    }}
                  >
                    <Trash2 size={18} className="text-stone-400" />
                  </IconButton>
                }
              />
            ))}
          </List>
        ))}

      {tab === 'all' &&
        (all.length === 0 ? (
          <Empty icon={<Heart size={30} />} title={t("Yozuv yo'q", 'Записей нет')} />
        ) : (
          <List>
            {all.map((b) => (
              <ListRow
                key={b.id}
                left={<SpeciesAvatar s={spOf(b.femaleId)} />}
                title={label(b.femaleId)}
                sub={`${formatDate(b.date)} · ${b.method === 'ai' ? t("sun'iy", 'ИО') : t('tabiiy', 'естеств.')}${b.maleId ? ' · ' + t('ota', 'отец') + ': ' + label(b.maleId) : b.maleNote ? ' · ' + t('ota', 'отец') + ': ' + b.maleNote : ''}`}
                right={
                  <div className="flex items-center gap-1">
                    <Badge tone={b.status === 'born' ? 'green' : b.status === 'failed' ? 'red' : 'amber'}>
                      {b.status === 'born' ? t("Tug'di", 'Родила') : b.status === 'failed' ? t('Qaytdi', 'Перегул') : t('Kutilmoqda', 'Ожидается')}
                    </Badge>
                    {b.status !== 'born' && (
                      <IconButton
                        onClick={async () => {
                          const ok = await confirm({ title: t("O'chirasizmi?", 'Удалить?'), ok: t("O'chirish", 'Удалить'), danger: true })
                          if (ok) await db.breedings.delete(b.id)
                        }}
                      >
                        <Trash2 size={16} className="text-stone-400" />
                      </IconButton>
                    )}
                  </div>
                }
              />
            ))}
          </List>
        ))}

      <Fab onClick={() => setOpen(true)} icon={<Plus />} label={t('Qochirish', 'Случка')} />
      {open && <BreedingSheet onClose={() => setOpen(false)} />}
    </Page>
  )
}
