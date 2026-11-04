import test from 'node:test'
import assert from 'node:assert/strict'
import { isItemNameStuck } from './itemCardScroll.mjs'

const scroller = (overrides = {}) => ({
  scrollTop: 150,
  scrollHeight: 800,
  clientHeight: 400,
  offsetHeight: 400,
  clientTop: 0,
  getBoundingClientRect: () => ({ top: 100, height: 400 }),
  ...overrides,
})
const heading = (top, offsetTop = 0) => ({
  offsetTop,
  getBoundingClientRect: () => ({ top }),
})

test('uses the visible scroll viewport, not the heading offsetParent', () => {
  assert.equal(isItemNameStuck(scroller(), heading(180, 0), 60), false)
  assert.equal(isItemNameStuck(scroller(), heading(160, 900), 60), true)
  assert.equal(isItemNameStuck(scroller(), heading(120, 900), 60), true)
})

test('never sticks an unscrolled, hidden or non-scrollable card', () => {
  assert.equal(
    isItemNameStuck(scroller({ scrollTop: 0 }), heading(0), 60),
    false
  )
  assert.equal(
    isItemNameStuck(scroller({ scrollTop: -5 }), heading(0), 60),
    false
  )
  assert.equal(
    isItemNameStuck(scroller({ clientHeight: 0 }), heading(0), 60),
    false
  )
  assert.equal(
    isItemNameStuck(scroller({ scrollHeight: 400 }), heading(0), 60),
    false
  )
})

test('compares both positions in the same scaled coordinate system', () => {
  const scroll = scroller({
    getBoundingClientRect: () => ({ top: 100, height: 200 }),
  })
  assert.equal(isItemNameStuck(scroll, heading(140), 60), false)
  assert.equal(isItemNameStuck(scroll, heading(130), 60), true)
})

test('recomputes after layout changes and when scrolling back', () => {
  const scroll = scroller()
  assert.equal(isItemNameStuck(scroll, heading(150), 60), true)
  assert.equal(isItemNameStuck(scroll, heading(210), 60), false)
  assert.equal(
    isItemNameStuck(scroller({ scrollTop: 0 }), heading(150), 60),
    false
  )
})
