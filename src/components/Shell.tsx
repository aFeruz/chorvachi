import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { BarChart3, Home, LogOut, Menu, PawPrint, Wallet } from 'lucide-react'
import { useSettings } from '../state/settings'
import { useFarm } from '../state/farm'
import { cx } from './ui'
import { useLock } from '../state/lock'

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useSettings()
  const { farm } = useFarm()
  const { lock } = useLock()
  const items = [
    { to: '/', icon: Home, label: t('Asosiy', 'Главная'), end: true },
    { to: '/herd', icon: PawPrint, label: t('Poda', 'Стадо') },
    { to: '/finance', icon: Wallet, label: t('Moliya', 'Финансы') },
    { to: '/reports', icon: BarChart3, label: t('Hisobot', 'Отчёты') },
    { to: '/more', icon: Menu, label: t("Ko'proq", 'Ещё') },
  ]
  return (
    <div className="md:pl-60">
      <aside className="no-print glass-bar fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-glass-line p-3 md:flex">
        <div className="mb-6 flex items-center gap-3 px-2 pt-2">
          <span className="glass grid size-11 shrink-0 place-items-center rounded-full border border-glass-line text-brand-700 dark:text-brand-400">
            <PawPrint size={22} />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium text-stone-500">Chorva Hisob</div>
            <div className="truncate font-bold">{farm?.name}</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 font-medium transition',
                  isActive
                    ? 'bg-white/90 text-brand-800 shadow-sm dark:bg-white/10 dark:text-brand-200'
                    : 'text-stone-700 hover:bg-white/50 dark:text-stone-300 dark:hover:bg-white/5',
                )
              }
            >
              <it.icon size={20} />
              {it.label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={lock}
          className="mt-auto flex items-center gap-3 rounded-2xl px-3 py-2.5 font-medium text-red-700 transition hover:bg-red-50/70 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          <LogOut size={20} />
          {t('Chiqish', 'Выйти')}
        </button>
      </aside>
      {children}
      <nav className="no-print fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 md:hidden">
        <div className="glass-float mx-auto flex h-[68px] max-w-lg gap-0.5 rounded-[34px] border border-glass-line p-1.5">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cx(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[28px] text-[11px] transition',
                  isActive
                    ? 'bg-white/90 font-bold text-brand-700 shadow-sm dark:bg-white/15 dark:text-brand-300'
                    : 'font-medium text-stone-700 dark:text-stone-300',
                )
              }
            >
              <it.icon size={21} />
              {it.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
