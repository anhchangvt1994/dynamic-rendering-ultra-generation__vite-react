// Each type's room colours (spec: "Căn phòng theo hệ"): bg the walls, a1 the
// pattern and buttons, a2 the second accent, ink the text on a1. A pair of
// types takes the first's room and the second's a1 as its accent. Every pair
// clears 3:1 (a1 on bg) and 4.5:1 (ink on a1), and light walls are saturated
// colour, not paper: roomTheme.test.mjs.
import { TYPE_DATA } from '../../../components/pokemon-page/type-data.mjs'

const p = (bg, a1, a2, ink) => ({ bg, a1, a2, ink })
export const PALETTES = {
  normal: p('#ffd98a', '#b33d00', '#ff6b9a', '#ffffff'),
  fire: p('#1a0d08', '#ff5a1f', '#ffd23f', '#1a0d08'),
  water: p('#9fd4ff', '#0a4fc4', '#00e0d0', '#ffffff'),
  electric: p('#111111', '#ffe100', '#ff3d6e', '#111111'),
  grass: p('#b8ef8c', '#17660b', '#ffd93b', '#ffffff'),
  ice: p('#0e2a36', '#8fe8ff', '#ffffff', '#0e2a36'),
  fighting: p('#ffbe8f', '#a82e00', '#ffd21f', '#ffffff'),
  poison: p('#1b0f24', '#c06bff', '#9cff57', '#1b0f24'),
  ground: p('#f5c98a', '#7a3509', '#ff8a3d', '#ffffff'),
  flying: p('#b3cdff', '#2c45c4', '#ff7ab8', '#ffffff'),
  psychic: p('#ffb8d6', '#b0104f', '#4fc9ff', '#ffffff'),
  bug: p('#dcef7a', '#3f5600', '#ffb800', '#ffffff'),
  rock: p('#2a2419', '#e0c46a', '#e07a3a', '#2a2419'),
  ghost: p('#160f20', '#b07cff', '#59f0c8', '#160f20'),
  dragon: p('#0f1440', '#7f8cff', '#ffb340', '#0f1440'),
  dark: p('#17131f', '#8f7bff', '#ffd166', '#17131f'),
  steel: p('#a9d3ea', '#1d5470', '#5fe0ff', '#ffffff'),
  fairy: p('#ffc2ea', '#a3127f', '#ff7ac8', '#ffffff'),
}

const channel = (hex, i) => {
  const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = (hex) =>
  0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2)

/** WCAG contrast ratio of two #rrggbb colours. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const label = (type) => TYPE_DATA[type]?.label ?? type

export function themeFor(types) {
  const [first, second] = types
  const room = PALETTES[first] ?? PALETTES.normal
  const labels = types.map(label)
  return {
    ...room,
    a2: second ? (PALETTES[second] ?? room).a1 : room.a2,
    words: labels.map((word) => word.toLocaleUpperCase('vi')),
    sticker: labels.join(' ✦ '),
  }
}
