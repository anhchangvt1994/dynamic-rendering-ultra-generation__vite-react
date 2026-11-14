import assert from 'node:assert/strict'
import test from 'node:test'
import { activeIndex, offsets } from './carouselMath.mjs'

const finalSlideIndex = (right, lower, upper, progress, count) =>
  activeIndex(right < 0 ? count - 1 : lower + Math.min(1, Math.max(0, progress)), 1, count)

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
test('offsets track signed positions from the first cabinet', () => {
  assert.deepEqual(offsets(0, 1, 2), [0, 1])
})

test('at the maximum scroll center past the last item selects the final slide', () => {
  const centers = [171.5, 380.5, 589.5, 798.5, 1007.5, 1216.5]
  const center = 1039 + 371 / 2
  const right = centers.findIndex((value) => value >= center)
  const lower = Math.max(0, right - 1)
  const upper = Math.min(centers.length - 1, right < 0 ? centers.length - 1 : right)
  const progress = (center - centers[lower]) / (centers[upper] - centers[lower])
  const virtual = lower + Math.min(1, Math.max(0, progress))

  assert.equal(finalSlideIndex(right, lower, upper, progress, centers.length), centers.length - 1)
})
