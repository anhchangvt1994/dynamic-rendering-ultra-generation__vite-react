/**
 * The colour regions of a sprite: OKLab k-means over its opaque, unlocked
 * pixels. Ink (outlines, L < 0.32) and near-white highlights are locked: no
 * palette ever recolours them. Pure and deterministic.
 */
import overrides, { type RigOverride } from './overrides'

export type Lab = [number, number, number]
export type Cluster = { lab: Lab; share: number }
export type Lock = { ink: number; light: number }

export const LOCK: Lock = { ink: 0.32, light: 0.93 }
const LIGHT_CHROMA = 0.04
const K = 3
const ROUNDS = 12
const MERGE = 0.08
const SAMPLES = 60000

const LINEAR = Float64Array.from({ length: 256 }, (_, i) => {
  const c = i / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
})

/** sRGB bytes → OKLab. */
export function oklab(r: number, g: number, b: number): Lab {
  const R = LINEAR[r]
  const G = LINEAR[g]
  const B = LINEAR[b]
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

const hexLab = (hex: string): Lab =>
  oklab(
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  )

/** Locked: ink, or a near-white highlight. */
export const locked = ([L, a, b]: Lab, lock: Lock = LOCK) =>
  L < lock.ink || (L > lock.light && Math.hypot(a, b) < LIGHT_CHROMA)

const d2 = (p: Lab, q: Lab) =>
  (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2

// mulberry32: k-means++ needs the same draws every build
const prng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function samples(frames: Uint8Array[], w: number, h: number): Lab[] {
  const per = w * h
  const step = Math.max(1, Math.ceil((frames.length * per) / SAMPLES))
  const out: Lab[] = []
  for (let i = 0; i < frames.length * per; i += step) {
    const px = frames[Math.floor(i / per)]
    const o = (i % per) * 4
    if (px[o + 3] < 128) continue
    const lab = oklab(px[o], px[o + 1], px[o + 2])
    if (!locked(lab)) out.push(lab)
  }
  return out
}

const nearest = (p: Lab, centres: Lab[]) => {
  let best = 0
  for (let c = 1; c < centres.length; c++)
    if (d2(p, centres[c]) < d2(p, centres[best])) best = c
  return best
}

function seeds(points: Lab[], random: () => number): Lab[] {
  const centres: Lab[] = [points[Math.floor(random() * points.length)]]
  const dist = points.map((p) => d2(p, centres[0]))
  while (centres.length < K) {
    const total = dist.reduce((s, v) => s + v, 0)
    if (total === 0) break
    let r = random() * total
    let i = 0
    while (i < points.length - 1 && (r -= dist[i]) > 0) i++
    centres.push(points[i])
    for (let j = 0; j < points.length; j++)
      dist[j] = Math.min(dist[j], d2(points[j], points[i]))
  }
  return centres
}

function kmeans(points: Lab[], centres: Lab[]) {
  const counts = new Array(centres.length).fill(0)
  for (let round = 0; round < ROUNDS; round++) {
    const sums = centres.map(() => [0, 0, 0])
    counts.fill(0)
    for (const p of points) {
      const c = nearest(p, centres)
      counts[c]++
      sums[c][0] += p[0]
      sums[c][1] += p[1]
      sums[c][2] += p[2]
    }
    centres = centres.map((c, i) =>
      counts[i] ? (sums[i].map((v) => v / counts[i]) as Lab) : c
    )
  }
  return centres
    .map((lab, i) => ({ lab, share: counts[i] / points.length }))
    .filter((c) => c.share > 0)
}

function merge(clusters: Cluster[]): Cluster[] {
  for (;;) {
    let pair: [number, number] | null = null
    let best = MERGE ** 2
    for (let i = 0; i < clusters.length; i++)
      for (let j = i + 1; j < clusters.length; j++) {
        const d = d2(clusters[i].lab, clusters[j].lab)
        if (d < best) {
          best = d
          pair = [i, j]
        }
      }
    if (!pair) return clusters
    const [a, b] = [clusters[pair[0]], clusters[pair[1]]]
    const share = a.share + b.share
    const lab = a.lab.map(
      (v, k) => (v * a.share + b.lab[k] * b.share) / share
    ) as Lab
    clusters = clusters.filter((_, i) => i !== pair![0] && i !== pair![1])
    clusters.push({ lab, share })
  }
}

/**
 * The colour regions of all frames, main region first. An override's colours
 * are the centres as given (their order kept: the main region is the first).
 */
export function clusterColors(
  frames: Uint8Array[],
  w: number,
  h: number,
  override?: RigOverride
): { clusters: Cluster[]; lock: Lock } {
  const points = samples(frames, w, h)
  const lock = { ...LOCK }
  if (!points.length) return { clusters: [], lock }
  if (override?.clusters?.length) {
    const centres = override.clusters.map(hexLab)
    const counts = new Array(centres.length).fill(0)
    for (const p of points) counts[nearest(p, centres)]++
    return {
      clusters: centres.map((lab, i) => ({
        lab,
        share: counts[i] / points.length,
      })),
      lock,
    }
  }
  const clusters = merge(kmeans(points, seeds(points, prng(0x5eed))))
  clusters.sort((p, q) => q.share - p.share)
  return { clusters, lock }
}

/**
 * size×size cells: 1 where most of the cell's opaque, unlocked pixels sit
 * nearest (by hue, a/b) the main region.
 */
export function primaryMask(
  frame: Uint8Array,
  w: number,
  h: number,
  clusters: Cluster[],
  lock: Lock,
  size = 64
): Uint8Array {
  const out = new Uint8Array(size * size)
  if (!clusters.length) return out
  const ab = clusters.map((c) => [0, c.lab[1], c.lab[2]] as Lab)
  for (let cy = 0; cy < size; cy++)
    for (let cx = 0; cx < size; cx++) {
      let main = 0
      let all = 0
      const y1 = Math.max(
        Math.floor(((cy + 1) * h) / size),
        Math.floor((cy * h) / size) + 1
      )
      const x1 = Math.max(
        Math.floor(((cx + 1) * w) / size),
        Math.floor((cx * w) / size) + 1
      )
      for (let y = Math.floor((cy * h) / size); y < y1; y++)
        for (let x = Math.floor((cx * w) / size); x < x1; x++) {
          const o = (y * w + x) * 4
          all++
          if (frame[o + 3] < 128) continue
          const lab = oklab(frame[o], frame[o + 1], frame[o + 2])
          if (locked(lab, lock)) continue
          if (nearest([0, lab[1], lab[2]], ab) === 0) main++
        }
      out[cy * size + cx] = main * 2 > all ? 1 : 0
    }
  return out
}

/** The override of one species, if any. */
export const overrideFor = (
  speciesId: number | string
): RigOverride | undefined => overrides[String(speciesId)]
