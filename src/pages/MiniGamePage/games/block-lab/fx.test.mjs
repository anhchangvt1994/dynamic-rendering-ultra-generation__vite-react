import test from 'node:test'
import assert from 'node:assert/strict'
import { MAX_PARTICLES, burst, fireworkPlan, stepParticles } from './fx.mjs'

const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

test('shatter particles fall under gravity and spin', () => {
  const [p] = burst('shatter', { x: 50, y: 50 }, seeded(1))
  const [q] = stepParticles([p], 100)
  assert.ok(q.vy > p.vy)
  assert.notEqual(q.rot, p.rot)
  assert.ok(q.y !== p.y)
})

test('firework particles fade and are removed after their life', () => {
  const list = burst('firework', { x: 0, y: 0 }, seeded(2), { hue: 40 })
  assert.ok(list.length >= 10)
  assert.ok(list.every((p) => p.hue === 40 && p.life === p.max))
  const half = stepParticles(list, list[0].max / 2)
  assert.ok(half.length > 0 && half.every((p) => p.life < p.max))
  assert.equal(stepParticles(half, 5000).length, 0)
})

test('impact streaks go up and fade within 220 ms', () => {
  const list = burst('impact', { x: 10, y: 90 }, seeded(3))
  assert.ok(list.every((p) => p.vy < 0))
  assert.equal(stepParticles(list, 220).length, 0)
})

test('fireworkPlan scales with lines', () => {
  assert.equal(fireworkPlan(1, [18]).length, 1)
  const four = fireworkPlan(4, [16, 17, 18, 19])
  assert.ok(four.length >= 6)
  assert.deepEqual([...four].sort((a, b) => a.delayMs - b.delayMs), four)
  assert.ok(four.every((b) => [16, 17, 18, 19].includes(b.row) && b.power > 0))
  assert.deepEqual(fireworkPlan(0, []), [])
})

test('the particle cap is respected', () => {
  const existing = burst('firework', { x: 0, y: 0 }, seeded(4)).concat(Array.from({ length: MAX_PARTICLES }, () => ({ life: 1, max: 1, kind: 'shatter' })))
  const added = burst('firework', { x: 0, y: 0 }, seeded(5), { existing: existing.length })
  assert.equal(added.length, 0)
  const room = burst('shatter', { x: 0, y: 0 }, seeded(6), { existing: MAX_PARTICLES - 3 })
  assert.ok(room.length <= 3)
})

test('burst is deterministic for a seeded rng', () => {
  assert.deepEqual(burst('firework', { x: 1, y: 2 }, seeded(7)), burst('firework', { x: 1, y: 2 }, seeded(7)))
})
