import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { MARK_KINDS, PERSONALITIES, individualTraits, u32 } from './traits.mjs'

const golden = JSON.parse(
  readFileSync(new URL('./golden.json', import.meta.url), 'utf8')
)

test('u32 is the first four bytes, big-endian, of SHA-256("<id>:<label>")', async () => {
  const id = '3f2b8c1e-5d4a-4b7e-9a10-0c6d2e8f1a77'
  for (const label of ['personality', 'p0', 'hue-mag']) {
    const bytes = createHash('sha256').update(`${id}:${label}`).digest()
    assert.equal(await u32(id, label), bytes.readUInt32BE(0))
  }
})

test('twelve personalities, five mark kinds', () => {
  assert.equal(PERSONALITIES.length, 12)
  assert.equal(new Set(PERSONALITIES).size, 12)
  assert.deepEqual(MARK_KINDS, ['freckle', 'stripe', 'patch', 'scar', 'star'])
})

test('every golden vector is reproduced exactly', async () => {
  for (const { id, traits } of golden)
    assert.deepEqual(await individualTraits(id), traits, id)
})

test('the golden set spans both hue signs, mark/no mark, 1 and 5 stars', () => {
  const t = golden.map((g) => g.traits)
  assert.ok(t.some((x) => x.appearance.hue < 0))
  assert.ok(t.some((x) => x.appearance.hue > 0))
  assert.ok(t.some((x) => x.appearance.mark))
  assert.ok(t.some((x) => !x.appearance.mark))
  assert.ok(t.some((x) => x.potential.stars === 1))
  assert.ok(t.some((x) => x.potential.stars === 5))
  assert.ok(golden.length >= 6)
})

test('2000 random ids stay inside every range', async () => {
  let marks = 0
  for (let i = 0; i < 2000; i++) {
    const id = randomUUID()
    const {
      personality,
      appearance: a,
      potential: p,
    } = await individualTraits(id)
    assert.ok(
      Number.isInteger(personality) && personality >= 0 && personality <= 11
    )
    assert.equal(a.v, 1)
    assert.ok(Math.abs(a.hue) >= 4 && Math.abs(a.hue) <= 10)
    assert.ok(a.sat >= -8 && a.sat <= 8)
    assert.ok(a.light >= -4 && a.light <= 4)
    if (a.mark) {
      marks++
      assert.ok(MARK_KINDS.includes(a.mark.kind))
      assert.ok(a.mark.x >= 30 && a.mark.x <= 70)
      assert.ok(a.mark.y >= 30 && a.mark.y <= 70)
      assert.ok(a.mark.size >= 12 && a.mark.size <= 24)
      assert.ok(a.mark.rot >= 0 && a.mark.rot <= 359)
    }
    assert.equal(p.v, 1)
    assert.equal(p.offsets.length, 6)
    assert.ok(p.offsets.every((o) => Number.isInteger(o) && o >= -5 && o <= 5))
    const sum = p.offsets.reduce((s, o) => s + o, 0)
    assert.equal(p.stars, 1 + Math.floor(((sum + 30) * 5) / 61))
    assert.ok(p.stars >= 1 && p.stars <= 5)
  }
  assert.ok(marks > 500 && marks < 900, `mark rate ${marks}/2000`)
})

test('the same id always gives the same traits', async () => {
  const id = randomUUID()
  assert.deepEqual(await individualTraits(id), await individualTraits(id))
})

test('without crypto.subtle (http on a LAN ip) the golden vectors still hold', async () => {
  const real = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  Object.defineProperty(globalThis, 'crypto', {
    value: { getRandomValues: (a) => real.get.call(globalThis).getRandomValues(a) },
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
