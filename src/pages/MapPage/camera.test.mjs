import test from 'node:test'
import assert from 'node:assert/strict'
import { REGION_R, TRAY } from './layout.mjs'
import { FOV, ease, flyPose, focusPose, overviewPose, regionPose } from './camera.mjs'
import { fitDistance, pixelsOf } from './framing.mjs'

test('ease runs 0→1 and only climbs', () => {
  assert.equal(ease(0), 0)
  assert.equal(ease(1), 1)
  let last = -1
  for (let i = 0; i <= 100; i++) {
    const v = ease(i / 100)
    assert.ok(v >= last)
    last = v
  }
})
test('flyPose starts and ends on the poses and rises in between', () => {
  const a = overviewPose(1.6)
  const b = focusPose([10, 0, 5], regionPose(1.6))
  const s = flyPose(a, b, 0)
  const e = flyPose(a, b, 1)
  assert.deepEqual([s.dist, s.yaw, s.pitch, ...s.target], [a.dist, a.yaw, a.pitch, ...a.target])
  assert.ok(Math.abs(e.dist - b.dist) < 1e-9)
  assert.ok(flyPose(a, b, 0.5).dist > (a.dist + b.dist) / 2)
})
test('flyPose turns the short way round', () => {
  const m = flyPose({ target: [0, 0, 0], yaw: 3, pitch: 0, dist: 1 }, { target: [0, 0, 0], yaw: -3, pitch: 0, dist: 1 }, 0.5, 0)
  assert.ok(Math.abs(Math.abs(m.yaw) - Math.PI) < 0.01)
})
test('the region opens close: wider than the screen, never more than twice the screen', () => {
  for (const aspect of [1.78, 1, 0.56, 0.5]) {
    const { dist } = regionPose(aspect)
    const half = aspect < 1 ? REGION_R * 0.92 : REGION_R * TRAY * 0.9
    const width = 2 * dist * Math.tan((FOV * Math.PI) / 360) * aspect
    assert.ok(width < 2.4 * half, `aspect ${aspect} is detailed`)
    assert.ok(width > half * 0.25, `aspect ${aspect} still shows a good part`)
  }
  assert.ok(regionPose(0.5).dist > regionPose(1.78).dist)
})
test('the carousel shows the whole active island on every screen, phones included', () => {
  const T = REGION_R * TRAY
  for (const aspect of [1.78, 1, 0.56, 0.46]) {
    const width = 2 * overviewPose(aspect).dist * Math.tan((FOV * Math.PI) / 360) * aspect
    assert.ok(width >= 2 * T * 1.04, `aspect ${aspect}`)
    assert.ok(width <= 2 * T * 1.4 || aspect > 1, `aspect ${aspect} fills a phone`)
  }
})
test('fit distance is monotonic and a sprite shrinks with distance', () => {
  assert.ok(fitDistance({ halfW: 100, halfH: 60, fovDeg: 40, aspect: 1 }) > fitDistance({ halfW: 50, halfH: 60, fovDeg: 40, aspect: 1 }))
  assert.ok(pixelsOf(5, 100, 40, 800) > pixelsOf(5, 200, 40, 800))
})
