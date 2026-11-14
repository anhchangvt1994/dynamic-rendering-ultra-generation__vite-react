import { metaOf } from './data/species-meta.mjs'

// Relative spawn weight of each rarity tier.
export const WEIGHTS = {
  common: 100,
  uncommon: 50,
  rare: 20,
  veryRare: 6,
  pseudo: 2,
  legendary: 0.4,
  mythical: 0.15,
}
export const TIERS = Object.keys(WEIGHTS)

// Final forms of the pseudo-legendary lines (600 BST, three stages).
export const PSEUDO = [149, 248, 373, 376, 445, 635, 706, 784, 887, 998]

/** The rarity tier of a species; unknown ids count as common. */
export function tierOf(id) {
  const meta = metaOf(id)
  if (!meta) return 'common'
  if (meta.flag === 2) return 'mythical'
  if (meta.flag === 1) return 'legendary'
  if (PSEUDO.includes(Number(id))) return 'pseudo'
  if (meta.capture >= 190) return 'common'
  if (meta.capture >= 120) return 'uncommon'
  if (meta.capture >= 45) return 'rare'
  return 'veryRare'
}
