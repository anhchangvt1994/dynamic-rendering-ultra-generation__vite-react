// How an individual is shown. Pure: the tint is one of a few named colourways
// (a CSS filter), the size a deterministic scale drawn from the id.
import { PERSONALITIES } from './traits.mjs'

const round2 = (n) => Math.round(n * 100) / 100

// colourways, like a shiny, that read the same on every species: a named
// colour starts from sepia (any body to one warm brown, shading kept), then
// turns to its hue. Reversed and silver keep the body's own colours.
const hueOf = (hue, sat = 2.2) =>
  `sepia(0.8) saturate(${sat}) hue-rotate(${hue}deg)`
export const TINTS = [
  { key: 'origin', label: 'Nguyên bản', filter: '' },
  { key: 'peach', label: 'Hồng đào', filter: hueOf(-48, 2) },
  { key: 'sunset', label: 'Hoàng hôn', filter: hueOf(-18, 2.6) },
  { key: 'sun', label: 'Vàng nắng', filter: hueOf(12, 2.8) },
  { key: 'emerald', label: 'Lục bảo', filter: hueOf(105) },
  { key: 'ocean', label: 'Xanh biển', filter: hueOf(170, 2.4) },
  { key: 'dream', label: 'Tím mộng', filter: hueOf(-110, 2) },
  { key: 'invert', label: 'Đảo sắc', filter: 'hue-rotate(180deg)' },
  {
    key: 'silver',
    label: 'Ánh bạc',
    filter: 'grayscale(0.85) brightness(1.08) contrast(1.1)',
  },
]

const mix = (n) => {
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b)
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35)
  return (n ^ (n >>> 16)) >>> 0
}

export const tintOf = ({ hue = 0, sat = 0, light = 0 }) =>
  TINTS[mix((hue + 32) * 4096 + (sat + 32) * 64 + (light + 32)) % TINTS.length]

export const tintFilter = (appearance) =>
  `${tintOf(appearance).filter} saturate(${round2(1 + (appearance.sat ?? 0) / 40)}) brightness(${round2(1 + (appearance.light ?? 0) / 50)})`.trim()

export const tintLabel = (appearance) => tintOf(appearance).label

export const SIZES = [
  { key: 'tiny', label: 'Tí hon', scale: 0.8, weight: 8 },
  { key: 'small', label: 'Nhỏ', scale: 0.9, weight: 22 },
  { key: 'medium', label: 'Vừa', scale: 1, weight: 40 },
  { key: 'large', label: 'To', scale: 1.1, weight: 22 },
  { key: 'huge', label: 'Khổng lồ', scale: 1.2, weight: 8 },
]

const fnv = (text) => {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  return mix(h >>> 0)
}

/** The size of one individual, against the species' usual size. */
export function sizeOf(id) {
  let roll = fnv(`${id}:size`) % 100
  for (const size of SIZES) if ((roll -= size.weight) < 0) return size
  return SIZES[2]
}

export const sizeLabel = (size) =>
  `${size.label} · ${Math.round(size.scale * 100)}%`

const LINES = [
  'Hiền lành, thích được ở gần bạn.',
  'Hay bày trò và chạy lung tung.',
  'Bình thản, chẳng gì làm nó vội.',
  'Cái gì cũng muốn ngó thử một lần.',
  'Dám đi trước dù đường còn lạ.',
  'Hay giật mình, cần được dỗ dành.',
  'Thích nằm dài hơn là chạy nhảy.',
  'Chăm chỉ, việc gì cũng làm đến nơi.',
  'Ngẩng cao đầu, không chịu thua ai.',
  'Nghịch ngợm, luôn có trò mới.',
  'Hay nhìn mây và quên cả đường về.',
  'Nhìn kỹ trước khi bước một bước.',
]

export function personalityLine(index) {
  if (!Number.isInteger(index) || index < 0 || index >= LINES.length)
    throw new RangeError(`personality out of range: ${index}`)
  return { name: PERSONALITIES[index], line: LINES[index] }
}

export function starLabel(stars) {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5)
    throw new RangeError(`stars out of range: ${stars}`)
  return `${stars} sao`
}
