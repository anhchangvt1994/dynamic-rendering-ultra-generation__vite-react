import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { PERSONALITIES, individualTraits, u32 } from './traits.mjs'
import {
  MARK_KINDS,
  PALETTES,
  SET_KEYS,
  VIBES,
  paletteOf,
} from './palettes.mjs'

// counts: stars 3–7, patch and scar 2–5, the rest 3–10 (spread over the body)
const RANGES = { stars: [3, 7], patch: [2, 5], scar: [2, 5] }

const golden = JSON.parse(
  readFileSync(new URL('./golden.json', import.meta.url), 'utf8')
)

test('u32 is the first four bytes, big-endian, of SHA-256("<id>:<label>")', async () => {
  const id = '3f2b8c1e-5d4a-4b7e-9a10-0c6d2e8f1a77'
  for (const label of ['personality', 'p0', 'palette-tier']) {
    const bytes = createHash('sha256').update(`${id}:${label}`).digest()
    assert.equal(await u32(id, label), bytes.readUInt32BE(0))
  }
})

test('twelve personalities', () => {
  assert.equal(PERSONALITIES.length, 12)
  assert.equal(new Set(PERSONALITIES).size, 12)
})

test('every golden vector is reproduced exactly', async () => {
  for (const { id, vibe, traits } of golden)
    assert.deepEqual(await individualTraits(id, vibe), traits, `${id} ${vibe}`)
})

test('the golden set spans marks/no marks, three tiers, 1 and 5 stars, vibe and pool', () => {
  const t = golden.map((g) => g.traits)
  assert.ok(golden.length >= 16)
  const sets = golden.map((g) => paletteOf(g.traits.appearance.palette).vibe)
  assert.ok(
    golden.some((g, i) => g.vibe && sets[i] === g.vibe),
    'a vibe palette'
  )
  assert.ok(
    golden.some(
      (g, i) =>
        g.vibe &&
        sets[i] === null &&
        ['common', 'rare'].includes(paletteOf(g.traits.appearance.palette).tier)
    ),
    'a pool palette despite a vibe'
  )
  assert.ok(golden.some((g) => g.vibe === null))
  assert.ok(t.some((x) => x.appearance.marks))
  assert.ok(t.some((x) => !x.appearance.marks))
  assert.ok(
    new Set(t.map((x) => paletteOf(x.appearance.palette).tier)).size >= 3
  )
  assert.ok(t.some((x) => x.potential.stars === 1))
  assert.ok(t.some((x) => x.potential.stars === 5))
})

test('4000 random ids stay inside every range and match the weights', async () => {
  const N = 4000
  const tiers = { origin: 0, common: 0, rare: 0, 'very-rare': 0 }
  const kinds = Object.fromEntries(MARK_KINDS.map((k) => [k, 0]))
  const counts = new Set()
  let marked = 0
  const keys = new Set(PALETTES.map((p) => p.key))
  for (let i = 0; i < N; i++) {
    const {
      personality,
      appearance: a,
      potential: p,
    } = await individualTraits(randomUUID())
    assert.ok(
      Number.isInteger(personality) && personality >= 0 && personality <= 11
    )
    assert.equal(a.v, 3)
    assert.ok(keys.has(a.palette), a.palette)
    tiers[paletteOf(a.palette).tier]++
    assert.equal(a.shift.length, 3)
    for (const [h, s, l] of a.shift) {
      assert.ok(Number.isInteger(h) && h >= -8 && h <= 8)
      assert.ok(Number.isInteger(s) && s >= -10 && s <= 10)
      assert.ok(Number.isInteger(l) && l >= -6 && l <= 6)
    }
    if (a.marks) {
      marked++
      assert.deepEqual(Object.keys(a.marks).sort(), ['count', 'kind', 'seed'])
      assert.ok(MARK_KINDS.includes(a.marks.kind))
      kinds[a.marks.kind]++
      const [lo, hi] = RANGES[a.marks.kind] ?? [3, 10]
      assert.ok(
        Number.isInteger(a.marks.count) &&
          a.marks.count >= lo &&
          a.marks.count <= hi,
        `${a.marks.kind} × ${a.marks.count}`
      )
      if (a.marks.kind !== 'stars') counts.add(a.marks.count)
      assert.ok(
        Number.isInteger(a.marks.seed) &&
          a.marks.seed >= 0 &&
          a.marks.seed < 2 ** 31
      )
    } else assert.equal(a.marks, null)
    assert.equal(p.v, 1)
    assert.ok(p.stars >= 1 && p.stars <= 5)
  }
  const near = (got, want, tol, what) =>
    assert.ok(
      Math.abs(got - want) <= tol,
      `${what}: ${got.toFixed(3)} vs ${want}`
    )
  near(tiers.origin / N, 0.4, 0.04, 'origin')
  near(tiers['very-rare'] / N, 0.05, 0.02, 'very-rare')
  near(marked / N, 0.6, 0.04, 'marked')
  const weights = {
    spots: 30,
    stripes: 25,
    patch: 20,
    scar: 12,
    flower: 8,
    stars: 5,
    hearts: 0,
  }
  for (const kind of MARK_KINDS)
    near(kinds[kind] / marked, weights[kind] / 100, 0.04, kind)
  assert.ok(counts.has(3) && counts.has(10))
  assert.equal(kinds.hearts, 0, 'hearts are for cute species only')
})

test('a cute species gets only hearts, stars, flowers and spots, hearts most', async () => {
  const N = 3000
  const kinds = { hearts: 0, stars: 0, flower: 0, spots: 0 }
  let marked = 0
  for (let i = 0; i < N; i++) {
    const { appearance: a } = await individualTraits(randomUUID(), 'cute')
    if (!a.marks) continue
    marked++
    assert.ok(a.marks.kind in kinds, a.marks.kind)
    kinds[a.marks.kind]++
    const [lo, hi] = RANGES[a.marks.kind] ?? [3, 10]
    assert.ok(a.marks.count >= lo && a.marks.count <= hi, `${a.marks.kind} × ${a.marks.count}`)
  }
  const want = { hearts: 45, stars: 25, flower: 20, spots: 10 }
  for (const [kind, w] of Object.entries(want))
    assert.ok(
      Math.abs(kinds[kind] / marked - w / 100) <= 0.04,
      `${kind}: ${(kinds[kind] / marked).toFixed(3)} vs ${w / 100}`
    )
})

test('every other vibe keeps the plain weights, no hearts', async () => {
  for (const vibe of ['cool', 'fierce', 'mystic', 'nature'])
    for (let i = 0; i < 300; i++) {
      const { appearance: a } = await individualTraits(randomUUID(), vibe)
      assert.notEqual(a.marks?.kind, 'hearts', vibe)
    }
})

test('with a vibe, 70% of common/rare palettes come from its set, the rest from the pool', async () => {
  const N = 3000
  let fromVibe = 0
  let fromPool = 0
  for (let i = 0; i < N; i++) {
    const { appearance: a } = await individualTraits(randomUUID(), 'fierce')
    const p = paletteOf(a.palette)
    if (p.tier !== 'common' && p.tier !== 'rare') continue
    if (p.vibe === 'fierce') fromVibe++
    else {
      assert.equal(p.vibe, null, a.palette)
      fromPool++
    }
  }
  const share = fromVibe / (fromVibe + fromPool)
  assert.ok(Math.abs(share - 0.7) < 0.05, `vibe share ${share}`)
})

test('without a vibe (or an unknown one), common/rare palettes are the pool', async () => {
  for (const vibe of [null, undefined, 'nope'])
    for (let i = 0; i < 300; i++) {
      const { appearance: a } = await individualTraits(randomUUID(), vibe)
      const p = paletteOf(a.palette)
      if (p.tier === 'common' || p.tier === 'rare')
        assert.ok(SET_KEYS.pool[p.tier].includes(a.palette), a.palette)
    }
  assert.equal(VIBES.length, 5)
})

test('stars come three to seven, all five counts', async () => {
  const seen = new Set()
  for (let i = 0; seen.size < 5 && i < 20000; i++) {
    const { appearance: a } = await individualTraits(randomUUID())
    if (a.marks?.kind === 'stars') seen.add(a.marks.count)
  }
  assert.deepEqual([...seen].sort(), [3, 4, 5, 6, 7])
})

test('the same id always gives the same traits', async () => {
  const id = randomUUID()
  assert.deepEqual(await individualTraits(id), await individualTraits(id))
})

test('without crypto.subtle (http on a LAN ip) the golden vectors still hold', async () => {
  const real = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      getRandomValues: (a) => real.get.call(globalThis).getRandomValues(a),
    },
    configurable: true,
  })
  try {
    assert.equal(globalThis.crypto.subtle, undefined)
    for (const { id, vibe, traits } of golden)
      assert.deepEqual(await individualTraits(id, vibe), traits)
  } finally {
    Object.defineProperty(globalThis, 'crypto', real)
  }
})
