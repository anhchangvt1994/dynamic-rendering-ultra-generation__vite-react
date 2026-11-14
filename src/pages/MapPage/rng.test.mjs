import test from 'node:test'
import assert from 'node:assert/strict'
import { hashSeed, makeRng } from './rng.mjs'

test('hashSeed is stable and sensitive to every part', () => {
  assert.equal(hashSeed('a', 1), hashSeed('a', 1))
  assert.notEqual(hashSeed('a', 1), hashSeed('a', 2))
  assert.notEqual(hashSeed('a', 1), hashSeed('b', 1))
  assert.notEqual(hashSeed('ab', 'c'), hashSeed('a', 'bc'))
})
test('makeRng repeats its sequence and stays in [0,1)', () => {
  const a = makeRng(42)
  const b = makeRng(42)
  for (let i = 0; i < 1000; i++) {
    const x = a()
    assert.equal(x, b())
    assert.ok(x >= 0 && x < 1)
  }
})
