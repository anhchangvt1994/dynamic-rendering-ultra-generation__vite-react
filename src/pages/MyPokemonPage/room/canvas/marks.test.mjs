import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { MIN_SIZE, bodyMask, drawMarks, planMarks } from './marks.mjs'
import { oklabToRgb } from './colour.mjs'

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
const KINDS = ['spots', 'stripes', 'patch', 'scar', 'flower', 'stars', 'hearts']
const TONES = {
  spots: 'dark',
  stripes: 'dark',
  patch: 'dark',
  scar: 'light',
  flower: 'accent',
  stars: 'accent',
  hearts: 'accent',
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
      const want = kind === 'stars' ? Math.max(3, count) : count
      assert.equal(shapes.length, want, `${kind} × ${count}`)
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
    assert.ok(s.size >= 0.08 * body - 1e-9 && s.size <= 0.12 * body + 1e-9)
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
    assert.ok(Math.abs(s.size - Math.max(1.6 * (6 / 64), 0.2 * (56 / 64))) < 1e-6)
  }
})

test('stripes stay on the limbs of the main region', () => {
  // the main region is the left half; the longer limb lies outside it
  const r = 6 / SIZE
  const rig = rectRig(4, 4, 32, 60, [
    { points: line([0.2, 0.2], [0.2, 0.8]), radius: Array(12).fill(r) },
    { points: line([0.6, 0.1], [0.6, 0.9]), radius: Array(12).fill(r) },
  ])
  const shapes = planMarks({ kind: 'stripes', count: 6, seed: 3 }, rig)
  assert.equal(shapes.length, 6)
  for (const s of shapes) {
    assert.equal(s.branch, 0)
    assert.ok(cellOn(rig, s.x, s.y), `stripe at ${s.x},${s.y}`)
  }
})

test('stripes on a thin limb still read: at least 0.2 × body long', () => {
  const r = 0.5 / SIZE
  const rig = rectRig(4, 4, 60, 60, [
    { points: line([0.2, 0.5], [0.8, 0.5]), radius: Array(12).fill(r) },
  ])
  const body = 56 / 64
  for (const s of planMarks({ kind: 'stripes', count: 4, seed: 9 }, rig))
    assert.ok(s.size >= 0.2 * body - 1e-9, `size ${s.size}`)
})

// the share of marks in each of n equal bands of the body along x or y
const bands = (shapes, n, axis, lo, hi) => {
  const out = Array(n).fill(0)
  for (const s of shapes)
    out[Math.min(n - 1, Math.floor(((s[axis] - lo) / (hi - lo)) * n))]++
  return out
}

// the widest stretch of the body, along `axis`, that no mark reaches (a
// mark reaches half its size either side of its centre)
const widestGap = (shapes, axis, lo, hi) => {
  const spans = shapes
    .map((s) => [s[axis] - s.size / 2, s[axis] + s.size / 2])
    .sort((a, b) => a[0] - b[0])
  let gap = 0
  let edge = lo
  for (const [a, b] of spans) {
    gap = Math.max(gap, a - edge)
    edge = Math.max(edge, b)
  }
  return Math.max(gap, hi - edge) / (hi - lo)
}

test('marks spread over the whole body, of every kind and every count', () => {
  // a tall body (24 × 60 cells) and a wide one (60 × 24)
  const tall = bodyOf(20, 2, 44, 62)
  const wide = bodyOf(2, 20, 62, 44)
  for (const kind of ['spots', 'patch', 'scar', 'flower', 'stars', 'hearts'])
    for (let seed = 1; seed <= 40; seed++) {
      const count = kind === 'patch' || kind === 'scar' ? 2 + (seed % 4) : 3 + (seed % 8)
      // two marks leave at most half the body bare, three or more 42%
      const bare = count === 2 ? 0.5 : 0.42
      const tag = `${kind} × ${count} seed ${seed}`
      const a = planMarks({ kind, count, seed }, rectRig(20, 2, 44, 62), tall)
      const b = planMarks({ kind, count, seed }, rectRig(2, 20, 62, 44), wide)
      assert.equal(a.length, count, tag)
      assert.ok(widestGap(a, 'y', 2 / 64, 62 / 64) < bare, `${tag} tall`)
      assert.ok(widestGap(b, 'x', 2 / 64, 62 / 64) < bare, `${tag} wide`)
      // three marks: one in each third
      if (count === 3) {
        assert.ok(bands(a, 3, 'y', 2 / 64, 62 / 64).every(Boolean), `${tag} tall thirds`)
        assert.ok(bands(b, 3, 'x', 2 / 64, 62 / 64).every(Boolean), `${tag} wide thirds`)
      }
    }
})

test('six marks or more on a square body touch all four quarters', () => {
  const body = bodyOf(4, 4, 60, 60)
  for (const kind of ['spots', 'stars', 'hearts', 'flower'])
    for (const seed of [11, 12, 13, 14, 15]) {
      const shapes = planMarks({ kind, count: 6, seed }, rectRig(), body)
      const q = new Set(shapes.map((s) => `${s.x < 0.5 ? 0 : 1}${s.y < 0.5 ? 0 : 1}`))
      assert.equal(q.size, 4, `${kind} ${seed}`)
    }
})

test('stripes run over every limb, not only the longest', () => {
  const r = 4 / SIZE
  const rig = rectRig(4, 4, 60, 60, [
    { points: line([0.1, 0.2], [0.9, 0.2]), radius: Array(12).fill(r) },
    { points: line([0.1, 0.45], [0.7, 0.45]), radius: Array(12).fill(r) },
    { points: line([0.2, 0.7], [0.6, 0.7]), radius: Array(12).fill(r) },
    { points: line([0.8, 0.4], [0.8, 0.8]), radius: Array(12).fill(r) },
  ])
  const shapes = planMarks({ kind: 'stripes', count: 4, seed: 5 }, rig)
  assert.equal(new Set(shapes.map((s) => s.branch)).size, 4)
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

// a frame w × h painted by `at(x, y)` → [L, a, b] | null (transparent)
const frameOf = (w, h, at) => {
  const rgba = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const lab = at(x, y)
      if (!lab) continue
      const rgb = oklabToRgb(lab)
      rgba.set([...rgb.map((c) => Math.round(c * 255)), 255], (y * w + x) * 4)
    }
  return rgba
}
const BODY = [0.6, 0.1, 0.05]
const CLUSTER = [{ lab: BODY, share: 1 }]
const LOCK = { ink: 0.2, light: 0.92 }
const on = (m, x, y) => m.mask[y * m.size + x] === 1

test('bodyMask: opaque, unlocked, near a region; half a cell is enough', () => {
  // 128 px: 2 × 2 px per cell. Body 32..96; an ink blot 40..56; a far
  // colour 70..86 (no region near it); the right column 96..97 covers half
  // of cell 48 only when the cell is 2 px wide
  const rgba = frameOf(128, 128, (x, y) => {
    if (x < 32 || x >= 97 || y < 32 || y >= 96) return null
    if (x >= 40 && x < 56 && y >= 40 && y < 56) return [0.1, 0, 0]
    if (x >= 70 && x < 86 && y >= 70 && y < 86) return [0.6, -0.1, -0.1]
    return BODY
  })
  const m = bodyMask(rgba, 128, 128, CLUSTER, LOCK)
  assert.equal(m.size, 64)
  assert.ok(on(m, 16, 16) && on(m, 30, 40), 'body')
  assert.ok(!on(m, 10, 10), 'transparent')
  assert.ok(!on(m, 22, 22), 'ink is locked')
  assert.ok(!on(m, 38, 38), 'far from every region')
  assert.ok(on(m, 48, 20), 'half the cell opaque')
  assert.ok(!on(m, 49, 20))
})

test('bodyMask: a frame smaller than the grid still has a body', () => {
  const rgba = frameOf(20, 20, (x, y) =>
    x >= 4 && x < 16 && y >= 4 && y < 16 ? BODY : null
  )
  const m = bodyMask(rgba, 20, 20, CLUSTER, LOCK)
  assert.ok(on(m, 32, 32))
  assert.ok(!on(m, 2, 2))
  assert.equal(bodyMask(new Uint8ClampedArray(0), 0, 0, CLUSTER, LOCK).mask.some(Boolean), false)
})

const bodyOf = (x0, y0, x1, y1) => {
  const mask = new Uint8Array(SIZE * SIZE)
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) mask[y * SIZE + x] = 1
  return { size: SIZE, mask }
}

test('with a body mask, marks sit on the whole body and are sized by it', () => {
  // a small main region (8 × 8 cells) on a big body (56 × 56)
  const rig = rectRig(28, 28, 36, 36)
  const body = bodyOf(4, 4, 60, 60)
  const unit = 56 / 64
  const sizes = {
    spots: [0.08, 0.12],
    patch: [0.18, 0.26],
    scar: [0.16, 0.22],
    flower: [0.1, 0.14],
    stars: [0.07, 0.1],
    hearts: [0.1, 0.14],
  }
  for (const [kind, [lo, hi]] of Object.entries(sizes)) {
    const shapes = planMarks({ kind, count: 5, seed: 41 }, rig, body)
    assert.equal(shapes.length, 5, kind)
    let off = 0
    for (const s of shapes) {
      assert.ok(s.size >= lo * unit - 1e-9 && s.size <= hi * unit + 1e-9, `${kind} ${s.size}`)
      assert.ok(on(body, Math.floor(s.x * SIZE), Math.floor(s.y * SIZE)))
      if (!cellOn(rig, s.x, s.y)) off++
    }
    assert.ok(off > 0, `${kind} leaves the main region`)
  }
})

test('stripes keep the main region but take the body size', () => {
  const r = 0.5 / SIZE
  const rig = rectRig(20, 20, 44, 44, [
    { points: line([0.35, 0.5], [0.65, 0.5]), radius: Array(12).fill(r) },
  ])
  const body = bodyOf(4, 4, 60, 60)
  for (const s of planMarks({ kind: 'stripes', count: 4, seed: 9 }, rig, body)) {
    assert.ok(cellOn(rig, s.x, s.y))
    assert.ok(s.size >= 0.2 * (56 / 64) - 1e-9, `size ${s.size}`)
  }
})

test('a tiny body never makes a mark smaller than MIN_SIZE', () => {
  assert.equal(MIN_SIZE, 0.055)
  const rig = rectRig(30, 30, 34, 34)
  for (const kind of ['spots', 'stars', 'flower', 'stripes'])
    for (const s of planMarks({ kind, count: 3, seed: 2 }, rig, bodyOf(30, 30, 34, 34)))
      assert.ok(s.size >= MIN_SIZE - 1e-12, `${kind} ${s.size}`)
})

test('an empty body mask falls back to the main region', () => {
  const rig = rectRig()
  const shapes = planMarks({ kind: 'spots', count: 4, seed: 8 }, rig, bodyOf(0, 0, 0, 0))
  assert.equal(shapes.length, 4)
  for (const s of shapes) assert.ok(cellOn(rig, s.x, s.y))
})

test('old star counts draw at least three', () => {
  assert.equal(planMarks({ kind: 'stars', count: 1, seed: 4 }, rectRig()).length, 3)
})

const recorder = () => {
  const log = []
  const ctx = new Proxy(
    { globalAlpha: 1, shadowBlur: 0, shadowColor: 'rgba(0,0,0,0)' },
    {
      get: (t, k) =>
        k in t
          ? t[k]
          : (...a) =>
              log.push([k, t.strokeStyle, t.fillStyle, t.globalAlpha, t.lineWidth, t.shadowBlur, t.shadowColor, a]),
      set: (t, k, v) => ((t[k] = v), true),
    }
  )
  return { log, ctx }
}

test('stars, flowers and hearts get a dark outline under the fill', () => {
  const { log, ctx } = recorder()
  for (const kind of ['flower', 'hearts']) {
    drawMarks(ctx, [{ kind, x: 0.5, y: 0.5, size: 0.08, angle: 0, tone: 'accent' }])
    const stroke = log.findIndex(([k]) => k === 'stroke')
    assert.ok(stroke >= 0 && stroke < log.findIndex(([k]) => k === 'fill'), kind)
    log.length = 0
  }
  drawMarks(
    ctx,
    [{ kind: 'stars', x: 0.5, y: 0.5, size: 0.08, angle: 0, tone: 'accent' }],
    512,
    { w: 200, h: 100 }
  )
  const stroke = log.findIndex(([k]) => k === 'stroke')
  const fill = log.findIndex(([k]) => k === 'fill')
  assert.ok(stroke >= 0 && stroke < fill, 'stroke first')
  const [, style, , alpha, width] = log[stroke]
  assert.equal(style, 'rgb(255,0,0)')
  assert.equal(alpha, 0.6)
  assert.ok(Math.abs(width - (3 * 0.5) / 512) < 1e-12)
  assert.equal(log[fill][3], 1, 'the fill is opaque')
  log.length = 0
  drawMarks(ctx, [{ kind: 'spots', x: 0.5, y: 0.5, size: 0.08, angle: 0, tone: 'dark' }])
  assert.ok(!log.some(([k]) => k === 'stroke'), 'spots have no outline')
})

test('a heart is a closed curve: two lobes and a point below', () => {
  const { log, ctx } = recorder()
  drawMarks(ctx, [{ kind: 'hearts', x: 0.5, y: 0.5, size: 0.1, angle: 0, tone: 'accent' }])
  const curves = log.filter(([k]) => k === 'bezierCurveTo')
  assert.ok(curves.length >= 4, 'drawn with curves')
  assert.ok(log.some(([k]) => k === 'closePath'))
})

test('glow: a soft accent halo under hearts, stars and flowers only, then a crisp mark', () => {
  const { log, ctx } = recorder()
  const shapes = ['hearts', 'stars', 'flower', 'spots'].map((kind) => ({
    kind,
    x: 0.5,
    y: 0.5,
    size: 0.1,
    angle: 0,
    tone: kind === 'spots' ? 'dark' : 'accent',
  }))
  drawMarks(ctx, shapes, 512, { w: 1, h: 1 }, { glow: true })
  const glows = log.filter(([k, , , , , blur]) => k === 'fill' && blur > 0)
  assert.equal(glows.length, 3, 'one halo per glowing kind')
  for (const g of glows) {
    assert.match(g[6], /^rgba\(0,\s*0,\s*255/, 'the halo is accent')
    assert.ok(g[5] >= 0.1 * 512 * 0.2, 'soft: blur grows with the mark')
  }
  // the rim and the final fill are crisp
  for (const [k, , , , , blur] of log)
    if (k === 'stroke') assert.equal(blur, 0)
  const fills = log.filter(([k]) => k === 'fill')
  assert.equal(fills.at(-1)[5], 0)
  const first = log.findIndex(([k, , , , , blur]) => k === 'fill' && blur > 0)
  const rim = log.findIndex(([k]) => k === 'stroke')
  assert.ok(first < rim, 'halo under the rim')
  log.length = 0
  drawMarks(ctx, shapes, 512)
  assert.ok(!log.some(([, , , , , blur]) => blur > 0), 'no glow unless asked')
})

test('the shader covers every region pixel and keeps half the shading', () => {
  const src = readFileSync(new URL('./shader.ts', import.meta.url), 'utf8')
  assert.match(src, /mark\.a \* flow\.b \* free \* smoothstep\(0\.05, 0\.3, top\)/)
  assert.match(src, /ink\.x \+ 0\.5 \* \(out_\.x - uTarget\[0\]\.x\)/)
  assert.doesNotMatch(src, /main_/)
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
