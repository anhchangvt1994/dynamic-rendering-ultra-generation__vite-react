import test from 'node:test'
import assert from 'node:assert/strict'
import { createBoard, exposed, removePair, isComplete } from './rules.mjs'

test('creates paired board and only removes equal exposed tiles', () => {
  const state = createBoard([25, 1, 1, 25], [0, 0, 0, 0])
  assert.deepEqual(state.tiles, [25, 1, 1, 25])
  assert.deepEqual(exposed(state), [0, 3])
  const next = removePair(state, 0, 3)
  assert.deepEqual(next.removed, [0, 3])
  assert.equal(isComplete(next), false)
  assert.throws(() => removePair(next, 0, 1), { message: 'blocked_tile' })
  assert.equal(isComplete(removePair(next, 1, 2)), true)
})
