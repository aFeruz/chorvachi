import { useEffect, useState } from 'react'
import { Delete } from 'lucide-react'
import { cx } from './ui'

export const PIN_LENGTH = 4

/** Raqamli klaviatura va PIN nuqtalari */
export function PinPad({
  title, sub, error, disabled, onComplete, resetKey,
}: {
  title: string
  sub?: string
  error?: string
  disabled?: boolean
  onComplete: (pin: string) => void
  /** o'zgarsa — kiritilgan raqamlar tozalanadi */
  resetKey?: unknown
}) {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)

  useEffect(() => setPin(''), [resetKey])
  useEffect(() => {
    if (!error) return
    setShake(true)
    const t = setTimeout(() => setShake(false), 400)
    return () => clearTimeout(t)
  }, [error, resetKey])

  const press = (d: string) => {
    if (disabled || pin.length >= PIN_LENGTH) return
    const next = pin + d
    setPin(next)
    if (next.length === PIN_LENGTH) setTimeout(() => onComplete(next), 120)
  }
  const back = () => !disabled && setPin((p) => p.slice(0, -1))

  // kompyuter klaviaturasidan ham kiritish
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') back()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  return (
    <div className="flex flex-col items-center">
      <div className="text-lg font-semibold">{title}</div>
      {sub && <div className="mt-1 max-w-xs text-center text-sm text-stone-500">{sub}</div>}
      <div className={cx('my-6 flex gap-4', shake && 'animate-[shake_0.35s]')}>
        {Array.from({ length: PIN_LENGTH }, (_, k) => (
          <span
            key={k}
            className={cx(
              'size-4 rounded-full border-2 transition',
              k < pin.length ? 'border-brand-600 bg-brand-600' : 'border-stone-300 dark:border-stone-600',
              error && pin.length === 0 && 'border-red-500',
            )}
          />
        ))}
      </div>
      <div className="h-5 text-sm text-red-600">{error}</div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <Key key={d} onClick={() => press(d)} disabled={disabled}>{d}</Key>
        ))}
        <span />
        <Key onClick={() => press('0')} disabled={disabled}>0</Key>
        <Key onClick={back} disabled={disabled} aria-label="delete">
          <Delete size={24} />
        </Key>
      </div>
    </div>
  )
}

function Key({ children, onClick, disabled, ...rest }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; 'aria-label'?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className="grid size-[72px] place-items-center rounded-full bg-white text-2xl font-medium shadow-sm ring-1 ring-stone-200 transition select-none active:scale-95 active:bg-stone-100 disabled:opacity-40 dark:bg-stone-800 dark:ring-stone-700 dark:active:bg-stone-700"
    >
      {children}
    </button>
  )
}
