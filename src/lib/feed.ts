import type { Farmx } from '../state/farm'
import type { ID } from '../db/types'

/** Ratsion bo'yicha kunlik sarf (birlikda) */
export function dailyFeedUse(f: Farmx, feedItemId: ID): number {
  let sum = 0
  for (const r of f.rations) {
    if (r.feedItemId !== feedItemId) continue
    let heads = 0
    if (r.scope === 'species') heads = f.headsBySpecies.get(r.targetId) ?? 0
    else {
      const g = f.groupMap.get(r.targetId)
      if (g && g.status === 'active') heads = f.headsOf(g)
    }
    sum += heads * r.perHeadDay
  }
  return sum
}

export function feedDaysLeft(f: Farmx, feedItemId: ID): number | undefined {
  const item = f.feedItems.find((x) => x.id === feedItemId)
  const use = dailyFeedUse(f, feedItemId)
  if (!item || use <= 0) return undefined
  return Math.max(0, item.stock) / use
}

/** Ratsion bo'yicha butun fermaning kunlik yem xarajati */
export function dailyFeedCost(f: Farmx): number {
  return f.feedItems.reduce((s, it) => s + dailyFeedUse(f, it.id) * it.avgPrice, 0)
}
