import { SLOT_MS } from './spawn.mjs'
import { tierOf } from './tiers.mjs'

const AURAS = new Set(['pseudo', 'legendary', 'mythical'])
export const auraOf = (tier) => (AURAS.has(tier) ? tier : 'none')

export const visibleKinds = (f) => new Set(['pokemon', 'npc', 'gym'].filter((k) => f[k]))

const RANK = { mythical: 5, legendary: 4, pseudo: 3, veryRare: 2, rare: 1, uncommon: 0, common: 0 }

/** Indexes of the species whose textures are worth loading: owned first, then rarest. */
export function textureBudget(ids, max, owned) {
  return ids
    .map((id, i) => ({ i, score: (owned.has(id) ? 10 : 0) + RANK[tierOf(id)] }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, max)
    .map((x) => x.i)
}

/** Milliseconds until the next ten-minute spawn window starts. */
export const nextSlotDelay = (nowMs) => SLOT_MS - (nowMs % SLOT_MS)
