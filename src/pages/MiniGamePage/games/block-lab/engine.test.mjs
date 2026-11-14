import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GRAVITY_MS, KICKS_I, KICKS_JLSTZ, LINE_SCORE, LOCK_MS, advance, initial, intervalAt, lineGoal, newQueue, replay, shapeCells, step,
} from './engine.mjs'

const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const all = (type) => Array(40).fill(type)
const I = 0, O = 1, T = 2
const hole = (state, ...squares) => {
  const cells = Array(200).fill(1)
  for (const [c, r] of squares) cells[r * 10 + c] = 0
  return { ...state, cells }
}
const absolute = (a) => shapeCells(a.type, a.rot).map(([x, y]) => [a.x + x, a.y + y])

test('gravity speeds up with the elapsed time, not the level', () => {
  assert.equal(GRAVITY_MS.length, 31)
  assert.equal(GRAVITY_MS[0], 800)
  assert.equal(GRAVITY_MS[30], 93)
  assert.deepEqual(GRAVITY_MS, Array.from({ length: 31 }, (_, i) => Math.round(90 + 710 * (1 - i / 31) ** 1.6)))
  assert.ok(GRAVITY_MS.every((v, i) => i === 0 || v < GRAVITY_MS[i - 1]))
  assert.equal(intervalAt(0, 1), 800)
  assert.equal(intervalAt(9999, 1), 800)
  assert.equal(intervalAt(10000, 1), GRAVITY_MS[1])
  assert.equal(intervalAt(300000, 1), 93)
  assert.equal(intervalAt(999999, 1), 93)
  // harder levels start further along the curve
  assert.equal(intervalAt(0, 2), GRAVITY_MS[6])
  assert.equal(intervalAt(0, 3), GRAVITY_MS[12])
  assert.equal(initial(all(T), 2).fallAt, GRAVITY_MS[6])
  assert.equal(initial(all(T), 2).level, 2)
  assert.deepEqual(LINE_SCORE, [0, 100, 300, 500, 800])
  assert.deepEqual([1, 2, 3].map(lineGoal), [10, 20, 30])
  // ten lines raise the level (the score multiplier) by one
  const s = { ...initial(all(I), 1), lines: 9 }
  const cells = Array(200).fill(0)
  for (const c of [0, 1, 2, 7, 8, 9]) cells[190 + c] = 1
  const done = step({ ...s, cells }, 0, 5)
  assert.equal(done.lines, 10)
  assert.equal(done.level, 2)
})

test('a grounded piece locks after a short delay, not a whole gravity step', () => {
  const s = initial(all(O), 1)
  // fall to the floor by gravity alone
  let g = s
  while (g.active.y < 18) g = advance(g, g.fallAt)
  assert.equal(g.pieces, 0)
  assert.equal(g.fallAt - g.t, LOCK_MS)
  const locked = advance(g, g.fallAt)
  assert.equal(locked.pieces, 1)
  // sliding a grounded piece never pushes the lock later
  const slid = step(g, g.t + 10, 0)
  assert.ok(slid.fallAt <= g.fallAt)
  // a piece moved off a ledge keeps the normal pace
  const air = step(s, 5, 0)
  assert.equal(air.fallAt, s.fallAt)
})

test('7-bag queue', () => {
  const q = newQueue(seeded(3), 3)
  assert.equal(q.length, 21)
  for (let b = 0; b < 3; b += 1) assert.deepEqual([...q.slice(b * 7, b * 7 + 7)].sort(), [0, 1, 2, 3, 4, 5, 6])
  assert.deepEqual(newQueue(seeded(3), 3), q)
})

test('spawn and movement stop at the walls', () => {
  const s = initial(all(T), 1)
  assert.deepEqual(s.active, { type: T, rot: 0, x: 3, y: -1 })
  assert.equal(step(s, 0, 0).active.x, 2)
  let w = s
  for (let i = 0; i < 12; i += 1) w = step(w, 0, 0)
  assert.equal(w.active.x, 0)
  for (let i = 0; i < 12; i += 1) w = step(w, 0, 1)
  assert.equal(Math.max(...absolute(w.active).map(([c]) => c)), 9)
  const bar = initial(all(I), 1)
  let b = bar
  for (let i = 0; i < 12; i += 1) b = step(b, 0, 0)
  assert.equal(b.active.x, 0)
})

test('rotation uses SRS kicks', () => {
  const t = initial(all(T), 1)
  const there = step(t, 0, 2)
  assert.equal(there.active.rot, 1)
  assert.deepEqual(step(there, 0, 3).active, t.active)
  // the vertical I bar pushed to the left wall kicks back inside when it turns flat
  let s = step(initial(all(I), 1), 0, 2)
  for (let i = 0; i < 8; i += 1) s = step(s, 0, 0)
  assert.equal(s.active.x, -2)
  const flat = step(s, 0, 3)
  assert.equal(flat.active.rot, 0)
  assert.ok(absolute(flat.active).every(([c, r]) => c >= 0 && c < 10 && r < 20))
  // a piece with no legal kick keeps its place
  const stuck = hole({ ...initial(all(T), 1), active: { type: T, rot: 0, x: 3, y: 10 } }, ...absolute({ type: T, rot: 0, x: 3, y: 10 }))
  assert.deepEqual(step(stuck, 0, 2).active, stuck.active)
  // the tables are the SRS lists (y up)
  assert.deepEqual(KICKS_JLSTZ['01'], [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]])
  assert.deepEqual(KICKS_I['01'], [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]])
})

test('soft drop and hard drop scoring', () => {
  const s = initial(all(O), 1)
  const soft = step(s, 0, 4)
  assert.equal(soft.active.y, s.active.y + 1)
  assert.equal(soft.score, 1)
  const hard = step(s, 0, 5)
  assert.equal(hard.score, 2 * 19)
  assert.equal(hard.pieces, 1)
  assert.equal(hard.idx, 1)
  assert.deepEqual(hard.active, { type: O, rot: 0, x: 3, y: -1 })
  assert.equal(hard.cells.filter(Boolean).length, 4)
})

test('line clears score by count and rows settle', () => {
  for (const n of [1, 2, 3, 4]) {
    const cells = Array(200).fill(0)
    for (let r = 20 - n; r < 20; r += 1) for (let c = 0; c < 10; c += 1) if (c !== 5) cells[r * 10 + c] = 2
    const down = step({ ...initial(all(I), 1), cells }, 0, 2)
    const done = step(down, 0, 5)
    assert.equal(done.lines, n)
    assert.equal(done.score, 2 * 17 + LINE_SCORE[n], `score for ${n}`)
    const left = done.cells.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)
    assert.equal(left.length, 4 - n)
    assert.ok(left.every((i) => i % 10 === 5 && i >= (16 + n) * 10))
  }
})

test('gravity locks and spawns', () => {
  const s = advance(initial(all(O), 1), 800 * 25)
  assert.ok(s.pieces >= 1)
  assert.equal(s.idx, s.pieces)
  assert.ok(s.cells.some(Boolean))
})

test('top out', () => {
  // a piece that locks above the field ends the game
  const lockOut = hole({ ...initial(all(T), 1) }, [3, 0], [4, 0], [5, 0])
  const out = step({ ...lockOut, cells: lockOut.cells.map((v, i) => (i < 10 && ![3, 4, 5].includes(i) ? 1 : v)) }, 0, 5)
  assert.equal(out.over, true)
  // the next piece spawning on a block ends the game too
  const cells = Array(200).fill(0)
  for (let r = 2; r < 20; r += 1) for (const c of [3, 4, 5, 6]) cells[r * 10 + c] = 1
  const spawnOut = step({ ...initial(all(T), 1), cells }, 0, 5)
  assert.equal(spawnOut.over, true)
  assert.equal(spawnOut.pieces, 1)
  // nothing moves after the end
  assert.deepEqual(step(spawnOut, 5, 0).cells, spawnOut.cells)
  assert.equal(step(spawnOut, 5, 0).over, true)
  assert.equal(step(spawnOut, 5, 5).pieces, 1)
})

test('reaching the goal freezes the game as a win', () => {
  const cells = Array(200).fill(0)
  for (const c of [0, 1, 2, 7, 8, 9]) cells[190 + c] = 1
  const won = step({ ...initial(all(I), 1), cells, lines: 9 }, 0, 5)
  assert.equal(won.won, true)
  assert.equal(won.over, false)
  assert.equal(step(won, 10, 5).pieces, won.pieces)
})

const tetrisLog = (count) => {
  const log = []
  let t = 0
  for (let i = 0; i < count; i += 1) {
    const col = i % 10
    log.push([t += 100, 2])
    for (let m = 0; m < Math.abs(col - 5); m += 1) log.push([t += 100, col < 5 ? 0 : 1])
    log.push([t += 100, 5])
  }
  return log
}

test('replay: a legal log reaches the goal', () => {
  const r = replay(all(I), 1, tetrisLog(30), 600000)
  assert.equal(r.ok, true)
  assert.equal(r.state.lines, 12)
  assert.equal(r.won, true)
  assert.equal(r.over, false)
})

test('replay rejects bad logs', () => {
  const q = all(T)
  assert.equal(replay(q, 1, [[200, 0], [100, 0]], 1000).ok, false)
  assert.equal(replay(q, 1, [[100, 9]], 1000).ok, false)
  assert.equal(replay(q, 1, [[2000, 0]], 1000).ok, false)
  assert.equal(replay(q, 1, [[1.5, 0]], 1000).ok, false)
  assert.equal(replay(q, 1, Array.from({ length: 6001 }, () => [0, 0]), 1000).ok, false)
  assert.equal(replay(q, 1, 'nope', 1000).ok, false)
})

test('replay is deterministic and idle players top out', () => {
  const q = newQueue(seeded(11), 20)
  const a = replay(q, 1, [], 300000)
  assert.equal(a.ok, true)
  assert.equal(a.over, true)
  assert.equal(a.won, false)
  assert.deepEqual(replay(q, 1, [], 300000), a)
})
