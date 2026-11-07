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
import { SET_KEYS, TIER_KEYS, VIBES } from './palettes.mjs'
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

// cumulative weights: spots 30, stripes 25, patch 20, scar 12, flower 8,
// stars 5; a cute species: hearts 45, stars 25, flower 20, spots 10
const MARK_STEPS = [
  [30, 'spots'],
  [55, 'stripes'],
  [75, 'patch'],
  [87, 'scar'],
  [95, 'flower'],
  [100, 'stars'],
]
const CUTE_STEPS = [
  [45, 'hearts'],
  [70, 'stars'],
  [90, 'flower'],
  [100, 'spots'],
]

/**
 * Bumped whenever the rule gives a v3 appearance something new for the same
 * id (the local journal re-derives every individual once when it changes).
 * 2: cute marks (hearts) and counts of three at least.
 */
export const APPEARANCE_RULE = 2

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
    const steps = vibe === 'cute' ? CUTE_STEPS : MARK_STEPS
    const [, kind] = steps.find(([step]) => k < step)
    // enough marks to spread over the whole body: stars 3–7, the big patch
    // and scar 2–5, the rest 3–10
    const count =
      kind === 'stars'
        ? 3 + (await pick('marks-count', 5))
        : kind === 'patch' || kind === 'scar'
          ? 2 + (await pick('marks-count', 4))
          : 3 + (await pick('marks-count', 8))
    marks = { kind, count, seed: await pick('marks-seed', 2147483648) }
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
