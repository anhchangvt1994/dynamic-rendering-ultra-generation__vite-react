import test from 'node:test'
import assert from 'node:assert/strict'
import { createBoard, place, isComplete } from './rules.mjs'

test('places a piece, clears a full row and rejects out-of-range placement', () => {
  const state = createBoard(4, 4, [[1, 0, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])
  const result = place(state, [[1, 0], [3, 0]])
  assert.equal(result.lines, 1)
  assert.equal(result.score, 100)
  assert.deepEqual(result.cells, [])
  assert.equal(isComplete(result, 100), true)
  assert.throws(() => place(state, [[-1, 0]]), { message: 'bad_piece' })
})
