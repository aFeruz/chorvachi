/// <reference lib="webworker" />
import { forecast, solveNeeds, type Forecast, type Goal, type NeedResult } from './analyze'
import type { ForecastInput } from './types'

export interface WorkerRequest {
  id: number
  input: ForecastInput
  goal: Goal
  runs: number
}

export interface WorkerResponse {
  id: number
  result?: Forecast
  needs?: NeedResult
  error?: string
}

const post = (r: WorkerResponse) => (self as unknown as Worker).postMessage(r)

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, input, goal, runs } = e.data
  try {
    post({ id, result: forecast(input, goal, runs) })
  } catch (err) {
    post({ id, error: String(err) })
    return
  }
  // teskari hisob og'irroq — alohida javob; xato bo'lsa ham asosiy natija qoladi
  try {
    post({ id, needs: solveNeeds(input, goal, 0.8, 80) })
  } catch {
    post({ id, needs: { months: input.months } })
  }
}
