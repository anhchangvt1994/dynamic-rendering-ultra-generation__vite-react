/*
 * An individual's traits: a pure function of its id and its species' vibe
 * (appearance v3, potential v1). The same rules are written in SQL
 * (pokemon_individual_traits_v); golden.json is the shared fixture that keeps
 * the two from drifting. Regenerate it with scripts/individual-golden.mjs.
 *
 * u32(label) = first four bytes, big-endian, of SHA-256("<id>:<label>").
 * Picking in a range is `u32 mod n`; the small modulo bias is ignored.
 */
import { digest } from '../../../utils/secure.mjs'
import { MARK_KINDS, SET_KEYS, TIER_KEYS, VIBES } from './palettes.mjs'
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

// cumulative weights of MARK_KINDS: spots 30, stripes 25, patch 20, scar 12,
// flower 8, stars 5
const MARK_STEPS = [30, 55, 75, 87, 95, 100]

const encoder = new TextEncoder()

export async function u32(id, label) {
  const bytes = await digest(encoder.encode(`${id}:${label}`))
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, false)
}

// common/rare: 70 % from the species' vibe set, else the pool; no vibe → pool
export async function individualTraits(id, vibe = null) {
  const pick = async (label, n) => (await u32(id, label)) % n
  const personality = await pick('personality', 12)
  const t = await pick('palette-tier', 100)
  const tier =
    t < 40 ? 'origin' : t < 75 ? 'common' : t < 95 ? 'rare' : 'very-rare'
  let keys = TIER_KEYS[tier]
  if (tier === 'common' || tier === 'rare') {
    const set =
      VIBES.includes(vibe) && (await pick('palette-pool', 100)) < 70
        ? vibe
        : 'pool'
    keys = SET_KEYS[set][tier]
  }
  const palette = keys[await pick('palette', keys.length)]
  const shift = []
  for (let i = 0; i < 3; i++)
    shift.push([
      (await pick(`shift${i}-h`, 17)) - 8,
      (await pick(`shift${i}-s`, 21)) - 10,
      (await pick(`shift${i}-l`, 13)) - 6,
    ])
  let marks = null
  if ((await pick('marks', 100)) < 60) {
    const k = await pick('marks-kind', 100)
    const kind = MARK_KINDS[MARK_STEPS.findIndex((step) => k < step)]
    marks = {
      kind,
      count:
        kind === 'stars'
          ? 3 + (await pick('marks-count', 5))
          : 1 + (await pick('marks-count', 10)),
      seed: await pick('marks-seed', 2147483648),
    }
  }
  const offsets = []
  for (let i = 0; i < 6; i++) offsets.push((await pick(`p${i}`, 11)) - 5)
  const sum = offsets.reduce((s, o) => s + o, 0)
  const stars = 1 + Math.floor(((sum + 30) * 5) / 61)
  return {
    personality,
    appearance: { v: 3, palette, shift, marks },
    potential: { v: 1, offsets, stars },
  }
}
