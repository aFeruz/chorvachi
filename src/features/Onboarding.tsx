import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { createFarm } from '../db/repo'
import { createDemoFarm } from '../lib/demo'
import { useSettings } from '../state/settings'
import { Button, Card, cx, Field, Input } from '../components/ui'
import type { Lang } from '../db/types'
import { Baby, Calculator, HandCoins, WifiOff } from 'lucide-react'
import { IconTile, SpeciesAvatar } from '../components/icons'

export function Onboarding() {
  const { t, lt, update, settings } = useSettings()
  const species = useLiveQuery(() => db.species.toArray(), []) ?? []
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set(['sp_sheep', 'sp_cattle']))
  const [busy, setBusy] = useState(false)

  const finish = async (demo: boolean) => {
    setBusy(true)
    try {
      if (demo) await createDemoFarm(t('Demo ferma', 'Демо ферма'))
      else {
        await createFarm(name.trim() || t('Mening fermam', 'Моя ферма'))
        await db.species.toCollection().modify((s) => {
          s.enabled = picked.has(s.id)
        })
      }
      await update({ onboarded: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pt-safe mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8">
      <div className="mt-10 mb-8 flex flex-col items-center text-center">
        <img src="./favicon.svg" className="mb-4 size-20 drop-shadow" alt="" />
        <h1 className="text-2xl font-bold">Chorva Hisob</h1>
        <p className="mt-1 text-stone-500">
          {t("Chorvachilikda xarajat, daromad va foydani oson hisoblang", 'Лёгкий учёт расходов, доходов и прибыли в животноводстве')}
        </p>
      </div>

      {step === 0 && (
        <div className="flex flex-1 flex-col">
          <div className="mb-2 text-sm font-medium text-stone-500">{t('Tilni tanlang', 'Выберите язык')}</div>
          <div className="mb-6 grid grid-cols-2 gap-3">
            {(['uz', 'ru'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => update({ lang: l })}
                className={cx(
                  'rounded-2xl border-2 p-4 text-left font-semibold transition',
                  settings.lang === l ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30' : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900',
                )}
              >
                <span className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-stone-200 text-xs font-bold dark:bg-stone-700">{l.toUpperCase()}</span>{l === 'uz' ? "O'zbekcha" : 'Русский'}</span>
              </button>
            ))}
          </div>
          <ul className="mb-8 space-y-3 text-sm">
            {([
              [Calculator, '#027a48', t('Har bir hayvon va poda tannarxi avtomatik hisoblanadi', 'Себестоимость каждого животного считается автоматически')],
              [HandCoins, '#b45309', t("Necha pulga sotsangiz foyda qilishingizni ko'rsatadi", 'Показывает, за сколько продать, чтобы быть в прибыли')],
              [Baby, '#db2777', t("Tug'ilgan bolalar podaga o'zi qo'shiladi", 'Приплод сам добавляется в стадо')],
              [WifiOff, '#0369a1', t("Internetsiz ishlaydi, ma'lumotlar telefonda saqlanadi", 'Работает без интернета, данные хранятся на телефоне')],
            ] as const).map(([I, c, x]) => (
              <li key={x} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-stone-900">
                <IconTile icon={I} color={c} size="sm" />
                {x}
              </li>
            ))}
          </ul>
          <div className="mt-auto space-y-3">
            <Button full size="lg" onClick={() => setStep(1)}>
              {t('Boshlash', 'Начать')}
            </Button>
            <Button full variant="ghost" disabled={busy} onClick={() => finish(true)}>
              {t("Namuna ma'lumotlar bilan ko'rish", 'Посмотреть на демо-данных')}
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-1 flex-col">
          <Field label={t('Ferma (xo\'jalik) nomi', 'Название фермы')}>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Masalan: Oqtepa fermasi', 'Например: Ферма Оқтепа')} />
          </Field>
          <div className="mt-3 mb-2 text-sm font-medium text-stone-600 dark:text-stone-300">
            {t('Qaysi hayvonlarni boqasiz?', 'Каких животных вы держите?')}
          </div>
          <div className="mb-6 grid grid-cols-3 gap-2">
            {species.map((s) => {
              const on = picked.has(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    const n = new Set(picked)
                    if (on) n.delete(s.id)
                    else n.add(s.id)
                    setPicked(n)
                  }}
                  className={cx(
                    'flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center text-xs font-medium transition',
                    on ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30' : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900',
                  )}
                >
                  <SpeciesAvatar s={s} />
                  {lt(s.name)}
                </button>
              )
            })}
          </div>
          <Card className="mb-6 text-sm text-stone-500">
            {t("Keyinroq Sozlamalar → Hayvon turlari bo'limida o'zgartirish mumkin.", 'Позже можно изменить в Настройки → Виды животных.')}
          </Card>
          <div className="mt-auto flex gap-3">
            <Button variant="secondary" onClick={() => setStep(0)}>
              {t('Orqaga', 'Назад')}
            </Button>
            <Button className="flex-1" size="lg" disabled={busy || picked.size === 0} onClick={() => finish(false)}>
              {t('Tayyor', 'Готово')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
