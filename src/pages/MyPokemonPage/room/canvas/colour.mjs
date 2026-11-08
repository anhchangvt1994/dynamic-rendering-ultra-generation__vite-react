/*
 * The colours of one individual for the room's shader: each colour region of
 * the sprite (OKLab, from rig.json) and what it becomes under the
 * individual's palette and shift, plus the three tones its marks are drawn in.
 * A palette is laid as a ramp, not colour i on region i: the main region
 * takes the main colour, shades of it follow at the same lightness step, dim
 * regions stay dim, and the rest take the second colour.
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
const CUTE_FLOOR = 0.65

const chroma = ([, a, b]) => Math.hypot(a, b)
const hueOf = ([, a, b]) => Math.atan2(b, a)
const polar = (L, C, h) => [L, C * Math.cos(h), C * Math.sin(h)]
const hueGap = (p, q) => {
  const d = Math.abs(hueOf(p) - hueOf(q)) % (2 * Math.PI)
  return ((d > Math.PI ? 2 * Math.PI - d : d) * 180) / Math.PI
}
const near = (x, centre, reach) => clamp(x, centre - reach, centre + reach)

/** Each region's colour under a palette's main and second colour. */
export function rampTargets(sources, [main, second]) {
  const m = sources[0]
  const dark = main[0] < 0.45
  const reach = dark ? 0.4 : 0.2
  const mainL = near(main[0], m[0], reach)
  const mainC = dark ? Math.max(0.06, chroma(main)) : chroma(main)
  const h = hueOf(main)
  return sources.map((s, i) => {
    if (i === 0) return polar(mainL, mainC, h)
    if (s[0] < 0.42 && chroma(s) < 0.05)
      return polar(s[0], Math.min(0.04, mainC), h)
    if (chroma(s) > 0.03 && chroma(m) > 0.03 && hueGap(s, m) < 35)
      return polar(
        clamp(mainL + (s[0] - m[0]), 0.05, 0.98),
        (mainC * chroma(s)) / chroma(m),
        h
      )
    return polar(near(second[0], s[0], reach), chroma(second), hueOf(second))
  })
}

/**
 * The three mark tones, each far enough from the (final) main colour and
 * from each other. The dark tone (also the marks' rim) stays below the main
 * down to L .3; only a near-black main gets a lighter one. The accent is
 * drawn from the main (accentTone), the palette's only lending its hue.
 */
export function markTones(main, accentHex) {
  const L = main[0]
  let darkL
  let lightL
  if (L >= 0.75) {
    lightL = L - SCAR_DEEP
    darkL = L - SCAR_DEEP - 0.2
  } else if (L >= 0.3) {
    darkL = L - 0.3
    lightL = Math.min(0.97, L + 0.25)
  } else {
    darkL = L + 0.3
    lightL = Math.min(0.97, L + 0.55)
  }
  const dark = [darkL, main[1] * 1.3, main[2] * 1.3]
  const light = scarTone(main, lightL)
  return { dark, light, accent: accentTone(main, accentHex) }
}

// a scar is healed skin, always tinted (a grey line reads as dirt): in the
// body's own hue, richer, or a rose on a grey or white one. On a pale body it
// sits SCAR_DEEP below it. The shader moves its L off the skin under it
const SCAR_DEEP = 0.3
const ROSE = (15 * Math.PI) / 180
function scarTone(main, L) {
  const C = chroma(main)
  return C < 0.03
    ? polar(L, 0.09, ROSE)
    : polar(L, Math.max(0.08, C * 1.4), hueOf(main))
}

// the accent drawn from the main so the two always go together: on a light
// body a deeper, richer shade of it (a raspberry heart on pink); on a dark
// one a pale tone, in the palette accent's hue when it is a neighbour or a
// complement (then soft: a cream on blue), else the main's. Hues 30–150°
// from the main clash and are never used
const LIGHT_BODY = 0.6
const DEEP = 0.32
const NEIGHBOUR = 30
const COMPLEMENT = 150
const SOFT = 0.07
function accentTone(main, accentHex) {
  const [L] = main
  const C = chroma(main)
  const own = accentHex ? hexToOklab(accentHex) : null
  const grey = C < 0.03
  const gap = own && !grey ? hueGap(own, main) : 180
  const ownC = own ? chroma(own) : 0
  if (L >= LIGHT_BODY) {
    const h = grey
      ? own
        ? hueOf(own)
        : 0
      : gap <= NEIGHBOUR
        ? hueOf(own)
        : hueOf(main)
    const c = grey
      ? Math.min(0.12, ownC)
      : Math.min(0.24, Math.max(0.1, C * 1.25))
    return polar(L - DEEP, c, h)
  }
  const pale = Math.min(0.95, Math.max(0.82, L + 0.3))
  if (own && (grey || gap <= NEIGHBOUR))
    return polar(pale, Math.min(0.12, ownC), hueOf(own))
  if (own && gap >= COMPLEMENT)
    return polar(pale, Math.min(SOFT, ownC), hueOf(own))
  return polar(pale, Math.min(0.12, Math.max(C, 0.06)), hueOf(main))
}

/**
 * Up to three regions: `source` and `target` hold them as OKLab triples
 * (unused slots 0); `effect` 0 none, 1 metal, 2 invert.
 */
export function paletteUniforms(appearance, clusters) {
  const palette = paletteOf(appearance?.palette)
  const count = Math.min(3, clusters?.length ?? 0)
  const own = (clusters ?? []).slice(0, count).map((c) => c.lab)
  const bases = palette.colors
    ? rampTargets(own, palette.colors.map(hexToOklab))
    : palette.effect === 'invert'
      ? own.map((lab) => turn(lab, 180))
      : own
  const source = new Float32Array(9)
  const target = new Float32Array(9)
  // a cute palette stays bright and vivid: the shift may only lift it, and
  // the main region is never darker than CUTE_FLOOR
  const cute = palette.vibe === 'cute'
  const targets = bases.map((base, i) => {
    const [dh, ds, dl] = appearance?.shift?.[i] ?? [0, 0, 0]
    const lab = cute
      ? shifted(base, [dh, Math.max(0, ds), Math.max(0, dl)])
      : shifted(base, [dh, ds, dl])
    if (cute && i === 0) lab[0] = Math.max(CUTE_FLOOR, lab[0])
    source.set(own[i], i * 3)
    target.set(lab, i * 3)
    return Array.from(target.subarray(i * 3, i * 3 + 3))
  })
  const main = targets[0] ?? [0, 0, 0]
  const tones = markTones(main, palette.colors?.[2])
  return {
    count,
    source,
    target,
    effect: EFFECTS[palette.effect] ?? 0,
    // a halo of a deep accent on a light body is a smudge: only a pale one glows
    glow: cute && tones.accent[0] > main[0],
    dark: Float32Array.from(tones.dark),
    light: Float32Array.from(tones.light),
    accent: Float32Array.from(tones.accent),
  }
}
