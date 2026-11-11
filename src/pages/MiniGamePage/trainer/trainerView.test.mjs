import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MINIGAME, xpFor } from '../minigame.mjs'
import { trainerProgress } from './trainerView.mjs'

test('level 1 with no xp is empty', () => {
  assert.deepEqual(trainerProgress({ level: 1, xp: 0 }), { pct: 0, lit: 0, max: false, to: xpFor(2) })
})
test('halfway through level 2 lights five segments', () => {
  const xp = (xpFor(2) + xpFor(3)) / 2
  const r = trainerProgress({ level: 2, xp })
  assert.equal(r.pct, 50)
  assert.equal(r.lit, 5)
  assert.equal(r.to, xpFor(3))
})
test('max level is full and keeps its own xp as the target', () => {
  assert.deepEqual(trainerProgress({ level: MINIGAME.LEVEL_MAX, xp: 99999 }), {
    pct: 100,
    lit: 10,
    max: true,
    to: xpFor(MINIGAME.LEVEL_MAX),
  })
})
test('xp below the floor clamps to 0', () => {
  assert.equal(trainerProgress({ level: 3, xp: 0 }).pct, 0)
})
test('xp above the next level clamps to 100', () => {
  assert.equal(trainerProgress({ level: 2, xp: xpFor(3) + 500 }).pct, 100)
})
