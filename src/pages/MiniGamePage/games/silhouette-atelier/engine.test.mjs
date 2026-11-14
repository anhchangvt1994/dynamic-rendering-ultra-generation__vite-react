import { readFileSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { GRIDS, TRAY, TURN, apply, gridFor, initialState, isLocked, isSolved, lockedCount, replay, startTurns } from './engine.mjs'

const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

test('grid per difficulty: 6, 9 and 12 pieces', () => {
  assert.deepEqual(GRIDS, [[2, 3], [3, 3], [3, 4]])
  assert.deepEqual(gridFor(1), { cols: 2, rows: 3 })
  assert.deepEqual(gridFor(3), { cols: 3, rows: 4 })
})

test('start turns: easy upright, normal any, hard always crooked', () => {
  assert.deepEqual(startTurns(seeded(1), 6, 1), [0, 0, 0, 0, 0, 0])
  assert.ok(startTurns(seeded(2), 9, 2).every((r) => r >= 0 && r < 4))
  for (let s = 0; s < 20; s += 1) assert.ok(startTurns(seeded(s), 12, 3).every((r) => r >= 1 && r <= 3))
})

test('drop, swap out, return to tray and turn', () => {
  const s = initialState([1, 0, 0, 0])
  assert.deepEqual(apply(s, 0, 2).at, [2, -1, -1, -1])
  assert.deepEqual(apply(s, 0, TURN).rot, [2, 0, 0, 0])
  assert.deepEqual(apply(apply(s, 0, 2), 0, TRAY).at, [-1, -1, -1, -1])
  // dropping onto an occupied cell sends the occupant to the tray
  const two = apply(apply(s, 0, 2), 1, 2)
  assert.deepEqual(two.at, [-1, 2, -1, -1])
})

test('a piece upright in its home cell locks; locked pieces refuse every action', () => {
  const s = apply(initialState([0, 2, 0, 0]), 0, 0)
  assert.equal(isLocked(s, 0), true)
  assert.equal(lockedCount(s), 1)
  assert.equal(apply(s, 0, TURN), null)
  assert.equal(apply(s, 0, TRAY), null)
  assert.equal(apply(s, 1, 0), null) // cannot displace a locked piece
  // home but crooked is not locked
  const crooked = apply(initialState([1, 0, 0, 0]), 0, 0)
  assert.equal(isLocked(crooked, 0), false)
  assert.notEqual(apply(crooked, 0, TURN), null)
})

test('illegal actions return null', () => {
  const s = initialState([0, 0, 0, 0])
  assert.equal(apply(s, 0, TRAY), null) // already in the tray
  assert.equal(apply(s, 4, 0), null)
  assert.equal(apply(s, -1, 0), null)
  assert.equal(apply(s, 0, 4), null)
  assert.equal(apply(s, 0, 1.5), null)
  assert.equal(apply(apply(s, 0, 3), 0, 3), null) // same cell again
})

test('solved when every piece is home and upright', () => {
  let s = initialState([0, 3, 0, 0])
  for (const [i, code] of [[0, 0], [1, TURN], [2, 2], [3, 3], [1, 1]]) s = apply(s, i, code) ?? s
  assert.equal(isSolved(s), true)
  assert.equal(isSolved(initialState([0, 0])), false)
})

test('replay plays a timed log and rejects bad ones', () => {
  const layout = { rot: [0, 1] }
  const log = [[10, 0, 0], [20, 1, TURN], [30, 1, TURN], [40, 1, TURN], [50, 1, 1]]
  const good = replay(layout, log, 300000)
  assert.deepEqual([good.ok, good.moves, good.solved], [true, 5, true])
  const done = replay(layout, [[10, 0, 0], [20, 1, 1], [30, 1, TURN], [40, 1, TURN], [50, 1, TURN]], 300000)
  assert.deepEqual([done.ok, done.solved], [true, true]) // three turns bring the crooked piece upright
  assert.equal(replay(layout, [[10, 0, 0], [20, 1, 1], [30, 1, TURN], [40, 1, TURN], [50, 1, TURN], [60, 1, TURN]], 300000).ok, false) // locked
  const solved = replay({ rot: [0, 3] }, [[10, 0, 0], [20, 1, 1], [30, 1, TURN]], 300000)
  assert.deepEqual([solved.ok, solved.solved], [true, true])
  assert.equal(replay(layout, [[10, 0, 0], [5, 1, 1]], 300000).ok, false) // time goes back
  assert.equal(replay(layout, [[400000, 0, 0]], 300000).ok, false) // after the end
  assert.equal(replay(layout, [[10, 0]], 300000).ok, false)
  assert.equal(replay(layout, [[10, 0, 9]], 300000).ok, false)
  assert.equal(replay(layout, {}, 300000).ok, false)
  assert.equal(replay({ rot: [0, 0] }, [[1, 0, 0], [2, 1, 1], [3, 0, TURN]], 300000).ok, false) // move after solved
})

test('vectors.json replays to the recorded result', () => {
  const vectors = JSON.parse(readFileSync(new URL('./vectors.json', import.meta.url), 'utf8'))
  for (const v of vectors) {
    const r = replay({ rot: v.rot }, v.log, v.endMs)
    assert.deepEqual({ ok: r.ok, moves: r.moves, solved: r.solved }, v.expect, v.name)
  }
})
