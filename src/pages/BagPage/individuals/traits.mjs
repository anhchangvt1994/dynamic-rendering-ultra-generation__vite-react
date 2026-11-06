/*
 * An individual's traits: a pure function of (its id, version 1). The same
 * rules are written in SQL (pokemon_individual_traits); golden.json is the
 * shared fixture that keeps the two from drifting.
 *
 * u32(label) = first four bytes, big-endian, of SHA-256("<id>:<label>").
 * Picking in a range is `u32 mod n`; the small modulo bias is ignored.
 */
import { digest } from '../../../utils/secure.mjs'
export const PERSONALITIES = [
  'Hiền',
  'Nghịch',
  'Điềm tĩnh',
  'Tò mò',
  'Dũng cảm',
  'Nhút nhát',
  'Lười',
  'Siêng',
  'Kiêu hãnh',
  'Tinh nghịch',
  'Mơ mộng',
  'Cẩn thận',
]
export const MARK_KINDS = ['freckle', 'stripe', 'patch', 'scar', 'star']

const encoder = new TextEncoder()

export async function u32(id, label) {
  const bytes = await digest(encoder.encode(`${id}:${label}`))
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, false)
}

export async function individualTraits(id) {
  const pick = async (label, n) => (await u32(id, label)) % n
  const personality = await pick('personality', 12)
  const hue =
    ((await pick('hue-sign', 2)) === 0 ? -1 : 1) *
    (4 + (await pick('hue-mag', 7)))
  const sat = (await pick('sat', 17)) - 8
  const light = (await pick('light', 9)) - 4
  let mark = null
  if ((await pick('mark', 100)) < 35) {
    mark = {
      kind: MARK_KINDS[await pick('mark-kind', 5)],
      x: 30 + (await pick('mark-x', 41)),
      y: 30 + (await pick('mark-y', 41)),
      size: 12 + (await pick('mark-size', 13)),
      rot: await pick('mark-rot', 360),
    }
  }
  const offsets = []
  for (let i = 0; i < 6; i++) offsets.push((await pick(`p${i}`, 11)) - 5)
  const sum = offsets.reduce((s, o) => s + o, 0)
  const stars = 1 + Math.floor(((sum + 30) * 5) / 61)
  return {
    personality,
    appearance: { v: 1, hue, sat, light, mark },
    potential: { v: 1, offsets, stars },
  }
}
