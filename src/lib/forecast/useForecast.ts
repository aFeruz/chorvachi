import { useEffect, useRef, useState } from 'react'
import type { Forecast, Goal, NeedResult } from './analyze'
import type { ForecastInput } from './types'
import type { WorkerRequest, WorkerResponse } from './worker'

/**
 * Prognozni fon oqimida hisoblash (yozish paytida interfeys qotmasligi uchun).
 * Yangi so'rov kelganda eski hisob hali tugamagan bo'lsa, oqim to'xtatilib qayta yaratiladi —
 * shunda eskirgan hisoblar navbatda to'planmaydi.
 */
export function useForecast(input: ForecastInput | undefined, goal: Goal, runs = 400) {
  const worker = useRef<Worker | null>(null)
  const seq = useRef(0)
  /** shu id uchun hali to'liq javob (needs) kelmagan */
  const pending = useRef(false)
  const [result, setResult] = useState<Forecast>()
  const [needs, setNeeds] = useState<NeedResult>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const spawn = () => {
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.id !== seq.current) return
      if (e.data.error) {
        setError(e.data.error)
        setBusy(false)
        pending.current = false
      }
      if (e.data.result) {
        setResult(e.data.result)
        setError(undefined)
        setBusy(false)
      }
      if (e.data.needs) {
        setNeeds(e.data.needs)
        pending.current = false
      }
    }
    w.onerror = (e) => {
      e.preventDefault()
      setError(e.message || 'worker error')
      setBusy(false)
      pending.current = false
    }
    worker.current = w
    return w
  }

  useEffect(() => {
    spawn()
    return () => worker.current?.terminate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const key = input ? JSON.stringify([input, goal, runs]) : ''
  useEffect(() => {
    if (!input) return
    setBusy(true)
    const id = ++seq.current
    const timer = setTimeout(() => {
      // oldingi hisob tugamagan bo'lsa — to'xtatib, yangisini boshlaymiz
      if (pending.current) {
        worker.current?.terminate()
        spawn()
      }
      pending.current = true
      setNeeds(undefined)
      worker.current?.postMessage({ id, input, goal, runs } satisfies WorkerRequest)
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { result, needs, busy, error }
}
