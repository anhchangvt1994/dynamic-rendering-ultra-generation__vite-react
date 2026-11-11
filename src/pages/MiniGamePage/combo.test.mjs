import assert from 'node:assert/strict'
import test from 'node:test'
import { comboBonus, nextRun, tierOf } from './combo.mjs'
import { winExp } from './minigame.mjs'

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)

test('comboBonus grows 2% per match after the first, capped at 10%', () => {
  const got = [0, 1, 2, 3, 6, 7, 20].map(comboBonus)
  ;[0, 0, 0.02, 0.04, 0.1, 0.1, 0.1].forEach((x, i) => near(got[i], x))
})

test('nextRun: first flip keeps the run, miss resets, match adds one', () => {
  assert.equal(nextRun(0, true), 1)
  assert.equal(nextRun(3, false), 0)
  assert.equal(nextRun(3, null), 3)
})

test('winExp adds the combo next to the speed bonus', () => {
  assert.equal(winExp({ d: 1, bond: 1, remainingS: 0, combo: 0.1 }), 7)
  assert.equal(winExp({ d: 3, bond: 1, remainingS: 300, combo: 0.1 }), 21)
  assert.equal(winExp({ d: 1, bond: 1, remainingS: 0 }), 6)
})

test('tierOf: 0 below a run of 2, 1 from 2, 2 from 4, 3 from 6', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 9].map(tierOf), [0, 0, 1, 1, 2, 2, 3, 3])
})
