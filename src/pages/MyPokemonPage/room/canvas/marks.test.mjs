import assert from 'node:assert/strict'
import test from 'node:test'
import { drawMarks, planMarks } from './marks.mjs'

const SIZE = 64

// a rig whose primary region is the rectangle x0..x1 × y0..y1 (cells)
const pack = (on) => {
  const bytes = new Uint8Array((SIZE * SIZE) / 8)
  for (let i = 0; i < SIZE * SIZE; i++)
    if (on(i % SIZE, Math.floor(i / SIZE))) bytes[i >> 3] |= 0x80 >> (i & 7)
  return Buffer.from(bytes).toString('base64')
}
const rectRig = (x0 = 4, y0 = 4, x1 = 60, y1 = 60, branches = []) => ({
  frame: { w: 384, h: 384 },
  primary: {
    size: SIZE,
    bits: pack((x, y) => x >= x0 && x < x1 && y >= y0 && y < y1),
  },
  branches,
})
const cellOn = (rig, x, y) => {
  const bytes = Buffer.from(rig.primary.bits, 'base64')
  const cx = Math.floor(x * SIZE)
  const cy = Math.floor(y * SIZE)
  const i = cy * SIZE + cx
  return (bytes[i >> 3] & (0x80 >> (i & 7))) !== 0
}
// two limbs: a horizontal one and a vertical one, radius 6 cells
const line = (from, to, n = 12) =>
  Array.from({ length: n }, (_, i) => [
    from[0] + ((to[0] - from[0]) * i) / (n - 1),
    from[1] + ((to[1] - from[1]) * i) / (n - 1),
  ])
const limbRig = () => {
  const r = 6 / SIZE
  return rectRig(4, 4, 60, 60, [
    { points: line([0.2, 0.3], [0.8, 0.3]), radius: Array(12).fill(r) },
    { points: line([0.5, 0.4], [0.5, 0.85]), radius: Array(12).fill(r) },
  ])
}
const KINDS = ['spots', 'stripes', 'patch', 'scar', 'flower', 'stars']
const TONES = {
  spots: 'dark',
  stripes: 'dark',
  patch: 'dark',
  scar: 'light',
  flower: 'accent',
  stars: 'accent',
}

test('the same marks on the same rig give the same shapes', () => {
  for (const kind of KINDS) {
    const marks = { kind, count: 7, seed: 2918 }
    assert.deepEqual(planMarks(marks, limbRig()), planMarks(marks, limbRig()))
  }
})

test('as many shapes as the count, each centred on the main region', () => {
  const rig = limbRig()
  for (const kind of KINDS)
    for (const count of [1, 4, 10]) {
      const shapes = planMarks({ kind, count, seed: 77 + count }, rig)
      assert.equal(shapes.length, count, `${kind} × ${count}`)
      for (const s of shapes) {
        assert.equal(s.kind, kind)
        assert.equal(s.tone, TONES[kind])
        assert.ok(s.size > 0)
        assert.ok(cellOn(rig, s.x, s.y), `${kind} at ${s.x},${s.y}`)
      }
    }
})

test('spots keep their spacing and their distance from the edge', () => {
  const rig = rectRig()
  const body = 56 / 64
  const shapes = planMarks({ kind: 'spots', count: 8, seed: 5 }, rig)
  for (const s of shapes) {
    assert.ok(s.size >= 0.05 * body - 1e-9 && s.size <= 0.08 * body + 1e-9)
    const edge = Math.min(
      s.x - 4 / 64,
      60 / 64 - s.x,
      s.y - 4 / 64,
      60 / 64 - s.y
    )
    assert.ok(edge >= 0.5 * s.size - 1 / 64, `edge ${edge} size ${s.size}`)
  }
  for (const a of shapes)
    for (const b of shapes)
      if (a !== b)
        assert.ok(
          Math.hypot(a.x - b.x, a.y - b.y) >=
            1.5 * Math.max(a.size, b.size) - 1e-9
        )
})

test('stripes spread over both limbs, across each limb', () => {
  const rig = limbRig()
  const shapes = planMarks({ kind: 'stripes', count: 6, seed: 11 }, rig)
  assert.equal(new Set(shapes.map((s) => s.branch)).size, 2)
  for (const s of shapes) {
    // limb 0 runs along x (tangent 0°), limb 1 along y (tangent 90°)
    const tangent = s.branch === 0 ? 0 : Math.PI / 2
    let d = Math.abs(((s.angle - tangent) % Math.PI) + Math.PI) % Math.PI
    d = Math.abs(d - Math.PI / 2)
    assert.ok(d <= (20 * Math.PI) / 180, `angle off by ${(d * 180) / Math.PI}°`)
    assert.ok(Math.abs(s.size - 1.6 * (6 / 64)) < 1e-6)
  }
})

test('stars gather in one cluster', () => {
  const rig = rectRig()
  const body = 56 / 64
  const shapes = planMarks({ kind: 'stars', count: 6, seed: 3 }, rig)
  const cx = shapes.reduce((s, p) => s + p.x, 0) / shapes.length
  const cy = shapes.reduce((s, p) => s + p.y, 0) / shapes.length
  for (const s of shapes)
    assert.ok(Math.hypot(s.x - cx, s.y - cy) <= 2 * 0.25 * body)
})

test('nothing to mark: no main region, no marks, or a species without marks', () => {
  assert.deepEqual(
    planMarks({ kind: 'spots', count: 5, seed: 1 }, rectRig(0, 0, 0, 0)),
    []
  )
  assert.deepEqual(planMarks(null, rectRig()), [])
  assert.deepEqual(
    planMarks(
      { kind: 'spots', count: 5, seed: 1 },
      { ...rectRig(), noMarks: true }
    ),
    []
  )
})

test('drawMarks paints each tone in its own channel', () => {
  const fills = []
  const ctx = new Proxy(
    {},
    {
      get: (t, k) => (k in t ? t[k] : () => {}),
      set: (t, k, v) => {
        t[k] = v
        if (k === 'fillStyle' || k === 'strokeStyle') fills.push(v)
        return true
      },
    }
  )
  drawMarks(ctx, [
    { kind: 'spots', x: 0.5, y: 0.5, size: 0.05, angle: 0, tone: 'dark' },
    { kind: 'scar', x: 0.5, y: 0.5, size: 0.1, angle: 0, tone: 'light' },
    { kind: 'stars', x: 0.5, y: 0.5, size: 0.05, angle: 0, tone: 'accent' },
  ])
  assert.ok(fills.includes('rgb(255,0,0)'))
  assert.ok(fills.includes('rgb(0,255,0)'))
  assert.ok(fills.includes('rgb(0,0,255)'))
})
