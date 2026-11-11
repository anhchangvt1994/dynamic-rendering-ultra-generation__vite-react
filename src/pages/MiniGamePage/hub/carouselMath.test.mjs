import assert from 'node:assert/strict'
import test from 'node:test'
import { activeIndex } from './carouselMath.mjs'

test('start is item 0', () => assert.equal(activeIndex(0, 250, 2), 0))
test('half an item rounds to the nearest', () => {
  assert.equal(activeIndex(124, 250, 2), 0)
  assert.equal(activeIndex(126, 250, 2), 1)
})
test('beyond the end clamps to the last item', () => assert.equal(activeIndex(9999, 250, 2), 1))
test('negative scroll is item 0', () => assert.equal(activeIndex(-40, 250, 2), 0))
test('a zero, negative or NaN item width is item 0', () => {
  assert.equal(activeIndex(100, 0, 2), 0)
  assert.equal(activeIndex(100, NaN, 2), 0)
  assert.equal(activeIndex(100, -5, 2), 0)
  assert.equal(activeIndex(NaN, 250, 2), 0)
})
test('no items is index 0', () => assert.equal(activeIndex(100, 250, 0), 0))
