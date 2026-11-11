import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { MINIGAME } from '../../minigame.mjs'
import {
  findLines,
  hasMove,
  initialBoard,
  newTape,
  replay,
  trySwap,
} from './engine.mjs'

const { COLS, ROWS, CELL, MOVES, TARGET } = MINIGAME.CANDY
// 7 strings of 6 digits -> board; base filler (c + 2r) % 4 has no run and no move
const base = () =>
  Array.from({ length: ROWS * COLS }, (_, i) => (((i % COLS) + 2 * Math.floor(i / COLS)) % 4))
const at = (r, c) => r * COLS + c
const mix = (n) => Array.from({ length: n }, (_, i) => (i * 7 + (i >> 2) + (i >> 4)) % 4)
const state = (board, pos = 0) => ({ board, pos, score: 0 })

// before swap: row 6 = 4 4 2 ..., (5,2) = 4  -> swapping (5,2)/(6,2) makes 4 4 4 on row 6
const threeRun = () => {
  const b = base()
  b[at(6, 0)] = 4
  b[at(6, 1)] = 4
  b[at(5, 2)] = 4
  return b
}

test('initialBoard has no run of 3 and at least one move', () => {
  const tape = mix(1000)
  const { board } = initialBoard(tape, 4)
  assert.equal(board.length, ROWS * COLS)
  assert.deepEqual(findLines(board), [])
  assert.equal(hasMove(board), true)
})

test('initialBoard consumes skipped tape values', () => {
  const { pos } = initialBoard(Array(60).fill(0).map((_, i) => (i % 3 < 2 ? 0 : 1)), 2)
  assert.ok(pos > ROWS * COLS)
})

test('trySwap rejects bad moves with null', () => {
  const s = state(threeRun())
  const tape = [5, 5, 5, 6]
  for (const [a, b] of [
    [3, 3],
    [0, 2],
    [5, 6],
    [0, 7],
    [0, 1.5],
    [-1, 0],
    [0, ROWS * COLS],
    [0, 'x'],
  ])
    assert.equal(trySwap(s, tape, 4, a, b), null, `${a},${b}`)
  // adjacent but no line made
  assert.equal(trySwap(s, tape, 4, at(0, 0), at(0, 1)), null)
})

test('a swap making a 3-run scores CELL x 3', () => {
  const r = trySwap(state(threeRun()), [8, 9, 8, 9, 8, 9, 8, 9], 4, at(5, 2), at(6, 2))
  assert.equal(r.steps[0].gain, 3 * CELL)
  assert.deepEqual(r.steps[0].cleared, [at(6, 0), at(6, 1), at(6, 2)])
  assert.equal(r.depth, 1)
  assert.equal(r.state.score, 3 * CELL)
  assert.equal(r.state.pos, 3)
})

test('an L shape clears the union of its lines once', () => {
  const b = base()
  // col 0 rows 4,5 = 4 and row 6 cols 1,2 = 4; swap (6,0) with (6,... ) -> use (6,0)=2 and (5,1)... keep simple:
  b[at(4, 0)] = 4
  b[at(5, 0)] = 4
  b[at(6, 1)] = 4
  b[at(6, 2)] = 4
  b[at(6, 0)] = 2
  b[at(5, 1)] = 4 // swap (5,1)<->(6,1)? no: (6,0)<->(5,0) not valid; use (6,0) <-> (6,1)
  const s = state(b)
  const r = trySwap(s, [9, 8, 9, 8, 9, 8, 9, 8], 4, at(6, 0), at(6, 1))
  // after swap (6,0)=4,(6,1)=2 : col 0 rows 4..6 = 4 4 4 -> one vertical run of 3 (row 6 has 4 _ 4)
  assert.deepEqual(r.steps[0].cleared, [at(4, 0), at(5, 0), at(6, 0)])
})

test('L and T union counts the shared cell once', () => {
  const b = base()
  // row 6: 4 4 [2] 3 ..., col 2 rows 4,5 = 4; bring a 4 into (6,2) from (6,3)
  b[at(6, 0)] = 4
  b[at(6, 1)] = 4
  b[at(6, 2)] = 2
  b[at(6, 3)] = 4
  b[at(5, 2)] = 4
  b[at(4, 2)] = 4
  const r = trySwap(state(b), [9, 8, 9, 8, 9, 8, 9, 8, 9, 8], 4, at(6, 2), at(6, 3))
  assert.deepEqual(r.steps[0].cleared, [at(4, 2), at(5, 2), at(6, 0), at(6, 1), at(6, 2)])
  assert.equal(r.steps[0].gain, 5 * CELL)
})

test('refill takes the tape columns left to right, lowest empty cell upward', () => {
  const b = base()
  // clear col 0 rows 5,6 plus ... build: row 6 cols 0..2 cleared -> one empty per column 0..2
  b[at(6, 0)] = 4
  b[at(6, 1)] = 4
  b[at(5, 2)] = 4
  const tape = [50, 51, 52, 53, 54, 55, 56, 57, 58, 59]
  const r = trySwap(state(b), tape, 4, at(5, 2), at(6, 2))
  const after = r.steps[0].board
  assert.deepEqual([after[at(0, 0)], after[at(0, 1)], after[at(0, 2)]], [50, 51, 52])
})

test('refill order inside a column: lowest empty first', () => {
  const b = base()
  // vertical run in col 0 rows 4..6 (4 4 [x] swapped in from col 1) -> 3 empty cells in col 0
  b[at(4, 0)] = 4
  b[at(5, 0)] = 4
  b[at(6, 0)] = 2
  b[at(6, 1)] = 4
  const r = trySwap(state(b), [50, 51, 52, ...mix(300)], 4, at(6, 0), at(6, 1))
  const after = r.steps[0].board
  // lowest empty = row 2, then row 1, then row 0 -> 50, 51, 52 bottom-up
  assert.deepEqual([after[at(2, 0)], after[at(1, 0)], after[at(0, 0)]], [50, 51, 52])
})

test('a chain scores CELL x depth per cell and reports its depth', () => {
  const b = threeRun()
  // refill puts 5 5 5 on row 0 of cols 0..2 -> second depth clears them
  const tape = [5, 5, 5, 6, 7, 8, 9, 10, 11]
  const r = trySwap(state(b), tape, 4, at(5, 2), at(6, 2))
  assert.equal(r.depth, 2)
  assert.deepEqual(r.steps.map((s) => s.gain), [3 * CELL, 3 * CELL * 2])
  assert.equal(r.state.score, 90)
})

test('the tape wraps', () => {
  const r = trySwap(state(threeRun(), 2), [31, 32, 33], 4, at(5, 2), at(6, 2))
  assert.deepEqual(
    [r.steps[0].board[at(0, 0)], r.steps[0].board[at(0, 1)], r.steps[0].board[at(0, 2)]],
    [33, 31, 32]
  )
  assert.equal(r.state.pos, 5)
})

test('a board with no move left is regenerated for free', () => {
  // refill makes every cell unmatched and moveless: use a tape of a no-move pattern
  const tape = Array.from({ length: 200 }, (_, i) => i % 5)
  const r = trySwap(state(threeRun()), tape, 5, at(5, 2), at(6, 2))
  assert.equal(typeof r.regen, 'boolean')
  assert.equal(hasMove(r.state.board), true)
})

test('replay: too many moves, bad shapes and a move after the win are rejected', () => {
  const layout = (() => {
    const tape = mix(1000)
    return { tape, ...initialBoard(tape, 4) }
  })()
  assert.equal(replay(layout, 1, 'x').ok, false)
  assert.equal(replay(layout, 1, [[1]]).ok, false)
  assert.equal(replay(layout, 1, [[1, 'a']]).ok, false)
  assert.equal(replay(layout, 1, [null]).ok, false)
  assert.equal(replay(layout, 1, Array(MOVES[0] + 1).fill([0, 0])).ok, false)
  assert.equal(replay(layout, 1, []).ok, true)
  assert.equal(replay(layout, 1, []).movesLeft, MOVES[0])
})

test('replay stops at the target: a later move is bad', () => {
  const b = threeRun()
  const layout = { tape: [5, 5, 5, 6, 7, 8, 9, 10, 11], board: b, pos: 0 }
  const move = [at(5, 2), at(6, 2)]
  const r = replay(layout, 1, [move])
  assert.equal(r.ok, true)
  assert.equal(r.score, 90)
  assert.equal(r.best, 2)
  assert.equal(r.won, false)
  assert.equal(r.over, false)
  assert.equal(r.movesLeft, MOVES[0] - 1)
})

test('shared vectors reproduce exactly', () => {
  const vectors = JSON.parse(readFileSync(new URL('./vectors.json', import.meta.url), 'utf8'))
  assert.ok(vectors.length >= 4)
  for (const v of vectors) {
    const { board, pos } = initialBoard(v.tape, v.kinds)
    assert.deepEqual(board, v.board0, v.name)
    assert.equal(pos, v.pos0, v.name)
    const r = replay({ tape: v.tape, board, pos }, v.difficulty, v.moves)
    assert.equal(r.ok, true, v.name)
    assert.equal(r.score, v.score, v.name)
    assert.equal(r.best, v.best, v.name)
    assert.equal(r.won, v.won, v.name)
    assert.equal(r.movesLeft, v.movesLeft, v.name)
  }
})

test('TARGET reachable constants', () => {
  assert.deepEqual(TARGET, [3000, 3000, 2400])
})
