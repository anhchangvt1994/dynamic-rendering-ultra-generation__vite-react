// Island ground height (pure). A region is a rounded coast with a gentle hill
// in the middle; the coast outline comes from a few seeded harmonics, so each
// region has a silhouette of its own. Land is above 0 (the sea level).
export const FLOOR = -3

const hash = (seed, i, j) => {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(seed | 0, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
const smooth = (t) => t * t * (3 - 2 * t)
const clamp01 = (v) => Math.min(1, Math.max(0, v))
function noise(seed, x, z) {
  const i = Math.floor(x)
  const j = Math.floor(z)
  const u = smooth(x - i)
  const v = smooth(z - j)
  const a = hash(seed, i, j)
  const b = hash(seed, i + 1, j)
  const c = hash(seed, i, j + 1)
  const d = hash(seed, i + 1, j + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const fbm = (seed, x, z) => noise(seed, x, z) * 0.55 + noise(seed + 7, x * 2.1, z * 2.1) * 0.3 + noise(seed + 13, x * 4.3, z * 4.3) * 0.15

const AMPS = [0.085, 0.07, 0.055, 0.035]
const FREQ = [2, 3, 5, 7]

/** Distance from the island's centre to its coast in the direction `angle`; always in [0.74R, R]. */
export function coastRadius(seed, angle, radius) {
  let r = 0.74
  for (let k = 0; k < AMPS.length; k++) r += AMPS[k] * Math.sin(FREQ[k] * angle + hash(seed, k, 7) * Math.PI * 2)
  return radius * Math.min(1, Math.max(0.74, r))
}

/** True when (x, z) is on the island's land. */
export const isLand = (seed, x, z, radius) => Math.hypot(x, z) < coastRadius(seed, Math.atan2(z, x), radius)

/** Height of the ground at (x, z); ≤ FLOOR in the sea beyond the coast. */
export function heightAt(seed, x, z, radius) {
  const cr = coastRadius(seed, Math.atan2(z, x), radius)
  const e = Math.hypot(x, z) / cr
  if (e >= 1) return FLOOR - (e - 1) * 14
  const dome = 1 - e * e
  const hills = (fbm(seed, x * 0.045, z * 0.045) - 0.42) * 8
  const inland = (1.3 + dome * 2.6 + hills * Math.min(1, dome * 2.4)) * 2.4
  const beach = smooth(clamp01((e - 0.78) / 0.22))
  return Math.max(0.6, inland) * (1 - beach) + 0.18 * beach - (e > 0.985 ? (e - 0.985) * 120 : 0)
}

/** The id of the habitat a point stands in, or null. */
export function zoneAt(layout, x, z) {
  let best = null
  let bestGap = Infinity
  for (const zone of layout.zones) {
    const gap = Math.hypot(zone.x - x, zone.z - z) - zone.r
    if (gap < 0 && gap < bestGap) {
      best = zone.id
      bestGap = gap
    }
  }
  return best
}
