import test from 'node:test'
import assert from 'node:assert/strict'
import { SIZES, createBoard, findPath, removePair, hasMove, isComplete, shuffle } from './rules.mjs'

// 3 rows x 4 cols
//  A B C A
//  D E F D
//  B C E F
const board = (removed = []) => createBoard({ rows: 3, cols: 4, tiles: [1, 2, 3, 1, 4, 5, 6, 4, 2, 3, 5, 6], removed })

test('sizes keep four copies of every species and an even board', () => {
  for (const { rows, cols, kinds } of Object.values(SIZES)) assert.equal(rows * cols, kinds * 4)
})

test('two equal tiles on one clear line connect with no turn', () => {
  const s = createBoard({ rows: 1, cols: 4, tiles: [7, 8, 9, 7], removed: [1, 2] })
  assert.deepEqual(findPath(s, 0, 3), [[0, 0], [0, 3]])
})

test('tiles blocked in a row connect around the board edge with two turns', () => {
  // the two 1s are in the top row with 2 and 3 between them: go up, across the outside, down
  assert.ok(findPath(board(), 0, 3))
  assert.equal(findPath(board(), 0, 3).length, 4)
})

test('a path never crosses a tile and never needs a third turn', () => {
  const s = createBoard({ rows: 3, cols: 3, tiles: [1, 2, 3, 4, 5, 6, 7, 8, 1] })
  assert.equal(findPath(s, 0, 8), null)
  // clearing the middle row opens a two-turn way: down column 0, along row 1, down column 2
  assert.ok(findPath({ ...s, removed: [3, 4, 5] }, 0, 8))
})

test('removePair needs the same species and a path, never itself', () => {
  assert.throws(() => removePair(board(), 0, 1), { message: 'bad_pair' })
  assert.throws(() => removePair(board(), 0, 0), { message: 'bad_pair' })
  assert.deepEqual(removePair(board(), 0, 3).removed, [0, 3])
  assert.throws(() => removePair(board([0, 3]), 0, 3), { message: 'bad_pair' })
})

test('hasMove finds a pair and says null when none is left', () => {
  assert.deepEqual(hasMove(board()), [0, 3])
  const stuck = createBoard({ rows: 1, cols: 2, tiles: [1, 2] })
  assert.equal(hasMove(stuck), null)
})

test('shuffle keeps the same multiset on the same cells and leaves a move', () => {
  const s = board([0, 3])
  const next = shuffle(s, () => 0.37)
  assert.deepEqual([...next.tiles].sort(), [...s.tiles].sort())
  for (const i of s.removed) assert.equal(next.tiles[i], s.tiles[i])
  assert.ok(hasMove(next))
})

test('a board is complete when every tile is removed', () => {
  const s = createBoard({ rows: 1, cols: 2, tiles: [4, 4] })
  assert.equal(isComplete(s), false)
  assert.equal(isComplete(removePair(s, 0, 1)), true)
})
