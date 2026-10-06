import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { BadgeCheck, ChevronRight, CircleDollarSign, Clock, Flag, Plus, ShieldAlert, Target, TrendingUp } from 'lucide-react'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { Button, Callout, Card, List, ListRow, Page, Section } from '../../components/ui'
import { IconTile, SpeciesAvatar } from '../../components/icons'
import { db } from '../../db/db'
import type { Goal, GoalType } from '../../lib/forecast/analyze'
import { formatDate, toISO } from '../../lib/dates'
import { goalHint, goalLabel } from './texts'

const GOAL_ICON: Record<GoalType, [typeof Flag, string]> = {
  profit: [BadgeCheck, '#027a48'],
  heads: [Flag, '#9a3412'],
  cash: [CircleDollarSign, '#2563eb'],
  monthly: [TrendingUp, '#0d9488'],
  horizon: [Clock, '#7c3aed'],
  need: [Target, '#db2777'],
  risk: [ShieldAlert, '#dc2626'],
}

export default function ForecastHub() {
  const f = useFarm()
  const { t, lt, farmId } = useSettings()
  const nav = useNavigate()
  const plans = useLiveQuery(() => db.plans.where('farmId').equals(farmId).reverse().sortBy('updatedAt'), [farmId]) ?? []

  return (
    <Page back title={t('Prognoz', 'Прогноз')}>
      <Card className="mb-4 border-0 bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="text-lg font-bold">{t('Kelajakni hisoblab ko\'ring', 'Посчитайте будущее')}</div>
        <p className="mt-1 text-sm opacity-90">
          {t(
            "Podangiz qachon ko'payadi, qachon foydaga chiqasiz, qancha xarajat ketadi va nimalar kerak bo'ladi — o'lim, kasallik va narx o'zgarishlarini hisobga olib.",
            'Когда вырастет стадо, когда выйдете в прибыль, сколько уйдёт расходов и что понадобится — с учётом падежа, болезней и колебаний цен.',
          )}
        </p>
        <Button variant="secondary" className="mt-3 border-0 text-brand-800" icon={<Plus size={18} />} onClick={() => nav('/forecast/new')}>
          {t('Yangi prognoz', 'Новый прогноз')}
        </Button>
      </Card>

      <Section title={t('Qaysi savolga javob kerak?', 'На какой вопрос ответить?')}>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(GOAL_ICON) as GoalType[]).map((g) => {
            const [I, c] = GOAL_ICON[g]
            return (
              <Card key={g} onClick={() => nav('/forecast/new?goal=' + g)} className="flex items-center gap-3 p-3">
                <IconTile icon={I} color={c} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{goalLabel(t, g)}</div>
                  <div className="text-xs text-stone-500">{goalHint(t, g)}</div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-stone-400" />
              </Card>
            )
          })}
        </div>
      </Section>

      {plans.length > 0 && (
        <Section title={t('Saqlangan rejalar', 'Сохранённые планы')}>
          <List>
            {plans.map((p) => {
              const sp = f.speciesMap.get(p.speciesId)
              return (
                <ListRow
                  key={p.id}
                  onClick={() => nav('/forecast/' + p.id)}
                  left={<SpeciesAvatar s={sp} />}
                  title={p.name}
                  sub={`${lt(sp?.name)} · ${goalLabel(t, (p.goal as Goal).type)} · ${formatDate(toISO(new Date(p.updatedAt)))}`}
                  right={<ChevronRight size={18} className="text-stone-400" />}
                />
              )
            })}
          </List>
        </Section>
      )}

      <Callout tone="info">
        {t(
          "Hisob taxminiy: narxlar fermangiz tarixidan olinadi yoki o'zingiz kiritasiz, biologik me'yorlar (bo'g'ozlik, bola soni, o'lim) o'zgartirilishi mumkin. Rizq Allohdan — biz sabablarini qilamiz.",
          'Расчёт ориентировочный: цены берутся из истории фермы или вводятся вручную, биологические нормы можно менять. Результат — в руках Всевышнего, мы делаем усилия.',
        )}
      </Callout>
    </Page>
  )
}
