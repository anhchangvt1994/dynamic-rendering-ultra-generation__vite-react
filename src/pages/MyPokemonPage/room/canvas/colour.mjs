/*
 * The colours of one individual for the room's shader: each colour region of
 * the sprite (OKLab, from rig.json) and what it becomes under the
 * individual's palette and shift, plus the three tones its marks are drawn in.
 */
import { paletteOf } from '../../../BagPage/individuals/palettes.mjs'

const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const gamma = (c) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x))

/** "#rrggbb" → [L, a, b] */
export function hexToOklab(hex) {
  const [R, G, B] = [1, 3, 5].map((i) =>
    linear(parseInt(hex.slice(i, i + 2), 16) / 255)
  )
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** [L, a, b] → sRGB, each 0–1 (clamped) */
export function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => clamp(gamma(c)))
}

const turn = ([L, a, b], deg) => {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return [L, a * c - b * s, a * s + b * c]
}

const shifted = (lab, [dh, ds, dl] = [0, 0, 0]) => {
  const [L, a, b] = turn(lab, dh)
  const k = 1 + ds / 100
  return [clamp(L + dl / 100), a * k, b * k]
}

const EFFECTS = { metal: 1, invert: 2 }

/**
 * Up to three regions: `source` and `target` hold them as OKLab triples
 * (unused slots 0); `effect` 0 none, 1 metal, 2 invert.
 */
export function paletteUniforms(appearance, clusters) {
  const palette = paletteOf(appearance?.palette)
  const count = Math.min(3, clusters?.length ?? 0)
  const source = new Float32Array(9)
  const target = new Float32Array(9)
  const targets = []
  for (let i = 0; i < count; i++) {
    const own = clusters[i].lab
    const base = palette.colors
      ? hexToOklab(palette.colors[i])
      : palette.effect === 'invert'
        ? turn(own, 180)
        : own
    const lab = shifted(base, appearance?.shift?.[i])
    source.set(own, i * 3)
    target.set(lab, i * 3)
    targets.push(Array.from(target.subarray(i * 3, i * 3 + 3)))
  }
  const main = targets[0] ?? [0, 0, 0]
  const tone = (dl) => Float32Array.of(clamp(main[0] + dl), main[1], main[2])
  return {
    count,
    source,
    target,
    effect: EFFECTS[palette.effect] ?? 0,
    dark: tone(-0.18),
    light: tone(0.15),
    accent: Float32Array.from(targets[2] ?? targets.at(-1) ?? [0, 0, 0]),
  }
}
