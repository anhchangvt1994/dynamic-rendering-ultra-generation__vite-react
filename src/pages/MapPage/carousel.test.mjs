import test from 'node:test'
import assert from 'node:assert/strict'
import { SPACING, approach, clampIndex, settle, slotAt } from './carousel.mjs'

test('the active island is centred at full size, facing front', () => {
  const s = slotAt(0)
  assert.deepEqual([s.scale, s.x, s.z, s.yaw + 0], [1, 0, 0, 0])
  assert.ok(s.visible)
})
test('neighbours are smaller, further out and further back, mirrored left and right', () => {
  const r = slotAt(1)
  const l = slotAt(-1)
  assert.ok(r.scale < 1 && r.scale > 0.4)
  assert.equal(r.x, SPACING)
  assert.equal(l.x, -r.x)
  assert.equal(l.scale, r.scale)
  assert.ok(r.z < 0)
  assert.equal(l.yaw, -r.yaw)
})
test('scale falls and distance grows with the distance from the centre', () => {
  let last = slotAt(0)
  for (let d = 0.25; d <= 2.5; d += 0.25) {
    const s = slotAt(d)
    assert.ok(s.scale <= last.scale)
    assert.ok(s.x > last.x)
    last = s
  }
})
test('far islands are not drawn', () => {
  assert.ok(!slotAt(3).visible)
  assert.ok(slotAt(2).visible)
})
test('a swipe settles on the nearest island, helped by its speed, within the row', () => {
  assert.equal(settle(2.4, 0, 9), 2)
  assert.equal(settle(2.4, 3, 9), 3)
  assert.equal(settle(2.4, -3, 9), 2)
  assert.equal(settle(0.1, -9, 9), 0)
  assert.equal(settle(7.9, 9, 9), 8)
  assert.equal(clampIndex(-3, 9), 0)
})
test('approach reaches the target without overshooting', () => {
  let p = 0
  for (let i = 0; i < 120; i++) {
    p = approach(p, 4, 1 / 60)
    assert.ok(p <= 4)
  }
  assert.ok(Math.abs(p - 4) < 0.1)
})
