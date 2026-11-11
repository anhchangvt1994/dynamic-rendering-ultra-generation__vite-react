import test from 'node:test'
import assert from 'node:assert/strict'
import { tiltFromPointer, tiltFromOrientation } from './tilt.mjs'

const rect = { width: 200, height: 100 }
test('center -> zeros, foil centered', () => {
  assert.deepEqual(tiltFromPointer({ x: 100, y: 50, ...rect }), { rx: 0, ry: 0, sx: 50, sy: 50 })
})
test('right edge -> ry = max', () => assert.equal(tiltFromPointer({ x: 200, y: 50, ...rect }).ry, 12))
test('top edge -> rx = max', () => assert.equal(tiltFromPointer({ x: 100, y: 0, ...rect }).rx, 12))
test('zero-size rect -> centered zeros', () => {
  assert.deepEqual(tiltFromPointer({ x: 5, y: 5, width: 0, height: 0 }), { rx: 0, ry: 0, sx: 50, sy: 50 })
})
test('non-finite input -> centered zeros', () => {
  assert.deepEqual(tiltFromPointer({ x: NaN, y: 1, ...rect }), { rx: 0, ry: 0, sx: 50, sy: 50 })
})
test('orientation neutral -> zeros', () => {
  const t = tiltFromOrientation({ beta: 45, gamma: 0 })
  assert.equal(t.rx, 0); assert.equal(t.ry, 0)
})
test('orientation clamps to max', () => assert.equal(tiltFromOrientation({ beta: 45, gamma: 90 }).ry, 12))
test('orientation null -> zeros', () => {
  const t = tiltFromOrientation({ beta: null, gamma: null })
  assert.equal(t.rx, 0); assert.equal(t.ry, 0)
})
