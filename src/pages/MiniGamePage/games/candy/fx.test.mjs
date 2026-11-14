import test from 'node:test'
import assert from 'node:assert/strict'
import { analyze, calloutFor, centroid, fallRows, hintMove } from './fx.mjs'

// 6 columns x 7 rows, cell = r * 6 + c
test('a plain row of 3', () => {
  const a = analyze([0, 1, 2], 6, 7)
  assert.equal(a.longest, 3)
  assert.equal(a.cross, null)
  assert.equal(a.groups, 1)
  assert.deepEqual(a.runs.map((r) => r.dir), ['row'])
})
test('a column of 5 is the longest', () => {
  const a = analyze([1, 7, 13, 19, 25], 6, 7)
  assert.equal(a.longest, 5)
  assert.deepEqual(a.runs[0].cells, [1, 7, 13, 19, 25])
  assert.equal(a.runs[0].dir, 'col')
})
test('an L or T names its crossing cell', () => {
  // row 0 cells 0..2 and column 0 cells 0, 6, 12 cross at 0
  const a = analyze([0, 1, 2, 6, 12], 6, 7)
  assert.equal(a.cross, 0)
  assert.equal(a.groups, 1)
})
test('two apart matches are two groups', () => {
  const a = analyze([0, 1, 2, 38, 39, 40], 6, 7)
  assert.equal(a.groups, 2)
})
test('callout grows with the cascade depth', () => {
  const t = (d, s) => calloutFor(d, analyze(s, 6, 7))
  assert.equal(t(1, [0, 1, 2]).tier, 0)
  assert.equal(t(2, [0, 1, 2]).tier, 1)
  assert.equal(t(3, [0, 1, 2]).tier, 2)
  assert.equal(t(4, [0, 1, 2]).tier, 3)
  assert.equal(t(6, [0, 1, 2]).tier, 4)
  assert.ok(t(2, [0, 1, 2]).text.length > 0)
})
test('a long or crossing first match is noted at depth 1', () => {
  assert.equal(calloutFor(1, analyze([0, 1, 2, 3], 6, 7)).tier, 1)
  assert.equal(calloutFor(1, analyze([0, 1, 2, 3, 4], 6, 7)).tier, 2)
  assert.equal(calloutFor(1, analyze([0, 1, 2, 6, 12], 6, 7)).tier, 2)
})
test('centroid is the mean row and column', () => {
  assert.deepEqual(centroid([0, 1, 2], 6), [0, 1])
  assert.deepEqual(centroid([1, 7], 6), [0.5, 1])
})
test('survivors fall by the cleared cells below them; spawns fall by the column count', () => {
  // clear rows 3 and 5 of column 2
  const f = fallRows([3 * 6 + 2, 5 * 6 + 2], 6, 7)
  assert.equal(f[6 * 6 + 2], 0) // below both
  assert.equal(f[5 * 6 + 2], 1) // was row 4: one cleared below
  assert.equal(f[4 * 6 + 2], 2)
  assert.equal(f[3 * 6 + 2], 2)
  assert.equal(f[2 * 6 + 2], 2)
  assert.equal(f[1 * 6 + 2], 2) // spawned
  assert.equal(f[0 * 6 + 2], 2) // spawned
  assert.equal(f[0], 0) // another column
})
test('same-kind guard keeps two touching lines of different berries apart', () => {
  const board = [0, 0, 0, 1, 1, 1, ...Array(36).fill(9)]
  const a = analyze([0, 1, 2, 3, 4, 5], 6, 7, board)
  assert.equal(a.groups, 2)
  assert.equal(a.longest, 3)
})
test('hintMove returns a swap that makes a line, or null', () => {
  const lone = Array.from({ length: 42 }, (_, i) => i)
  assert.equal(hintMove(lone, 6, 7), null)
  const b = Array.from({ length: 42 }, (_, i) => 100 + i)
  b[0] = 1; b[1] = 1; b[2] = 2; b[3] = 1
  assert.deepEqual(hintMove(b, 6, 7), [2, 3])
})
