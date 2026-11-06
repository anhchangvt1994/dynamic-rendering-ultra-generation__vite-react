import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { PERSONALITIES, individualTraits, u32 } from './traits.mjs'
import { MARK_KINDS, PALETTES, TIER_KEYS, paletteOf } from './palettes.mjs'

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
  for (const { id, traits } of golden)
    assert.deepEqual(await individualTraits(id), traits, id)
})

test('the golden set spans marks/no marks, three tiers, 1 and 5 stars', () => {
  const t = golden.map((g) => g.traits)
  assert.ok(golden.length >= 16)
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
    assert.equal(a.v, 2)
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
      assert.ok(
        Number.isInteger(a.marks.count) &&
          a.marks.count >= 1 &&
          a.marks.count <= 10
      )
      counts.add(a.marks.count)
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
  }
  for (const kind of MARK_KINDS)
    near(kinds[kind] / marked, weights[kind] / 100, 0.04, kind)
  assert.ok(counts.has(1) && counts.has(10))
  assert.ok(TIER_KEYS.common.length === 14)
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
    for (const { id, traits } of golden)
      assert.deepEqual(await individualTraits(id), traits)
  } finally {
    Object.defineProperty(globalThis, 'crypto', real)
  }
})
