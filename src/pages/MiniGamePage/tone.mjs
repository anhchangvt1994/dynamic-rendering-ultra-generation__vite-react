// The colours of a sheet, from the chosen Pokémon's palette and shift.
import { paletteOf } from '../BagPage/individuals/palettes.mjs'

const DEFAULT_HUE = 38

const hueOf = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (d === 0) return DEFAULT_HUE
  const h =
    max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return Math.round(((h * 60) % 360 + 360) % 360)
}

export function toneOf(individual) {
  const appearance = individual?.appearance
  const main = paletteOf(appearance?.palette ?? 'origin')?.colors?.[0]
  let hue = main && /^#[0-9a-f]{6}$/i.test(main) ? hueOf(main) : DEFAULT_HUE
  const first = appearance?.shift?.[0]?.[0]
  if (main && Number.isFinite(first)) hue = (hue + Math.max(-20, Math.min(20, first)) + 360) % 360
  return {
    hue,
    accent: `hsl(${hue} 90% 62%)`,
    deep: `hsl(${hue} 55% 14%)`,
    glow: `hsl(${hue} 100% 70% / .45)`,
  }
}
