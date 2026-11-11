import test from 'node:test'
import assert from 'node:assert/strict'
import { confettiPieces } from './confetti.mjs'

test('same seed gives identical pieces', () => {
  assert.deepEqual(confettiPieces(7, 20), confettiPieces(7, 20))
})
test('different seed gives different pieces', () => {
  assert.notDeepEqual(confettiPieces(7, 20), confettiPieces(8, 20))
})
test('fields stay in range and length equals count', () => {
  const p = confettiPieces(3, 60)
  assert.equal(p.length, 60)
  for (const c of p) {
    assert.ok(c.x >= 0 && c.x <= 100)
    assert.ok(c.delay >= 0 && c.delay <= 400)
    assert.ok(c.dur >= 900 && c.dur <= 1800)
    assert.ok(c.size >= 6 && c.size <= 12)
    assert.ok(c.hue >= 0 && c.hue < 360)
    assert.ok(Number.isFinite(c.rot))
  }
})
test('count 0, negative or NaN gives []', () => {
  assert.deepEqual(confettiPieces(1, 0), [])
  assert.deepEqual(confettiPieces(1, -4), [])
  assert.deepEqual(confettiPieces(1, NaN), [])
})
