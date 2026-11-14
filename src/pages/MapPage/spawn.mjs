import { GENERATIONS } from '../HomePage/catalog.mjs'
import { typesOf } from '../../components/pokemon-page/type-index.mjs'
import { hashSeed, makeRng } from './rng.mjs'
import { WEIGHTS, tierOf } from './tiers.mjs'

export const SLOT_MS = 600000
export const DEX_MAX = 1025
const OWNED_BOOST = 3
const MIN_POOL = 8

/** The ten-minute window a moment falls in: one window, one set of spawns. */
export const slotOf = (nowMs) => Math.floor(nowMs / SLOT_MS)

export const HABITATS = ['grass', 'lake', 'sea', 'mountain', 'cave', 'route']
const BY_TYPE = {
  grass: ['grass'],
  bug: ['grass'],
  water: ['lake', 'sea'],
  flying: ['sea', 'route'],
  rock: ['mountain', 'cave'],
  ground: ['mountain'],
  steel: ['mountain'],
  fighting: ['mountain'],
  ice: ['mountain'],
  ghost: ['cave'],
  poison: ['cave'],
  dark: ['cave'],
  dragon: ['cave'],
  psychic: ['cave'],
  normal: ['route'],
  electric: ['route'],
  fire: ['route'],
  fairy: ['route'],
}

/** Where a species with these types can be met; always somewhere. */
export function habitatsOf(types) {
  const set = new Set(types.flatMap((t) => BY_TYPE[t] ?? []))
  return set.size ? HABITATS.filter((h) => set.has(h)) : ['route']
}

export const weightOf = (id, owned) =>
  WEIGHTS[tierOf(id)] * (owned.has(id) ? OWNED_BOOST : 1)

const isRare = (id) => ['legendary', 'mythical'].includes(tierOf(id))
const fits = (id, kind) => habitatsOf(typesOf(id)).includes(kind)
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
const dexOf = (regionId) => {
  const gen = GENERATIONS.find((g) => g.name.toLowerCase().startsWith(regionId))
  return gen ? range(gen.start, gen.end) : []
}

/**
 * 3–6 distinct species for one habitat: drawn by weight from the region's dex,
 * widened to the whole dex when that is too small. At most one legendary or
 * mythical (none when `allowRare` is false).
 */
export function rollZone({ regionId, zoneId, kind, slot, owned, count, allowRare = true, exclude }) {
  const rng = makeRng(hashSeed(regionId, zoneId, slot))
  const want = count ?? 3 + Math.floor(rng() * 4)
  let pool = dexOf(regionId).filter((id) => fits(id, kind))
  if (pool.length < MIN_POOL) {
    const more = range(1, DEX_MAX).filter((id) => !pool.includes(id) && fits(id, kind))
    pool = pool.concat(more)
  }
  if (pool.length < want) pool = pool.concat(range(1, DEX_MAX).filter((id) => !pool.includes(id)))
  if (!allowRare) pool = pool.filter((id) => !isRare(id))
  if (exclude) pool = pool.filter((id) => !exclude.has(id))
  const picked = []
  while (picked.length < want && pool.length) {
    const weights = pool.map((id) => weightOf(id, owned))
    let roll = rng() * weights.reduce((a, b) => a + b, 0)
    let at = 0
    while (at < pool.length - 1 && (roll -= weights[at]) >= 0) at++
    const id = pool[at]
    picked.push(id)
    pool = pool.filter((x) => x !== id && !(isRare(id) && isRare(x)))
  }
  return picked
}

/** Every habitat of a region, with at most one legendary or mythical in all of it. */
export function rollRegion({ regionId, zones, slot, owned }) {
  /** @type {Record<string, number[]>} */
  const out = {}
  let rare = false
  const seen = new Set()
  for (const zone of zones) {
    const ids = rollZone({ regionId, zoneId: zone.id, kind: zone.kind, slot, owned, allowRare: !rare, exclude: seen })
    ids.forEach((id) => seen.add(id))
    rare = rare || ids.some(isRare)
    out[zone.id] = ids
  }
  return out
}
