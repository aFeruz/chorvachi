import { useNavigate } from 'react-router-dom'
import type { Expense, Income } from '../../db/types'
import { useFarm } from '../../state/farm'
import { useSettings } from '../../state/settings'
import { ListRow } from '../../components/ui'
import { useScopeName } from '../../components/ScopePicker'
import { formatDate } from '../../lib/dates'
import { groupDigits } from '../../lib/money'

export function TxRow({ kind, e }: { kind: 'expense' | 'income'; e: Expense | Income }) {
  const f = useFarm()
  const { lt, money } = useSettings()
  const nav = useNavigate()
  const scopeName = useScopeName()
  const cat = f.catMap.get(e.categoryId)
  const sub = [formatDate(e.date), scopeName(e.scope, e.targetId), e.qty ? `${groupDigits(e.qty)} ${e.unit ?? ''}` : '', e.note]
    .filter(Boolean)
    .join(' · ')
  return (
    <ListRow
      onClick={() => nav(`/${kind}/${e.id}`)}
      left={
        <span className="grid size-10 place-items-center rounded-xl text-sm font-bold text-white" style={{ background: cat?.color ?? '#94a3b8' }}>
          {kind === 'income' ? '+' : '−'}
        </span>
      }
      title={lt(cat?.name) || '—'}
      sub={sub}
      right={
        <span className={kind === 'income' ? 'font-semibold text-brand-700 tabular-nums dark:text-brand-400' : 'font-semibold tabular-nums'}>
          {kind === 'income' ? '+' : '−'}
          {money(e.amount)}
        </span>
      }
    />
  )
}
