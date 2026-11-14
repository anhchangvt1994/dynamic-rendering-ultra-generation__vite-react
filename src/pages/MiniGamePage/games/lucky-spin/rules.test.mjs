import test from 'node:test'
import assert from 'node:assert/strict'
import { SPIN, drawGrid, scoreGrid, spinStep, rewardFor, outcomeFor, playSpins } from './rules.mjs'

const grid = (rows) => rows.flat()

test('draws 15 symbols from weighted boundaries', () => {
  assert.deepEqual(drawGrid(() => 0), Array(15).fill(0))
  assert.deepEqual(drawGrid(() => 0.999999), Array(15).fill(4))
  assert.equal(drawGrid(() => 0.34)[0], 1)
  assert.equal(drawGrid(() => 0.33)[0], 0)
  assert.throws(() => drawGrid(() => 1), { message: 'bad_random' })
})

test('scores runs of 3+ per row', () => {
  const g = grid([[0, 0, 0, 1, 2], [1, 2, 3, 4, 0], [3, 3, 3, 3, 3]])
  const s = scoreGrid(g)
  assert.deepEqual(s.lines, [
    { row: 0, start: 0, len: 3, sym: 0, pts: 1 },
    { row: 2, start: 0, len: 5, sym: 3, pts: 5 * 8 },
  ])
  assert.equal(s.pts, 41)
  assert.equal(s.swept, false)
  assert.deepEqual(scoreGrid(grid([[1, 2, 2, 2, 2], [4, 4, 4, 0, 1], [0, 1, 0, 1, 0]])).lines.map((l) => [l.row, l.start, l.len]), [[0, 1, 4], [1, 0, 3]])
})

test('three paying rows sweep for double', () => {
  const s = scoreGrid(grid([[0, 0, 0, 1, 2], [1, 1, 1, 2, 3], [2, 2, 2, 3, 4]]))
  assert.equal(s.swept, true)
  assert.equal(s.pts, (1 + 2 + 3) * 2)
})

test('streak multiplies consecutive winning spins and a miss resets it', () => {
  const win = grid([[0, 0, 0, 1, 2], [1, 2, 3, 4, 0], [2, 1, 4, 0, 3]])
  const miss = grid([[0, 1, 0, 1, 0], [1, 0, 1, 0, 1], [2, 3, 2, 3, 2]])
  let t = { streak: 0, total: 0 }
  t = spinStep(t, win); assert.deepEqual([t.streak, t.score, t.total], [1, 1, 1])
  const big = grid([[3, 3, 3, 3, 3], [1, 2, 3, 4, 0], [2, 1, 4, 0, 3]])
  const a = spinStep({ streak: 1, total: 1 }, big); assert.deepEqual([a.streak, a.score], [2, 60])
  const b = spinStep({ streak: 5, total: 0 }, big); assert.deepEqual([b.streak, b.score], [6, 80])
  const m = spinStep({ streak: 2, total: 9 }, miss); assert.deepEqual([m.streak, m.score, m.total], [0, 0, 9])
})

test('reward grows with the total and tiers the outcome', () => {
  assert.deepEqual(rewardFor(0), { xp: 1, items: [] })
  assert.deepEqual(rewardFor(2), { xp: 1, items: ['oran-berry'] })
  assert.deepEqual(rewardFor(7), { xp: 3, items: ['oran-berry', 'oran-berry', 'oran-berry'] })
  assert.equal(rewardFor(999).items.length, 5)
  assert.equal(rewardFor(999).xp, 5)
  assert.equal(outcomeFor(3), 'common')
  assert.equal(outcomeFor(4), 'uncommon')
  assert.equal(outcomeFor(12), 'rare')
})

test('three spins settle once', () => {
  const r = playSpins(() => 0)
  assert.equal(r.spins.length, SPIN.SPINS)
  assert.equal(r.total, r.spins.reduce((n, s) => n + s.score, 0))
  assert.equal(r.outcome, outcomeFor(r.total))
  assert.deepEqual(r.rewards, rewardFor(r.total))
})
