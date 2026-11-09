import assert from 'node:assert/strict'
import test from 'node:test'
import { HERO, fxLayout } from './layout.mjs'

const SIZES = [
  [320, 480], [320, 568], [360, 640], [390, 844], [768, 640], [760, 640],
  [568, 320], [667, 375], [812, 375], [1024, 640],
]
const inside = (r, w, h) => r.x >= 0 && r.y >= 0 && r.x + r.w <= w && r.y + r.h <= h
const apart = (a, b) =>
  a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y

test('portrait stacks the form above the ticket, wide screens put them side by side', () => {
  assert.equal(fxLayout(320, 568).mode, 'stack')
  assert.equal(fxLayout(390, 844).mode, 'stack')
  assert.equal(fxLayout(568, 320).mode, 'side')
  assert.equal(fxLayout(760, 640).mode, 'side')
})

test('at every size the form box, the ticket and the skip button fit and never overlap', () => {
  for (const [w, h] of SIZES) {
    const l = fxLayout(w, h)
    const s = HERO * l.k
    const hero = { x: l.end.x - s / 2, y: l.end.y - s / 2, w: s, h: s }
    const skip = { x: w - 98, y: 10, w: 88, h: 44 }
    assert.ok(inside(l.ticket, w, h), `ticket ${w}x${h}`)
    assert.ok(inside(hero, w, h), `hero ${w}x${h} ${JSON.stringify(hero)}`)
    assert.ok(apart(hero, l.ticket), `hero/ticket ${w}x${h}`)
    assert.ok(apart(skip, l.ticket), `skip/ticket ${w}x${h}`)
    assert.ok(l.k > 0.5 && l.k <= 1.3, `k ${l.k} @${w}x${h}`)
  }
})

test('the form starts at the centre of the stage', () => {
  const l = fxLayout(390, 844)
  assert.deepEqual(l.start, { x: 195, y: 422 })
})
