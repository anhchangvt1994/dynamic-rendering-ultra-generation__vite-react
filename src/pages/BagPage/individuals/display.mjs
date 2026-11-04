// How an individual is shown. Pure: the tint is a CSS filter, the mark a
// deterministic cluster of spots around its centre (drawn in a mask made from
// the artwork, so nothing lands outside the body).
import { PERSONALITIES } from './traits.mjs'

const round2 = (n) => Math.round(n * 100) / 100
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

export const tintFilter = ({ hue, sat, light }) =>
  `hue-rotate(${hue}deg) saturate(${round2(1 + sat / 100)}) brightness(${round2(1 + light / 100)})`

const MARK_LABELS = {
  freckle: 'tàn nhang',
  stripe: 'vằn',
  patch: 'mảng màu',
  scar: 'sẹo',
  star: 'vết sao',
}
export const markLabel = (kind) =>
  Object.hasOwn(MARK_LABELS, kind) ? MARK_LABELS[kind] : ''

// a tiny seeded generator: the same mark always draws the same spots
const seeded = (mark) => {
  let state =
    (Math.imul(mark.x, 73856093) ^
      Math.imul(mark.y, 19349663) ^
      Math.imul(mark.size, 83492791) ^
      Math.imul(mark.rot + 1, 2654435761)) >>>
    0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function markSpots(mark) {
  if (!mark) return []
  const next = seeded(mark)
  const count = 3 + Math.floor(next() * 4)
  const spots = []
  for (let i = 0; i < count; i++) {
    const spread = i === 0 ? 0 : 1
    spots.push({
      cx: round2(clamp(mark.x + (next() * 36 - 18) * spread, 0, 100)),
      cy: round2(clamp(mark.y + (next() * 36 - 18) * spread, 0, 100)),
      r: round2(mark.size * (i === 0 ? 0.5 : 0.25 + next() * 0.25)),
      rot: (mark.rot + i * 47) % 360,
      kind: mark.kind,
    })
  }
  return spots
}

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
