import assert from 'node:assert/strict'
import test from 'node:test'
import { SPIN } from '../../games/lucky-spin/rules.mjs'
import { SPIN_DEMO, spinFrames } from './spinDemo.mjs'

test('demo is 3 spins of 3 rows x 5 reels: a miss, a win, a sweep with combo', () => {
  assert.equal(SPIN_DEMO.length, SPIN.SPINS)
  for (const g of SPIN_DEMO) assert.equal(g.length, SPIN.COLS * SPIN.ROWS)
  const landed = spinFrames().filter((f) => f.stopped === SPIN.COLS)
  assert.deepEqual(landed.map((f) => f.lines.length), [0, 1, 3])
  assert.deepEqual(landed.map((f) => f.streak), [0, 1, 2])
  assert.equal(landed[2].swept, true)
  assert.equal(landed[2].total, landed[0].total + landed[1].score + landed[2].score)
})
