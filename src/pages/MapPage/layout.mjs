import { REGIONS } from './data/regions.mjs'
import { hashSeed, makeRng } from './rng.mjs'
import { coastRadius } from './terrain.mjs'

/** Radius of a region's land; the sea around it is TRAY times wider. */
export const REGION_R = 190
export const TRAY = 1.24
export const terrainSeed = (regionId) => hashSeed(regionId, 'terrain')

export const ZONE_R = { route: 8, grass: 12, lake: 12.5, sea: 14.5, mountain: 14.5, cave: 9.5 }
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

export const LANDMARKS = {
  kanto: 'tower', johto: 'pagoda', hoenn: 'volcano', sinnoh: 'spire', unova: 'ferris',
  kalos: 'prism', alola: 'palmhut', galar: 'castle', paldea: 'crater',
}

/**
 * Towns, habitats, a landmark and routes of one region, placed by dart throwing
 * from the region's seed: always the same, never overlapping, land things on the
 * land and the sea habitats in the water just off the coast.
 */
export function layoutRegion(region) {
  const seed = terrainSeed(region.id)
  const rng = makeRng(hashSeed(region.id, 'layout'))
  const cr = (x, z) => coastRadius(seed, Math.atan2(z, x), REGION_R)
  const landSpot = (inner = 0, outer = 0.84) => {
    const a = rng() * Math.PI * 2
    const d = Math.sqrt(inner * inner + (outer * outer - inner * inner) * rng())
    const c = coastRadius(seed, a, REGION_R)
    return { x: Math.cos(a) * c * d, z: Math.sin(a) * c * d }
  }
  const place = (placed, ok, make, tries = 800) => {
    for (let n = 0; n < tries; n++) {
      const p = make(n)
      if (placed.every((o) => ok(p, o))) return p
    }
    return null
  }

  const towns = []
  let gap = REGION_R * 0.36
  for (const t of region.towns) {
    let p = null
    while (!p) {
      p = place(towns, (a, b) => dist(a, b) >= gap, () => landSpot(0, 0.8), 300)
      if (!p) gap *= 0.92
    }
    towns.push({ id: t.id, name: t.name, ...(t.gym ? { gym: t.gym } : {}), x: p.x, z: p.z })
  }

  const order = [towns[0]]
  while (order.length < towns.length) {
    const last = order.at(-1)
    order.push(towns.filter((t) => !order.includes(t)).sort((a, b) => dist(a, last) - dist(b, last))[0])
  }
  const routes = order.slice(1).map((t, i) => ({ from: order[i].id, to: t.id }))
  if (towns.length > 4) routes.push({ from: order[0].id, to: order[2].id })

  const zones = []
  const kinds = Object.keys(ZONE_R).flatMap((kind) => Array.from({ length: region.counts[kind] ?? 0 }, (_, i) => ({ kind, i })))
  kinds.sort((a, b) => ZONE_R[b.kind] - ZONE_R[a.kind])
  for (const { kind, i } of kinds) {
    let r = ZONE_R[kind]
    let p = null
    while (!p) {
      p = place(
        zones,
        (q, o) => dist(q, o) >= (r + o.r) * 0.8,
        () => {
          if (kind !== 'sea') return landSpot(0, 0.8)
          // in the water, just beyond the beach
          const a = rng() * Math.PI * 2
          const d = coastRadius(seed, a, REGION_R) + r * (0.55 + rng() * 0.25) + 2
          return { x: Math.cos(a) * d, z: Math.sin(a) * d }
        },
        500
      )
      if (p && kind !== 'sea' && Math.hypot(p.x, p.z) + r > cr(p.x, p.z) * 0.9) p = null
      if (p && !towns.every((t) => dist(p, t) >= r + 8)) p = null
      if (!p) r *= 0.94
    }
    zones.push({ id: `${kind}-${i + 1}`, kind, x: p.x, z: p.z, r })
  }
  zones.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id, 'en', { numeric: true }))

  const LR = 18
  let lm = null
  let lr = LR
  while (!lm) {
    lm = place(
      [...zones.filter((z) => z.kind !== 'sea'), ...towns.map((t) => ({ ...t, r: 12 }))],
      (q, o) => dist(q, o) >= lr + o.r + 1,
      () => landSpot(0, 0.7),
      500
    )
    if (!lm) lr *= 0.9
  }
  return { towns, zones, routes, landmark: { kind: LANDMARKS[region.id], x: lm.x, z: lm.z } }
}
