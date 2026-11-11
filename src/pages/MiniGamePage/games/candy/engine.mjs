// Candy Rush rules (docs/superpowers/specs/2026-11-11-minigame-candyrush-design.md).
// Pure and deterministic: the database's minigame_candy_* functions port this
// file line for line, and vectors.json keeps both in step.
import { MINIGAME } from '../../minigame.mjs'

const { COLS, ROWS, CELL, MOVES, TARGET, KINDS, TAPE } = MINIGAME.CANDY
const N = COLS * ROWS
const EMPTY = -1

/** Sorted indices of every cell inside a row or column run of 3 or more. */
export function findLines(board) {
  const hit = new Set()
  const scan = (start, step, length) => {
    let from = 0
    for (let i = 1; i <= length; i += 1) {
      const same = i < length && board[start + i * step] === board[start + from * step]
      if (same) continue
      if (i - from >= 3 && board[start + from * step] !== EMPTY)
        for (let k = from; k < i; k += 1) hit.add(start + k * step)
      from = i
    }
  }
  for (let r = 0; r < ROWS; r += 1) scan(r * COLS, 1, COLS)
  for (let c = 0; c < COLS; c += 1) scan(c, COLS, ROWS)
  return [...hit].sort((a, b) => a - b)
}

const swapped = (board, a, b) => {
  const next = board.slice()
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

/** True when some swap of two adjacent cells makes a line. */
export function hasMove(board) {
  for (let i = 0; i < N; i += 1) {
    if (i % COLS < COLS - 1 && findLines(swapped(board, i, i + 1)).length) return true
    if (i + COLS < N && findLines(swapped(board, i, i + COLS)).length) return true
  }
  return false
}

const take = (tape, pos) => tape[pos % tape.length]

/**
 * A fresh board from the tape, reading order. A value that would make 3 in a
 * row with the two cells to its left or above is skipped (it is consumed).
 * No move on the board: deal again from the current tape position.
 */
export function initialBoard(tape, kinds, from = 0) {
  let pos = from
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const board = new Array(N)
    for (let i = 0; i < N; i += 1) {
      const r = Math.floor(i / COLS)
      const c = i % COLS
      for (;;) {
        const v = take(tape, pos)
        pos += 1
        if (c >= 2 && board[i - 1] === v && board[i - 2] === v) continue
        if (r >= 2 && board[i - COLS] === v && board[i - 2 * COLS] === v) continue
        board[i] = v
        break
      }
    }
    if (hasMove(board)) return { board, pos }
  }
  throw new Error('tape cannot make a board')
}

const validCell = (x) => Number.isInteger(x) && x >= 0 && x < N
const adjacent = (a, b) =>
  (Math.abs(a - b) === 1 && Math.floor(a / COLS) === Math.floor(b / COLS)) ||
  Math.abs(a - b) === COLS

/**
 * One move. `null` when it is not allowed (not adjacent, out of range, no
 * line made). Otherwise the new state, the cascade `steps` (cells cleared,
 * points, board after the fall and refill) and its `depth`.
 */
export function trySwap(state, tape, kinds, a, b) {
  if (!validCell(a) || !validCell(b) || a === b || !adjacent(a, b)) return null
  let board = swapped(state.board, a, b)
  let lines = findLines(board)
  if (!lines.length) return null
  let { pos, score } = state
  const steps = []
  let depth = 0
  while (lines.length) {
    depth += 1
    const gain = CELL * depth * lines.length
    score += gain
    for (const i of lines) board[i] = EMPTY
    for (let c = 0; c < COLS; c += 1) {
      const keep = []
      for (let r = ROWS - 1; r >= 0; r -= 1) if (board[r * COLS + c] !== EMPTY) keep.push(board[r * COLS + c])
      for (let r = ROWS - 1, k = 0; r >= 0; r -= 1, k += 1) board[r * COLS + c] = k < keep.length ? keep[k] : EMPTY
    }
    for (let c = 0; c < COLS; c += 1)
      for (let r = ROWS - 1; r >= 0; r -= 1)
        if (board[r * COLS + c] === EMPTY) {
          board[r * COLS + c] = take(tape, pos)
          pos += 1
        }
    steps.push({ cleared: lines, gain, board: board.slice() })
    lines = findLines(board)
  }
  let regen = false
  if (!hasMove(board)) {
    ;({ board, pos } = initialBoard(tape, kinds, pos))
    regen = true
  }
  return { state: { board, pos, score }, swapped: [a, b], steps, depth, regen }
}

const BAD = { ok: false, score: 0, moves: 0, best: 0, movesLeft: 0, won: false, over: false }

/** Replay a list of `[a, b]` moves on a round's layout. `ok: false` when any move is not allowed. */
export function replay(layout, difficulty, moves) {
  if (!Array.isArray(moves)) return BAD
  const max = MOVES[difficulty - 1]
  const goal = TARGET[difficulty - 1]
  const kinds = KINDS[difficulty - 1]
  let state = { board: layout.board.slice(), pos: layout.pos, score: 0 }
  let best = 0
  let won = false
  let made = 0
  for (const move of moves) {
    if (won || made >= max) return BAD
    if (!Array.isArray(move) || move.length !== 2) return BAD
    const step = trySwap(state, layout.tape, kinds, move[0], move[1])
    if (!step) return BAD
    state = step.state
    best = Math.max(best, step.depth)
    made += 1
    if (state.score >= goal) won = true
  }
  return { ok: true, score: state.score, moves: made, best, movesLeft: max - made, won, over: won || made === max }
}

/** A tape for a practice round (the database makes its own from the seed). */
export const newTape = (random, kinds) =>
  Array.from({ length: TAPE }, () => Math.floor(random() * kinds))
