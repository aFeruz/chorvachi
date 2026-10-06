/** Zararsizlik va sotish hisob-kitoblari */

export interface BreakEvenInput {
  cost: number // jami tannarx (1 bosh yoki guruh)
  heads?: number // guruh bo'lsa bosh soni
  weightKg?: number // 1 boshning tirik vazni
  dressingPct?: number // so'yish chiqimi %
  extraSaleCost?: number // sotishga ketadigan qo'shimcha xarajat (transport, bozor yig'imi)
  targetMarginPct?: number // istalgan foyda, tannarxga nisbatan %
}

export interface BreakEvenResult {
  totalCost: number
  perHead: number
  perKgLive?: number
  perKgMeat?: number
  meatKg?: number
  targetPerHead: number
  targetPerKgLive?: number
  targetPerKgMeat?: number
}

export function breakEven(i: BreakEvenInput): BreakEvenResult {
  const heads = Math.max(1, i.heads ?? 1)
  const totalCost = i.cost + (i.extraSaleCost ?? 0)
  const perHead = totalCost / heads
  const k = 1 + (i.targetMarginPct ?? 0) / 100
  const r: BreakEvenResult = { totalCost, perHead, targetPerHead: perHead * k }
  if (i.weightKg && i.weightKg > 0) {
    r.perKgLive = perHead / i.weightKg
    r.targetPerKgLive = r.perKgLive * k
    if (i.dressingPct && i.dressingPct > 0) {
      r.meatKg = (i.weightKg * i.dressingPct) / 100
      r.perKgMeat = perHead / r.meatKg
      r.targetPerKgMeat = r.perKgMeat * k
    }
  }
  return r
}

export interface SaleResult {
  revenue: number
  cost: number
  profit: number
  marginPct: number // foyda / tushum
  roiPct: number // foyda / tannarx
  isLoss: boolean
}

export function saleResult(revenue: number, cost: number): SaleResult {
  const profit = revenue - cost
  return {
    revenue,
    cost,
    profit,
    marginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
    roiPct: cost > 0 ? (profit / cost) * 100 : 0,
    isLoss: profit < 0,
  }
}

/** Tirik vazn narxidan so'yilgandagi go'sht narxiga o'tkazish (va aksincha) */
export function liveToMeatPrice(perKgLive: number, dressingPct: number): number {
  return dressingPct > 0 ? perKgLive / (dressingPct / 100) : 0
}
export function meatToLivePrice(perKgMeat: number, dressingPct: number): number {
  return perKgMeat * (dressingPct / 100)
}
