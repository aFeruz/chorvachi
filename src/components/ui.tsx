import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X } from 'lucide-react'
import { useSettings } from '../state/settings'
import { groupDigits, parseNumber } from '../lib/money'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

/* ---------------- Sahifa ---------------- */

export function Page({
  title, back, actions, children, wide,
}: { title: ReactNode; back?: boolean | string; actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  const nav = useNavigate()
  return (
    <div className="min-h-full">
      <header className="pt-safe sticky top-0 z-20 border-b border-stone-200/70 bg-stone-100/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
        <div className={cx('mx-auto flex h-14 items-center gap-2 px-3', wide ? 'max-w-5xl' : 'max-w-3xl')}>
          {back && (
            <button
              aria-label="back"
              onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
              className="-ml-1 grid size-10 place-items-center rounded-full hover:bg-stone-200 dark:hover:bg-stone-800"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      </header>
      <main className={cx('mx-auto px-3 pt-3 pb-28 md:pb-10', wide ? 'max-w-5xl' : 'max-w-3xl')}>{children}</main>
    </div>
  )
}

export function Card({
  children, className, onClick,
}: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx(
        'rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900',
        onClick && 'cursor-pointer transition active:scale-[0.99] hover:border-stone-300 dark:hover:border-stone-700',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Section({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mb-5', className)}>
      {(title || action) && (
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/* ---------------- Tugmalar ---------------- */

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'

export function Button({
  variant = 'primary', size = 'md', icon, full, className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode; full?: boolean }) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition select-none disabled:opacity-50 active:scale-[0.98]',
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-11 px-4',
        size === 'lg' && 'h-13 px-5 text-lg',
        variant === 'primary' && 'bg-brand-700 text-white hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-700',
        variant === 'secondary' && 'border border-stone-300 bg-white hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800',
        variant === 'ghost' && 'hover:bg-stone-200/70 dark:hover:bg-stone-800',
        variant === 'soft' && 'bg-brand-50 text-brand-800 hover:bg-brand-100 dark:bg-brand-900/40 dark:text-brand-200',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        full && 'w-full',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  )
}

export function IconButton({ className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cx('grid size-10 place-items-center rounded-full hover:bg-stone-200 disabled:opacity-40 dark:hover:bg-stone-800', className)}
    >
      {children}
    </button>
  )
}

/* ---------------- Forma ---------------- */

const inputCls =
  'w-full h-12 rounded-xl border border-stone-300 bg-white px-3 text-base outline-none transition placeholder:text-stone-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 dark:border-stone-700 dark:bg-stone-900'

export function Field({ label, hint, children, className }: { label?: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('mb-3 block', className)}>
      {label && <span className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-300">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(inputCls, className)} />
}

export function DateInput({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, className)} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={2} {...rest} className={cx(inputCls, 'h-auto py-2', className)} />
}

export function Select({
  options, placeholder, className, ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <select {...rest} className={cx(inputCls, 'appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Raqam kiritish: yozish paytida 1 250 000 ko'rinishida guruhlanadi */
export function NumInput({
  value, onChange, suffix, placeholder, decimals = false, className, autoFocus,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  suffix?: string
  placeholder?: string
  decimals?: boolean
  className?: string
  autoFocus?: boolean
}) {
  const fmt = (v: number | undefined) => {
    if (v == null || Number.isNaN(v)) return ''
    if (!decimals) return groupDigits(v)
    const [i, d] = String(v).split('.')
    return groupDigits(Number(i)) + (d ? ',' + d : '')
  }
  const [text, setText] = useState(fmt(value))
  const last = useRef(value)
  useEffect(() => {
    if (value !== last.current) {
      setText(fmt(value))
      last.current = value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <div className={cx('relative', className)}>
      <input
        inputMode={decimals ? 'decimal' : 'numeric'}
        autoFocus={autoFocus}
        value={text}
        placeholder={placeholder ?? '0'}
        onChange={(e) => {
          let raw = e.target.value.replace(/[^\d.,\s -]/g, '')
          if (!decimals) raw = raw.replace(/[.,]/g, '')
          const trailing = decimals && /[.,]$/.test(raw)
          const n = raw.trim() === '' ? undefined : parseNumber(raw)
          last.current = n
          onChange(n)
          if (trailing || (decimals && /[.,]\d*0$/.test(raw))) setText(raw)
          else setText(n == null ? '' : fmt(n))
        }}
        className={cx(inputCls, 'tabular-nums', suffix && 'pr-16')}
      />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-stone-500">{suffix}</span>}
    </div>
  )
}

export function Segmented<V extends string>({
  value, onChange, options, className,
}: { value: V; onChange: (v: V) => void; options: { value: V; label: ReactNode }[]; className?: string }) {
  return (
    <div className={cx('no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-stone-200/70 p-1 dark:bg-stone-800', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-9 flex-1 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition',
            value === o.value ? 'bg-white shadow-sm dark:bg-stone-950' : 'text-stone-600 dark:text-stone-400',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chips<V extends string>({
  value, onChange, options,
}: { value: V; onChange: (v: V) => void; options: { value: V; label: ReactNode }[] }) {
  return (
    <div className="no-scrollbar -mx-3 mb-3 flex gap-2 overflow-x-auto px-3">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'h-9 shrink-0 rounded-full border px-3 text-sm whitespace-nowrap transition',
            value === o.value
              ? 'border-brand-700 bg-brand-700 text-white dark:border-brand-600 dark:bg-brand-600'
              : 'border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="mb-3 flex w-full items-center justify-between gap-3 text-left">
      <span className="text-sm">{label}</span>
      <span className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-brand-600' : 'bg-stone-300 dark:bg-stone-700')}>
        <span className={cx('absolute top-1 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
      </span>
    </button>
  )
}

/* ---------------- Ko'rsatkichlar ---------------- */

export function Money({ value, tone, className, usd = true }: { value: number; tone?: 'auto' | 'pos' | 'neg'; className?: string; usd?: boolean }) {
  const { money, usd: toUsd, settings } = useSettings()
  const t = tone === 'auto' ? (value < 0 ? 'neg' : value > 0 ? 'pos' : undefined) : tone
  return (
    <span className={cx('tabular-nums', t === 'pos' && 'text-brand-700 dark:text-brand-400', t === 'neg' && 'text-red-600 dark:text-red-400', className)}>
      {money(value)}
      {usd && settings.showUsd && <span className="ml-1 text-xs font-normal text-stone-500">≈ {toUsd(value)}</span>}
    </span>
  )
}

export function Stat({
  label, value, sub, tone, icon, onClick,
}: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'pos' | 'neg' | 'warn'; icon?: ReactNode; onClick?: () => void }) {
  return (
    <Card className="p-3" onClick={onClick}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">
        {icon}
        {label}
      </div>
      <div
        className={cx(
          'mt-1 truncate text-lg font-semibold tabular-nums',
          tone === 'pos' && 'text-brand-700 dark:text-brand-400',
          tone === 'neg' && 'text-red-600 dark:text-red-400',
          tone === 'warn' && 'text-amber-600',
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 truncate text-xs text-stone-500">{sub}</div>}
    </Card>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'red' | 'amber' | 'blue' | 'violet' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tone === 'neutral' && 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
        tone === 'green' && 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-300',
        tone === 'red' && 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        tone === 'amber' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        tone === 'blue' && 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
        tone === 'violet' && 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
      )}
    >
      {children}
    </span>
  )
}

export function ListRow({
  left, title, sub, right, onClick, className,
}: { left?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <div
      onClick={onClick}
      className={cx(
        'flex items-center gap-3 px-4 py-3',
        onClick && 'cursor-pointer hover:bg-stone-50 active:bg-stone-100 dark:hover:bg-stone-800/50',
        className,
      )}
    >
      {left && <div className="shrink-0">{left}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{title}</div>
        {sub && <div className="truncate text-sm text-stone-500 dark:text-stone-400">{sub}</div>}
      </div>
      {right && <div className="shrink-0 text-right">{right}</div>}
    </div>
  )
}

export function List({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900', className)}>
      {children}
    </div>
  )
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-stone-200/70 text-stone-500 dark:bg-stone-800 dark:text-stone-400">{icon}</div>}
      <div className="text-lg font-semibold">{title}</div>
      {text && <div className="mt-1 max-w-sm text-sm text-stone-500">{text}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function KV({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-sm text-stone-500 dark:text-stone-400">{label}</span>
      <span className={cx('text-right tabular-nums', strong && 'font-semibold')}>{value}</span>
    </div>
  )
}

export function Callout({ tone = 'info', children, icon }: { tone?: 'info' | 'warn' | 'good' | 'bad'; children: ReactNode; icon?: ReactNode }) {
  return (
    <div
      className={cx(
        'flex gap-3 rounded-2xl p-3 text-sm',
        tone === 'info' && 'bg-sky-50 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200',
        tone === 'warn' && 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
        tone === 'good' && 'bg-brand-50 text-brand-900 dark:bg-brand-950/50 dark:text-brand-200',
        tone === 'bad' && 'bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-200',
      )}
    >
      {icon && <div className="shrink-0 pt-0.5">{icon}</div>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function Fab({ onClick, icon, label }: { onClick: () => void; icon: ReactNode; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="no-print fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 flex h-14 items-center gap-2 rounded-2xl bg-brand-700 px-5 text-white shadow-lg shadow-brand-900/20 transition active:scale-95 md:bottom-8 dark:bg-brand-600"
    >
      {icon}
      {label && <span className="font-medium">{label}</span>}
    </button>
  )
}

/* ---------------- Modal oyna (pastdan chiquvchi) ---------------- */

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div
        className="animate-sheet pb-safe max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 shadow-xl md:rounded-3xl dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-300 md:hidden dark:bg-stone-700" />
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <IconButton onClick={onClose} aria-label="close">
              <X size={20} />
            </IconButton>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

/* ---------------- Tasdiqlash va xabarlar ---------------- */

interface ConfirmOpts {
  title: string
  text?: string
  ok?: string
  danger?: boolean
}

interface UiCtx {
  confirm: (o: ConfirmOpts) => Promise<boolean>
  toast: (msg: string) => void
}

const UiContext = createContext<UiCtx | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const { t } = useSettings()
  const [dlg, setDlg] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setDlg({ ...o, resolve })), [])
  const toast = useCallback((m: string) => {
    setMsg(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 2500)
  }, [])
  const close = (v: boolean) => {
    dlg?.resolve(v)
    setDlg(null)
  }

  return (
    <UiContext.Provider value={{ confirm, toast }}>
      {children}
      {dlg && (
        <div className="animate-fade fixed inset-0 z-[60] grid place-items-center bg-black/40 p-6" onClick={() => close(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl dark:bg-stone-900" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold">{dlg.title}</div>
            {dlg.text && <div className="mt-2 text-sm text-stone-600 dark:text-stone-400">{dlg.text}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => close(false)}>
                {t('Bekor qilish', 'Отмена')}
              </Button>
              <Button variant={dlg.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
                {dlg.ok ?? 'OK'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {msg && (
        <div className="animate-fade pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-[70] flex justify-center px-4 md:bottom-8">
          <div className="flex items-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-stone-100 dark:text-stone-900">
            <Check size={18} />
            {msg}
          </div>
        </div>
      )}
    </UiContext.Provider>
  )
}

export function useUi(): UiCtx {
  const c = useContext(UiContext)
  if (!c) throw new Error('UiProvider missing')
  return c
}
