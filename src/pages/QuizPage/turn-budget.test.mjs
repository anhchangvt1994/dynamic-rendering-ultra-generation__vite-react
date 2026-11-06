import assert from 'node:assert/strict'
import test from 'node:test'
import { currentTurns, turnsLeft, giveTurn, WINDOW_MS } from './progress.mjs'

test('ten turns, including five extra in an existing window', () => {
  assert.equal(turnsLeft(currentTurns({}, 1000)), 10)
  const prior = { start: 1000, used: 5, bonus: 1 }
  const active = currentTurns(prior, 2000)
  assert.equal(active.start, 1000)
  assert.equal(active.used, 5)
  assert.equal(active.bonus, 1)
  assert.equal(turnsLeft(active), 6)
  assert.equal(turnsLeft({ ...active, bonus: 0 }), 5)
  assert.equal(turnsLeft(currentTurns(prior, 1000 + WINDOW_MS)), 10)
})

test('lucky turn restores one but never exceeds ten', () => {
  const full = currentTurns({}, 1000)
  assert.deepEqual(giveTurn(full), full)
  assert.equal(turnsLeft(giveTurn({ ...full, used: 1 })), 10)
})
