import assert from 'node:assert/strict'
import { test } from 'node:test'
import { requiredShards, shardRule, winsShard } from './rules.mjs'

const entry = (captureRate, powerLevel, flags = {}) => ({
  captureRate,
  powerLevel,
  legendary: false,
  mythical: false,
  ...flags,
})
test('difficulty endpoints preserve 3/100% and 20/10%', () => {
  assert.deepEqual(shardRule(entry(255, 0)), {
    r: 0,
    p: 0,
    d: 0,
    required: 3,
    drop: 1,
  })
  const hardest = shardRule(entry(1, 9))
  assert.equal(hardest.required, 20)
  assert.ok(Math.abs(hardest.drop - 0.1) < 1e-12)
})
test('representative species use approved formula', () => {
  for (const [rate, level, required, drop] of [
    [190, 2, 7, 0.806],
    [45, 5, 15, 0.379],
    [45, 7, 16, 0.294],
    [3, 8, 19, 0.15],
  ]) {
    const rule = shardRule(entry(rate, level))
    assert.equal(rule.required, required)
    assert.ok(Math.abs(rule.drop - drop) < 0.001)
  }
})
test('legendary and mythical floors use the strongest flag', () => {
  assert.equal(shardRule(entry(255, 0, { legendary: true })).r, 0.9)
  assert.equal(
    shardRule(entry(255, 0, { mythical: true, legendary: true })).r,
    0.95
  )
})
test('half rounding is upward; RNG threshold is exclusive', () => {
  assert.equal(requiredShards(1 / 34), 4)
  assert.equal(requiredShards(3 / 34), 5)
  assert.equal(requiredShards(1 / 34 - 0.01), 3)
  assert.equal(winsShard(0.4999, 0.5), true)
  assert.equal(winsShard(0.5, 0.5), false)
  assert.equal(winsShard(0, 1), true)
  assert.equal(winsShard(0.99999, 1), true)
})
test('invalid metadata and rolls are rejected rather than defaulting to common', () => {
  for (const bad of [
    null,
    {},
    entry(0, 0),
    entry(256, 0),
    entry(255, -1),
    entry(255, 10),
    entry(255, 0, { legendary: 'false' }),
  ])
    assert.throws(() => shardRule(bad))
  for (const roll of [-1, 1, NaN]) assert.throws(() => winsShard(roll, 0.5))
})
