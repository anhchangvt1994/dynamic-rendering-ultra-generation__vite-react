import assert from 'node:assert/strict'
import test from 'node:test'
import { applyFlip } from './rules.mjs'

const cards = [7, 3, 7, 3]
const fresh = { open: null, matched: [], flips: 0 }

test('a first flip opens the card and shows its face', () => {
  const { state, result } = applyFlip(fresh, cards, 0)
  assert.deepEqual(state, { open: 0, matched: [], flips: 1 })
  assert.equal(result.face, 7)
  assert.equal(result.match, null)
  assert.equal(result.done, false)
})

test('the same species matches and both stay matched', () => {
  const first = applyFlip(fresh, cards, 0).state
  const { state, result } = applyFlip(first, cards, 2)
  assert.deepEqual(state, { open: null, matched: [0, 2], flips: 2 })
  assert.equal(result.match, true)
  assert.equal(result.with, 0)
})

test('different species do not match and close again', () => {
  const first = applyFlip(fresh, cards, 0).state
  const { state, result } = applyFlip(first, cards, 1)
  assert.deepEqual(state, { open: null, matched: [], flips: 2 })
  assert.equal(result.match, false)
  assert.equal(result.with, 0)
})

test('flipping the open card again, or a matched card, throws', () => {
  const first = applyFlip(fresh, cards, 0).state
  assert.throws(() => applyFlip(first, cards, 0), { message: 'already_open' })
  const done = { open: null, matched: [0, 2], flips: 2 }
  assert.throws(() => applyFlip(done, cards, 2), { message: 'bad_index' })
  assert.throws(() => applyFlip(fresh, cards, 9), { message: 'bad_index' })
})

test('matching the last pair finishes the round', () => {
  let state = fresh
  for (const i of [0, 2, 1, 3]) state = applyFlip(state, cards, i).state
  assert.equal(applyFlip({ open: 1, matched: [0, 2], flips: 3 }, cards, 3).result.done, true)
  assert.deepEqual(state.matched, [0, 2, 1, 3])
})
