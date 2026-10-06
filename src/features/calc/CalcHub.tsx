import { useNavigate } from 'react-router-dom'
import { CalendarHeart, ChevronRight, HandCoins, TrendingUp, Wheat } from 'lucide-react'
import { IconTile } from '../../components/icons'
import { useSettings } from '../../state/settings'
import { Card, Page } from '../../components/ui'

export function CalcHub() {
  const { t } = useSettings()
  const nav = useNavigate()
  const items = [
    { to: '/calc/sale', icon: HandCoins, color: '#b45309', title: t("Bo'rdoqi va sotish kalkulyatori", 'Калькулятор откорма и продажи'), sub: t('Sotib olib, boqib, sotsam qancha foyda qilaman?', 'Купить, откормить, продать — какая прибыль?') },
    { to: '/forecast', icon: TrendingUp, color: '#027a48', title: t('Prognoz (kelajak hisobi)', 'Прогноз (расчёт будущего)'), sub: t("Qachon ko'payadi, qachon foydaga chiqadi, xatarlar va nima kerak", 'Рост стада, окупаемость, риски и что нужно') },
    { to: '/calc/feed', icon: Wheat, color: '#a16207', title: t('Yem kalkulyatori', 'Калькулятор кормов'), sub: t('Qancha yem kerak va qancha turadi', 'Сколько нужно корма и сколько стоит') },
    { to: '/calc/gestation', icon: CalendarHeart, color: '#db2777', title: t("Tug'ish sanasi kalkulyatori", 'Калькулятор даты родов'), sub: t("Qochirilgan kundan tug'ish sanasini hisoblash", 'Дата родов по дате случки') },
  ]
  return (
    <Page back title={t('Kalkulyatorlar', 'Калькуляторы')}>
      <div className="space-y-3">
        {items.map((i) => (
          <Card key={i.to} onClick={() => nav(i.to)} className="flex items-center gap-4">
            <IconTile icon={i.icon} color={i.color} />
            <div className="flex-1">
              <div className="font-semibold">{i.title}</div>
              <div className="text-sm text-stone-500">{i.sub}</div>
            </div>
            <ChevronRight className="text-stone-400" />
          </Card>
        ))}
      </div>
    </Page>
  )
}
