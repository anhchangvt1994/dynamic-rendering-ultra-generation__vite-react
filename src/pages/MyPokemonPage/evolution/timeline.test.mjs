import assert from 'node:assert/strict'
import test from 'node:test'
import { TOTAL, flickerWeight, frameAt, readyGlow } from './timeline.mjs'

const range = (to, step) => Array.from({ length: Math.round(to / step) + 1 }, (_, i) => i * step)
const UNIT = [
  'scrim', 'oldOpacity', 'newOpacity', 'glow', 'halo', 'ringOpacity', 'ring2Opacity',
  'scanOn', 'orb', 'rays', 'shards', 'flash', 'shift', 'pageOpen', 'stamp', 'badge', 'waves',
]

test('TOTAL is 15 s and frames are deterministic', () => {
  assert.equal(TOTAL, 15)
  assert.deepEqual(frameAt(7.3), frameAt(7.3))
})

test('the old form stays until the swap, the new one appears after it', () => {
  assert.equal(frameAt(3.2).oldOpacity, 1)
  assert.equal(frameAt(8.5).oldOpacity, 0)
  assert.equal(frameAt(8.1).newOpacity, 0)
  assert.equal(frameAt(8.7).newOpacity, 1)
  assert.equal(frameAt(0).newOpacity, 0)
})

test('the scrim rises within 0.8 s and falls at the end', () => {
  assert.equal(frameAt(0).scrim, 0)
  assert.ok(frameAt(0.4).scrim > 0 && frameAt(0.4).scrim < 1)
  assert.ok(frameAt(0.8).scrim > 0.999)
  assert.ok(frameAt(10).scrim > 0.999)
  assert.ok(frameAt(14.6).scrim < 1)
  assert.equal(frameAt(TOTAL).scrim, 0)
})

test('displacement peaks near 46 around the swap and returns to 0', () => {
  const peak = Math.max(...range(TOTAL, 0.01).map((u) => frameAt(u).displaceScale))
  assert.ok(Math.abs(peak - 46) < 0.5, `peak ${peak}`)
  assert.ok(frameAt(8.2).displaceScale > 45)
  assert.equal(frameAt(0).displaceScale, 0)
  assert.equal(frameAt(12).displaceScale, 0)
  assert.equal(frameAt(TOTAL).displaceScale, 0)
})

test('the field-notes page, stamp and deltas are shut before it opens and complete at the end', () => {
  const f = frameAt(11.5)
  assert.equal(f.pageOpen, 0)
  assert.equal(f.stamp, 0)
  assert.deepEqual(f.deltas, [0, 0, 0])
  const end = frameAt(TOTAL)
  assert.equal(end.stamp, 1)
  assert.deepEqual(end.deltas, [1, 1, 1])
  assert.equal(end.pageOpen, 1)
  assert.equal(end.badge, 1)
})

test('flickerWeight pulses at least 20 times in 3 s and never exceeds 1', () => {
  const xs = range(3, 0.002).slice(0, -1).map((u) => flickerWeight(u))
  let peaks = 0
  for (let i = 1; i < xs.length - 1; i++) {
    if (xs[i] > 0.05 && xs[i] > xs[i - 1] && xs[i] >= xs[i + 1]) peaks++
  }
  assert.ok(peaks >= 20, `peaks ${peaks}`)
  for (const u of range(TOTAL, 0.01)) {
    const w = flickerWeight(u)
    assert.ok(w >= 0 && w <= 1)
  }
  assert.equal(flickerWeight(3.5), 1)
  assert.equal(flickerWeight(5.2), 0)
})

test('the flicker gets faster and stronger', () => {
  const cycles = (a, b) => {
    const xs = range(b - a, 0.002).map((d) => flickerWeight(a + d))
    let n = 0
    for (let i = 1; i < xs.length - 1; i++) if (xs[i] > 0.05 && xs[i] > xs[i - 1] && xs[i] >= xs[i + 1]) n++
    return n
  }
  assert.ok(cycles(2, 3) > cycles(0, 1) * 2)
  assert.ok(Math.max(...range(0.5, 0.002).map(flickerWeight)) < 0.5)
})

test('reduced motion: no displacement, no pulses, nothing out of bounds', () => {
  for (const u of range(TOTAL, 0.05)) {
    const f = frameAt(u, { reduced: true })
    assert.equal(f.displaceScale, 0)
    for (const k of UNIT) assert.ok(f[k] >= 0 && f[k] <= 1, `${k}=${f[k]} @${u}`)
    for (const d of f.deltas) assert.ok(d >= 0 && d <= 1)
    assert.ok(f.glow <= 0.6)
    assert.equal(f.flash, 0)
    assert.equal(f.shards, 0)
    assert.ok(flickerWeight(u, { reduced: true }) <= 0.6)
  }
  const still = range(2.9, 0.1).map((u) => flickerWeight(u, { reduced: true }))
  assert.equal(new Set(still).size, 1)
})

test('full-motion unit fields stay inside 0..1', () => {
  for (const u of range(TOTAL, 0.01)) {
    const f = frameAt(u)
    for (const k of UNIT) assert.ok(f[k] >= 0 && f[k] <= 1, `${k}=${f[k]} @${u}`)
  }
})

test('the caption follows the story', () => {
  assert.equal(frameAt(0.1).caption, '')
  assert.match(frameAt(1).caption, /Có điều gì đó/)
  assert.match(frameAt(9).caption, /Tiến hoá!/)
  assert.match(frameAt(13).caption, /Đã ghi vào sổ/)
})

test('readyGlow breathes inside 0..1 and flashes twice every 4 s; reduced is constant', () => {
  for (const t of range(20, 0.01)) {
    const g = readyGlow(t)
    assert.ok(g >= 0 && g <= 1)
    assert.equal(readyGlow(t, { reduced: true }), 0.35)
  }
  assert.ok(readyGlow(3.0) > readyGlow(1.5) + 0.3)
  assert.ok(readyGlow(3.35) > readyGlow(1.5) + 0.3)
  assert.ok(readyGlow(7.0) > readyGlow(5.5) + 0.3)
})
