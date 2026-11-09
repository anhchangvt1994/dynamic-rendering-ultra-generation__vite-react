import assert from 'node:assert/strict'
import test from 'node:test'
import { PALETTES } from '../room/roomTheme.mjs'
import { accentFor, BASE, holdStep, progressOf, ringLayout } from './chamber.mjs'
import { contrast } from '../room/roomTheme.mjs'

test('ringLayout: slots inside the unit square, tappable, never overlapping', () => {
  for (let n = 1; n <= 10; n++) {
    const s = ringLayout(n)
    assert.equal(s.length, n)
    for (const a of s) {
      assert.ok(a.x - a.size / 2 >= 0 && a.x + a.size / 2 <= 1, `x n=${n}`)
      assert.ok(a.y - a.size / 2 >= 0 && a.y + a.size / 2 <= 1, `y n=${n}`)
      assert.ok(a.size >= 0.14, `size n=${n}`)
    }
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        assert.ok(Math.hypot(s[i].x - s[j].x, s[i].y - s[j].y) >= s[i].size - 1e-9, `overlap ${n}:${i},${j}`)
  }
  assert.deepEqual(ringLayout(0), [])
})

test('ringLayout: two slots sit left and right, one sits on top', () => {
  const [a, b] = ringLayout(2)
  assert.ok(Math.abs(a.y - 0.5) < 1e-9 && Math.abs(b.y - 0.5) < 1e-9)
  assert.ok(a.x !== b.x)
  assert.ok(ringLayout(1)[0].y < 0.2)
})

test('accentFor: every type clears 4.5:1 on the scene base', () => {
  for (const [type, theme] of Object.entries(PALETTES)) {
    const { a, b } = accentFor(theme)
    assert.ok(contrast(a, BASE) >= 4.5, `${type} ${a}`)
    assert.ok(/^#[0-9a-f]{6}$/i.test(b))
  }
})

test('progressOf: share of met conditions', () => {
  assert.equal(progressOf([]), 0)
  assert.equal(progressOf([{ ok: true }, { ok: false }]), 0.5)
  assert.equal(progressOf([{ ok: true }]), 1)
  assert.equal(progressOf(null), 0)
})

test('holdStep: fills while held, drains when released, completes at 1', () => {
  assert.deepEqual(holdStep(0, true, 450), { h: 0.5, done: false })
  assert.deepEqual(holdStep(0.9, true, 200), { h: 1, done: true })
  assert.equal(holdStep(0.5, false, 16).done, false)
  assert.ok(holdStep(0.5, false, 16).h < 0.5)
  assert.equal(holdStep(0.01, false, 1000).h, 0)
})

test('arcSpans: one whole ring, else ordered arcs with gaps inside 360°', async () => {
  const { arcSpans } = await import('./chamber.mjs')
  assert.deepEqual(arcSpans(0), [{ a0: 0, a1: 359.9 }])
  assert.deepEqual(arcSpans(1), [{ a0: 0, a1: 359.9 }])
  for (let n = 2; n <= 6; n++) {
    const s = arcSpans(n)
    assert.equal(s.length, n)
    s.forEach((a, i) => {
      assert.ok(a.a1 > a.a0 && a.a0 >= 0 && a.a1 <= 360)
      if (i) assert.ok(a.a0 > s[i - 1].a1)
    })
  }
})
