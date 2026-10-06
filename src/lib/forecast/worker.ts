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

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, input, goal, runs } = e.data
  try {
    const result = forecast(input, goal, runs)
    // teskari hisob og'irroq — alohida javob bilan yuboriladi
    ;(self as unknown as Worker).postMessage({ id, result } satisfies WorkerResponse)
    const needs = solveNeeds(input, goal, 0.8, 80)
    ;(self as unknown as Worker).postMessage({ id, needs } satisfies WorkerResponse)
  } catch (err) {
    ;(self as unknown as Worker).postMessage({ id, error: String(err) } satisfies WorkerResponse)
  }
}
