import { useEffect, useRef, useState } from 'react'
import type { Forecast, Goal, NeedResult } from './analyze'
import type { ForecastInput } from './types'
import type { WorkerRequest, WorkerResponse } from './worker'

/** Prognozni fon oqimida hisoblash (yozish paytida interfeys qotmasligi uchun) */
export function useForecast(input: ForecastInput | undefined, goal: Goal, runs = 400) {
  const worker = useRef<Worker | null>(null)
  const seq = useRef(0)
  const [result, setResult] = useState<Forecast>()
  const [needs, setNeeds] = useState<NeedResult>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.current = w
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.id !== seq.current) return
      if (e.data.error) {
        setError(e.data.error)
        setBusy(false)
      }
      if (e.data.result) {
        setResult(e.data.result)
        setError(undefined)
        setBusy(false)
      }
      if (e.data.needs) setNeeds(e.data.needs)
    }
    return () => w.terminate()
  }, [])

  const key = input ? JSON.stringify([input, goal, runs]) : ''
  useEffect(() => {
    if (!input || !worker.current) return
    setBusy(true)
    const id = ++seq.current
    const timer = setTimeout(() => {
      setNeeds(undefined)
      worker.current?.postMessage({ id, input, goal, runs } satisfies WorkerRequest)
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { result, needs, busy, error }
}
