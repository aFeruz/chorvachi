import { History, TrendingDown, TrendingUp } from 'lucide-react'
import { useSettings } from '../state/settings'
import { priceDiff, type PriceStats } from '../lib/calc/priceHistory'
import { formatDate } from '../lib/dates'
import { pct } from '../lib/money'
import { Button, cx } from './ui'

/**
 * Oxirgi xarid/sotuv narxi bo'yicha taklif.
 * Narx avtomatik yozilmaydi — foydalanuvchi "Qo'llash"ni bossagina qo'yiladi,
 * yangi narx kiritilganda esa oldingisidan farqi ko'rsatiladi.
 */
export function PriceHint({
  stats, kind, currentUnitPrice, currentAmount, currentUnit, onApply,
}: {
  stats: PriceStats
  kind: 'expense' | 'income'
  currentUnitPrice?: number
  currentAmount?: number
  currentUnit?: string
  onApply: () => void
}) {
  const { t, money } = useSettings()
  const { last } = stats
  const byUnit = stats.unit !== undefined && last.unitPrice !== undefined
  const lastValue = byUnit ? last.unitPrice! : last.amount
  const suffix = byUnit ? ` / ${stats.unit}` : ''

  // joriy kiritilgan narx bilan solishtirish (bir xil o'lchov birligida)
  const current = byUnit ? (currentUnit === stats.unit ? currentUnitPrice : undefined) : currentAmount
  const cmp = current && current > 0 ? priceDiff(current, lastValue) : undefined
  const same = cmp && Math.abs(cmp.pct) < 0.5
  const up = cmp && cmp.diff > 0
  // xarajatda qimmatlashish yomon, sotuvda esa yaxshi
  const good = cmp && (kind === 'expense' ? !up : up)

  return (
    <div className="mb-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm dark:border-stone-800 dark:bg-stone-900/60">
      <div className="flex items-center gap-3">
        <History size={18} className="shrink-0 text-stone-500" />
        <div className="min-w-0 flex-1">
          <div className="text-stone-500">
            {kind === 'expense' ? t('Oxirgi xarid narxi', 'Цена последней покупки') : t('Oxirgi sotuv narxi', 'Цена последней продажи')} · {formatDate(last.date)}
          </div>
          <div className="font-semibold tabular-nums">
            {money(lastValue)}
            {suffix}
          </div>
        </div>
        <Button type="button" size="sm" variant="soft" onClick={onApply}>
          {t("Qo'llash", 'Применить')}
        </Button>
      </div>

      {stats.count > 1 && stats.min !== undefined && stats.max !== undefined && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
          <span>
            {t(`Oxirgi ${stats.count} ta`, `Последние ${stats.count}`)}: {money(stats.min)} – {money(stats.max)}
            {suffix}
          </span>
          {stats.avg !== undefined && (
            <span>
              {t("o'rtacha", 'в среднем')} {money(stats.avg)}
            </span>
          )}
          {stats.trendPct !== undefined && Math.abs(stats.trendPct) >= 0.5 && (
            <span className="inline-flex items-center gap-1">
              {stats.trendPct > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {t('oldingisiga nisbatan', 'к предыдущей')} {stats.trendPct > 0 ? '+' : ''}
              {pct(stats.trendPct)}
            </span>
          )}
        </div>
      )}

      {cmp && (
        <div
          className={cx(
            'mt-2 rounded-lg px-2 py-1.5 text-xs font-medium',
            same
              ? 'bg-stone-200/70 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
              : good
                ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
          )}
        >
          {same
            ? t("Narx o'zgarmagan", 'Цена не изменилась')
            : up
              ? t(
                  `Bu safar ${money(cmp.diff)}${suffix} qimmat (+${pct(cmp.pct)})`,
                  `В этот раз дороже на ${money(cmp.diff)}${suffix} (+${pct(cmp.pct)})`,
                )
              : t(
                  `Bu safar ${money(-cmp.diff)}${suffix} arzon (${pct(cmp.pct)})`,
                  `В этот раз дешевле на ${money(-cmp.diff)}${suffix} (${pct(cmp.pct)})`,
                )}
        </div>
      )}
    </div>
  )
}
