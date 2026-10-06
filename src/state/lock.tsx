import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { App as CapApp } from '@capacitor/app'
import { useSettings } from './settings'
import { PinPad } from '../components/PinPad'
import { Button, Sheet, useUi } from '../components/ui'
import { checkPin, hashPin, newSalt } from '../lib/pin'
import { isNative } from '../lib/native'
import { wipeAll } from '../db/repo'

interface LockCtx {
  hasPin: boolean
  locked: boolean
  /** "Chiqish": PIN bo'lsa qulflaydi, bo'lmasa PIN o'rnatishni taklif qiladi */
  lock: () => void
  /** PIN o'rnatish / o'zgartirish / o'chirish oynasi */
  openPinSetup: (mode: PinMode) => void
}

export type PinMode = 'set' | 'change' | 'remove'

const Ctx = createContext<LockCtx | null>(null)

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 30_000

export function LockProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const hasPin = !!settings.pinHash
  // ilova ochilganda PIN bo'lsa — qulf
  const [locked, setLocked] = useState(hasPin)
  const [setup, setSetup] = useState<PinMode | null>(null)
  const hiddenAt = useRef(0)

  useEffect(() => {
    if (!hasPin) setLocked(false)
  }, [hasPin])

  // fonga o'tib qaytganda avtomatik qulflash
  useEffect(() => {
    if (!hasPin) return
    const mins = settings.autoLockMinutes ?? 0
    const away = () => {
      hiddenAt.current = Date.now()
    }
    const back = () => {
      if (mins < 0 || !hiddenAt.current) return
      if (Date.now() - hiddenAt.current >= mins * 60_000) setLocked(true)
      hiddenAt.current = 0
    }
    const onVis = () => (document.visibilityState === 'hidden' ? away() : back())
    document.addEventListener('visibilitychange', onVis)
    const sub = isNative() ? CapApp.addListener('appStateChange', ({ isActive }) => (isActive ? back() : away())) : undefined
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      sub?.then((s) => s.remove())
    }
  }, [hasPin, settings.autoLockMinutes])

  const lock = useCallback(() => {
    if (hasPin) setLocked(true)
    else setSetup('set')
  }, [hasPin])

  return (
    <Ctx.Provider value={{ hasPin, locked, lock, openPinSetup: setSetup }}>
      {/* qulflanganda ilova yashiriladi, lekin holati saqlanadi */}
      <div className={locked ? 'hidden' : undefined} aria-hidden={locked}>
        {children}
      </div>
      {locked && <LockScreen onUnlock={() => setLocked(false)} />}
      {setup && <PinSetupSheet mode={setup} onClose={() => setSetup(null)} />}
    </Ctx.Provider>
  )
}

export function useLock(): LockCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('LockProvider missing')
  return c
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { t, settings } = useSettings()
  const { confirm } = useUi()
  const [error, setError] = useState<string>()
  const [attempts, setAttempts] = useState(0)
  const [until, setUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (until <= Date.now()) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [until])
  const waiting = until > now
  const left = Math.ceil((until - now) / 1000)

  const submit = async (pin: string) => {
    if (await checkPin(pin, settings.pinSalt, settings.pinHash)) {
      onUnlock()
      return
    }
    const n = attempts + 1
    setAttempts(n)
    setTick((x) => x + 1)
    if (n >= MAX_ATTEMPTS) {
      setUntil(Date.now() + LOCKOUT_MS)
      setNow(Date.now())
      setAttempts(0)
      setError(t("Ko'p marta xato. 30 soniya kuting", 'Слишком много попыток. Подождите 30 секунд'))
    } else setError(t(`PIN noto'g'ri (${MAX_ATTEMPTS - n} urinish qoldi)`, `Неверный PIN (осталось ${MAX_ATTEMPTS - n})`))
  }

  const forgot = async () => {
    const ok = await confirm({
      title: t('PIN-kodni unutdingizmi?', 'Забыли PIN-код?'),
      text: t(
        "PIN-kodni tiklashning iloji yo'q — ma'lumotlar faqat shu telefonda. Faqat BARCHA ma'lumotlarni o'chirib, qaytadan boshlash mumkin. Keyin zaxira faylingiz bo'lsa, undan tiklashingiz mumkin.",
        'Восстановить PIN невозможно — данные только на этом телефоне. Можно лишь удалить ВСЕ данные и начать заново, затем восстановить из резервной копии, если она есть.',
      ),
      ok: t("Hammasini o'chirish", 'Удалить всё'),
      danger: true,
    })
    if (!ok) return
    const sure = await confirm({ title: t('Rostdan ham hamma ma\'lumot o\'chsinmi?', 'Точно удалить все данные?'), text: t("Bu amalni qaytarib bo'lmaydi.", 'Это действие необратимо.'), ok: t("Ha, o'chirish", 'Да, удалить'), danger: true })
    if (!sure) return
    await wipeAll()
    window.location.reload()
  }

  return (
    <div className="pt-safe pb-safe fixed inset-0 z-[55] flex flex-col items-center justify-center overflow-y-auto bg-stone-100 px-6 dark:bg-stone-950">
      <img src="./favicon.svg" className="mb-3 size-16 drop-shadow" alt="" />
      <div className="mb-6 flex items-center gap-2 text-stone-500">
        <Lock size={16} />
        Chorva Hisob
      </div>
      <PinPad
        title={waiting ? t(`${left} soniya kuting`, `Подождите ${left} сек.`) : t('PIN-kodni kiriting', 'Введите PIN-код')}
        error={waiting ? undefined : error}
        disabled={waiting}
        onComplete={submit}
        resetKey={tick}
      />
      <button type="button" onClick={forgot} className="mt-8 text-sm text-stone-500 underline-offset-4 hover:underline">
        {t('PIN-kodni unutdingizmi?', 'Забыли PIN-код?')}
      </button>
    </div>
  )
}

/** PIN o'rnatish, o'zgartirish yoki o'chirish */
function PinSetupSheet({ mode, onClose }: { mode: PinMode; onClose: () => void }) {
  const { t, settings, update } = useSettings()
  const { toast } = useUi()
  // qadamlar: (change/remove) joriy PIN -> (set/change) yangi PIN -> tasdiqlash
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>(mode === 'set' ? 'new' : 'current')
  const [first, setFirst] = useState('')
  const [error, setError] = useState<string>()
  const [tick, setTick] = useState(0)

  const fail = (msg: string) => {
    setError(msg)
    setTick((x) => x + 1)
  }

  const onPin = async (pin: string) => {
    if (step === 'current') {
      if (!(await checkPin(pin, settings.pinSalt, settings.pinHash))) return fail(t("PIN noto'g'ri", 'Неверный PIN'))
      if (mode === 'remove') {
        await update({ pinHash: undefined, pinSalt: undefined })
        toast(t("PIN-kod o'chirildi", 'PIN-код отключён'))
        return onClose()
      }
      setError(undefined)
      setStep('new')
      setTick((x) => x + 1)
      return
    }
    if (step === 'new') {
      if (/^(\d)\1+$/.test(pin)) return fail(t('Juda oddiy PIN, boshqasini tanlang', 'Слишком простой PIN, выберите другой'))
      setFirst(pin)
      setError(undefined)
      setStep('confirm')
      setTick((x) => x + 1)
      return
    }
    if (pin !== first) {
      setStep('new')
      setFirst('')
      return fail(t("PIN-kodlar mos kelmadi, qaytadan kiriting", 'PIN-коды не совпали, введите заново'))
    }
    const salt = newSalt()
    await update({ pinSalt: salt, pinHash: await hashPin(pin, salt), autoLockMinutes: settings.autoLockMinutes ?? 0 })
    toast(mode === 'set' ? t("PIN-kod o'rnatildi", 'PIN-код установлен') : t("PIN-kod o'zgartirildi", 'PIN-код изменён'))
    onClose()
  }

  const title =
    step === 'current' ? t('Joriy PIN-kodni kiriting', 'Введите текущий PIN')
      : step === 'new' ? t('Yangi 4 xonali PIN-kod', 'Новый 4-значный PIN')
        : t('PIN-kodni qayta kiriting', 'Повторите PIN-код')
  const sub =
    mode === 'set' && step === 'new'
      ? t("Ilovaga kirishda va «Chiqish»dan keyin so'raladi. Uni yodda saqlang — tiklab bo'lmaydi.", 'Будет запрашиваться при входе и после «Выйти». Запомните его — восстановить нельзя.')
      : undefined

  return (
    <Sheet open onClose={onClose} title={mode === 'remove' ? t("PIN-kodni o'chirish", 'Отключить PIN') : mode === 'change' ? t("PIN-kodni o'zgartirish", 'Сменить PIN') : t("PIN-kod o'rnatish", 'Установить PIN')}>
      <div className="py-2">
        <PinPad title={title} sub={sub} error={error} onComplete={onPin} resetKey={`${step}-${tick}`} />
      </div>
      <Button variant="ghost" full className="mt-2" onClick={onClose}>
        {t('Bekor qilish', 'Отмена')}
      </Button>
    </Sheet>
  )
}
