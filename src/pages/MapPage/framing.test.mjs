import test from 'node:test'
import assert from 'node:assert/strict'
import { declutter, pickNearest, spriteLimits, spriteScale, pixelsOf } from './framing.mjs'

test('spriteScale holds a sprite between the pixel limits', () => {
  const o = { base: 5, fovDeg: 40, viewportH: 600, minPx: 44, maxPx: 90 }
  const far = spriteScale({ ...o, dist: 900 })
  const near = spriteScale({ ...o, dist: 20 })
  const mid = spriteScale({ ...o, dist: 120 })
  assert.ok(Math.abs(pixelsOf(far, 900, 40, 600) - 44) < 1e-6)
  assert.ok(Math.abs(pixelsOf(near, 20, 40, 600) - 90) < 1e-6)
  assert.ok(Math.abs(mid - 5) < 1e-9 || pixelsOf(mid, 120, 40, 600) >= 44)
})
test('phones get smaller limits than desktops, but never under 40px', () => {
  assert.ok(spriteLimits(320).minPx >= 40)
  assert.ok(spriteLimits(1280).minPx >= spriteLimits(320).minPx)
})
test('declutter keeps the higher priority of two crowding points', () => {
  const pts = [
    { x: 0, y: 0, size: 40, priority: 1 },
    { x: 10, y: 0, size: 40, priority: 5 },
    { x: 200, y: 0, size: 40, priority: 0 },
  ]
  const kept = declutter(pts)
  assert.ok(kept.has(1) && kept.has(2) && !kept.has(0))
})
test('declutter keeps everything that has room', () => {
  const pts = Array.from({ length: 5 }, (_, i) => ({ x: i * 100, y: 0, size: 40, priority: i }))
  assert.equal(declutter(pts).size, 5)
})
test('pickNearest takes the closest to the camera within reach, else nothing', () => {
  const pts = [
    { x: 100, y: 100, r: 20, depth: 5 },
    { x: 110, y: 100, r: 20, depth: 2 },
    { x: 400, y: 400, r: 20, depth: 1 },
  ]
  assert.equal(pickNearest(pts, { x: 105, y: 100 }), 1)
  assert.equal(pickNearest(pts, { x: 250, y: 250 }), -1)
})
test('a finger gets at least the minimum radius even for a tiny sprite', () => {
  assert.equal(pickNearest([{ x: 100, y: 100, r: 4, depth: 1 }], { x: 120, y: 112 }, 28), 0)
  assert.equal(pickNearest([{ x: 100, y: 100, r: 4, depth: 1 }], { x: 160, y: 112 }, 28), -1)
})

test('declutter never keeps more than max', () => {
  const pts = Array.from({ length: 10 }, (_, i) => ({ x: i * 200, y: 0, size: 40, priority: i }))
  const kept = declutter(pts, 0.7, 4)
  assert.equal(kept.size, 4)
  assert.ok(kept.has(9) && kept.has(8) && !kept.has(0))
})
