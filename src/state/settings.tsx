import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { DEFAULT_SETTINGS, type Lang, type LText, type Settings } from '../db/types'
import { formatShort, formatSom, formatUsd } from '../lib/money'

export type T = (uz: string, ru: string) => string

interface Ctx {
  settings: Settings
  update: (patch: Partial<Settings>) => Promise<void>
  lang: Lang
  t: T
  /** LText -> joriy tildagi matn */
  lt: (x: LText | undefined) => string
  money: (n: number) => string
  short: (n: number) => string
  usd: (n: number) => string
  farmId: string
}

const SettingsCtx = createContext<Ctx | null>(null)

export async function loadSettings(): Promise<Settings> {
  const row = await db.kv.get('settings')
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings>) ?? {}) }
}

export async function saveSettings(patch: Partial<Settings>) {
  const cur = await loadSettings()
  await db.kv.put({ key: 'settings', value: { ...cur, ...patch } })
}

export function SettingsProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const settings = useLiveQuery(loadSettings, [])

  const update = useCallback((patch: Partial<Settings>) => saveSettings(patch), [])

  useEffect(() => {
    if (!settings) return
    const apply = () => {
      const dark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0c0a09' : '#027a48')
    }
    apply()
    document.documentElement.lang = settings.lang
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings])

  const value = useMemo<Ctx | null>(() => {
    if (!settings) return null
    const lang = settings.lang
    const som = lang === 'ru' ? 'сум' : "so'm"
    return {
      settings,
      update,
      lang,
      t: (uz, ru) => (lang === 'ru' ? ru : uz),
      lt: (x) => (x ? x[lang] || x.uz : ''),
      money: (n) => formatSom(n, som),
      short: (n) => formatShort(n, lang),
      usd: (n) => formatUsd(n, settings.usdRate),
      farmId: settings.activeFarmId ?? '',
    }
  }, [settings, update])

  if (!value) return <>{fallback}</>
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>
}

export function useSettings(): Ctx {
  const c = useContext(SettingsCtx)
  if (!c) throw new Error('SettingsProvider missing')
  return c
}

export function useT(): T {
  return useSettings().t
}
