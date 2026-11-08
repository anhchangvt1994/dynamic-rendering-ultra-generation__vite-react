import test from 'node:test'
import assert from 'node:assert/strict'
import { dockGesture, sheetDragClose } from './dockGesture.mjs'

test('opens only after a deliberate upward drag while closed', () => {
  assert.equal(dockGesture(false, 0, -60), true)
  assert.equal(dockGesture(false, 0, -40), null)
  assert.equal(dockGesture(false, 0, 60), null)
})

test('closes only after a deliberate downward drag while open', () => {
  assert.equal(dockGesture(true, 0, 60), false)
  assert.equal(dockGesture(true, 0, 40), null)
  assert.equal(dockGesture(true, 0, -60), null)
})

test('ignores diagonal and horizontal movement', () => {
  assert.equal(dockGesture(false, 40, -60), null)
  assert.equal(dockGesture(false, 70, -20), null)
})

test('a down-drag on the open sheet closes it only from the top of its content', () => {
  assert.equal(sheetDragClose(0, 0, 60), true)
  assert.equal(sheetDragClose(0, 0, 40), false)
  assert.equal(sheetDragClose(120, 0, 60), false)
  assert.equal(sheetDragClose(0, 0, -60), false)
  assert.equal(sheetDragClose(0, 40, 60), false)
})
