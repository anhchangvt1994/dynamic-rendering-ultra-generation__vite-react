// How an individual is shown, in words. Pure: the palette and marks come
// from appearance v3, the size a deterministic scale drawn from the id.
import { PERSONALITIES } from './traits.mjs'
import { MARK_LABELS, TIER_LABELS, paletteOf } from './palettes.mjs'

const mix = (n) => {
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b)
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35)
  return (n ^ (n >>> 16)) >>> 0
}

/** "Hổ phách · Thường"; the original colours are just "Nguyên bản". */
export const paletteLabel = (appearance) => {
  const p = paletteOf(appearance?.palette)
  return p.tier === 'origin' ? p.label : `${p.label} · ${TIER_LABELS[p.tier]}`
}

/** "Lằn · 6 vệt", "Tim · 5 trái", or null when the body has no marks. */
export const marksLabel = (appearance) => {
  const m = appearance?.marks
  if (!m) return null
  const l = MARK_LABELS[m.kind]
  // stars are drawn three at least (marks.mjs MIN_STARS); old v2 ones may say 1–2
  const count = m.kind === 'stars' ? Math.max(3, m.count) : m.count
  return l ? `${l.label} · ${count} ${l.unit}` : null
}

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
