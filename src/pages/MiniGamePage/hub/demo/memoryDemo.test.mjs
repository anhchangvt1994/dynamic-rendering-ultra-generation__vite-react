import assert from 'node:assert/strict'
import test from 'node:test'
import { applyFlip } from '../../games/memory/rules.mjs'
import { MEMORY_DEMO } from './memoryDemo.mjs'

test('12 cards in 6 pairs', () => {
  const { cards } = MEMORY_DEMO
  assert.equal(cards.length, 12)
  for (const f of new Set(cards)) assert.equal(cards.filter((c) => c === f).length, 2)
})
test('replaying every flip never throws, ends done, shows a mismatch', () => {
  let state = { open: null, matched: [], flips: 0 }
  let mismatches = 0
  let last
  for (const pair of MEMORY_DEMO.flips) {
    for (const i of pair) {
      const r = applyFlip(state, MEMORY_DEMO.cards, i)
      state = r.state
      last = r.result
      if (r.result.match === false) mismatches += 1
    }
  }
  assert.ok(mismatches >= 1)
  assert.equal(last.done, true)
})
