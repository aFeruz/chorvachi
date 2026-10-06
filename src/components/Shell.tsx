import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { BarChart3, Home, Menu, PawPrint, Wallet } from 'lucide-react'
import { useSettings } from '../state/settings'
import { useFarm } from '../state/farm'
import { cx } from './ui'

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useSettings()
  const { farm } = useFarm()
  const items = [
    { to: '/', icon: Home, label: t('Asosiy', 'Главная'), end: true },
    { to: '/herd', icon: PawPrint, label: t('Poda', 'Стадо') },
    { to: '/finance', icon: Wallet, label: t('Moliya', 'Финансы') },
    { to: '/reports', icon: BarChart3, label: t('Hisobot', 'Отчёты') },
    { to: '/more', icon: Menu, label: t("Ko'proq", 'Ещё') },
  ]
  return (
    <div className="md:pl-60">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-stone-200 bg-white p-3 md:flex dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-6 flex items-center gap-3 px-2 pt-2">
          <img src="./favicon.svg" className="size-10" alt="" />
          <div className="min-w-0">
            <div className="font-bold">Chorva Hisob</div>
            <div className="truncate text-xs text-stone-500">{farm?.name}</div>
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
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition',
                  isActive ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200' : 'hover:bg-stone-100 dark:hover:bg-stone-800',
                )
              }
            >
              <it.icon size={20} />
              {it.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {children}
      <nav className="no-print pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur md:hidden dark:border-stone-800 dark:bg-stone-900/95">
        <div className="mx-auto flex max-w-lg">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cx(
                  'flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] font-medium transition',
                  isActive ? 'text-brand-700 dark:text-brand-400' : 'text-stone-500',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cx('grid h-7 w-14 place-items-center rounded-full transition', isActive && 'bg-brand-100 dark:bg-brand-900/50')}>
                    <it.icon size={20} />
                  </span>
                  {it.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
