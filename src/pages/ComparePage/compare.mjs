// Side-by-side numbers for two Pokémon payloads (PokéAPI /pokemon).

import { getDefenses } from '../PokemonPage/effectiveness.mjs'

export const STAT_ORDER = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
]

export const statsOf = (pokemon) =>
  Object.fromEntries(
    STAT_ORDER.map((name) => [
      name,
      Number(pokemon?.stats?.find((s) => s?.stat?.name === name)?.base_stat) ||
        0,
    ])
  )

/**
 * Per stat: both values, the difference (a − b) and who leads
 * ('a' | 'b' | 'tie'); plus totals and how many stats each side wins.
 */
export function compareStats(a, b) {
  const left = statsOf(a)
  const right = statsOf(b)
  const rows = STAT_ORDER.map((name) => {
    const diff = left[name] - right[name]
    return {
      name,
      a: left[name],
      b: right[name],
      diff,
      lead: diff > 0 ? 'a' : diff < 0 ? 'b' : 'tie',
    }
  })
  const total = (side) => rows.reduce((sum, row) => sum + row[side], 0)
  return {
    rows,
    totalA: total('a'),
    totalB: total('b'),
    winsA: rows.filter((row) => row.lead === 'a').length,
    winsB: rows.filter((row) => row.lead === 'b').length,
  }
}

/** Reads ?a=&b= (slugs only), so a comparison link is shareable. */
export function readComparePair(search = '') {
  const params = new URLSearchParams(search)
  const clean = (value) => (/^[a-z0-9-]{1,40}$/.test(value || '') ? value : '')
  return { a: clean(params.get('a')), b: clean(params.get('b')) }
}

/**
 * The attacker's strongest same-type hit on the defender: each of its own
 * types against the defender's typing (PokéAPI /type payloads). Null until
 * every defender type has loaded.
 */
export function bestHit(attackerTypes = [], defenderTypes = []) {
  const defenses = getDefenses(defenderTypes)
  if (!attackerTypes.length || !defenses.length) return null
  return attackerTypes
    .map((type) => ({
      type,
      multiplier:
        defenses.find((entry) => entry.name === type)?.multiplier ?? 1,
    }))
    .reduce((best, hit) => (hit.multiplier > best.multiplier ? hit : best))
}

/** Plain words for a damage multiplier. */
export function hitLabel(multiplier) {
  if (multiplier >= 4) return 'Cực kỳ hiệu quả'
  if (multiplier >= 2) return 'Rất hiệu quả'
  if (multiplier === 1) return 'Bình thường'
  if (multiplier === 0) return 'Không tác dụng'
  return 'Kém hiệu quả'
}

/** ×2, ×½, ×¼ … as printed on the card. */
export const formatMultiplier = (multiplier) =>
  `×${{ 0.5: '½', 0.25: '¼' }[multiplier] ?? multiplier}`
