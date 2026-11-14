import assert from 'node:assert/strict'
import test from 'node:test'
import { newlyMatched, rowsForMemoryBoard } from './layout.mjs'

test('memory layout counts rows for every supported difficulty', () => {
  assert.equal(rowsForMemoryBoard(12, 4), 3)
  assert.equal(rowsForMemoryBoard(16, 4), 4)
  assert.equal(rowsForMemoryBoard(20, 5), 4)
})

test('match celebration only includes newly matched cards', () => {
  assert.deepEqual(newlyMatched([0, 1], [0, 1, 4, 5]), [4, 5])
})
