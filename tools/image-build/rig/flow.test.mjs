import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('sucrase/register')
const sharp = require('sharp')
const {
  flowToFirst,
  encodeFlow,
  flowSheet,
  writeTile,
  premultiplied,
  locallyAffine,
  TILE,
} = require('./flow.ts')

// tiny.gif: 12×12, 4 frames, a 6×6 textured square at x = 3+OFF[K]..8+OFF[K],
// y = 3..8 (one px right, back, one px left). Flow runs at 16× (192px): one
// source px is 16 flow px.
const OFF = [0, 1, 0, -1]
const SCALE = 16
const W = 12 * SCALE

const load = async () => {
  const file = new URL('./fixtures/tiny.gif', import.meta.url).pathname
  const frames = []
  for (let f = 0; f < 4; f++) {
    const raw = await sharp(file, { page: f })
      .ensureAlpha()
      .resize(W, W, { kernel: 'nearest' })
      .raw()
      .toBuffer()
    frames.push(premultiplied(raw, W, W))
  }
  return frames
}

const at = (field, x, y) => {
  const i = y * W + x
  return [field.u[i] * W - 0.5, field.v[i] * W - 0.5, field.conf[i]]
}

test('frame K maps the body back to frame 0, one source px either way', async () => {
  const fields = await flowToFirst(await load(), W, W)
  assert.equal(fields.length, 4)
  for (let K = 1; K < 4; K++) {
    let checked = 0
    // body cells away from the square's edge (a 1px source border)
    for (let sy = 4; sy < 8; sy++)
      for (let sx = 4 + OFF[K]; sx < 8 + OFF[K]; sx++) {
        const x = sx * SCALE + SCALE / 2
        const y = sy * SCALE + SCALE / 2
        const [tx, ty, c] = at(fields[K], x, y)
        assert.ok(
          Math.abs((tx - x) / SCALE + OFF[K]) <= 0.5,
          `K=${K} (${sx},${sy}) dx ${((tx - x) / SCALE).toFixed(2)}`
        )
        assert.ok(Math.abs(ty - y) / SCALE <= 0.5, `K=${K} dy`)
        assert.ok(c > 0.8, `K=${K} (${sx},${sy}) conf ${c.toFixed(2)}`)
        checked++
      }
    assert.equal(checked, 16)
    // outside the body: no confidence
    for (const [sx, sy] of [
      [0, 0],
      [11, 11],
      [2 + OFF[K], 5],
    ])
      assert.equal(
        at(fields[K], sx * SCALE + 8, sy * SCALE + 8)[2],
        0,
        `K=${K} outside (${sx},${sy})`
      )
  }
})

test('frame 0 is the identity, sure inside the body only', async () => {
  const [f0] = await flowToFirst(await load(), W, W)
  for (const [x, y] of [
    [40, 60],
    [100, 100],
    [5, 5],
  ]) {
    const [tx, ty] = at(f0, x, y)
    assert.ok(Math.abs(tx - x) < 1e-3 && Math.abs(ty - y) < 1e-3)
  }
  assert.equal(at(f0, 3 * SCALE + 8, 3 * SCALE + 8)[2], 1)
  assert.equal(at(f0, 8, 8)[2], 0)
})

test('the flow png holds one 128px tile per frame, 8-bit u, v, confidence', async () => {
  const fields = await flowToFirst(await load(), W, W)
  const { data, width, height, cols } = encodeFlow(fields, W, W)
  assert.equal(TILE, 128)
  assert.equal(cols, 2)
  assert.equal(width, 256)
  assert.equal(height, 256)
  const px = (K, x, y) => {
    const X = (K % cols) * TILE + x
    const Y = Math.floor(K / cols) * TILE + y
    return [...data.subarray((Y * width + X) * 4, (Y * width + X) * 4 + 4)]
  }
  // frame 0: identity everywhere (u,v = cell centre), sure in the body
  for (const [x, y] of [
    [10, 20],
    [64, 64],
    [127, 0],
  ]) {
    const [r, g] = px(0, x, y)
    assert.ok(Math.abs(r - ((x + 0.5) / TILE) * 255) <= 1, `r ${r} at ${x}`)
    assert.ok(Math.abs(g - ((y + 0.5) / TILE) * 255) <= 1, `g ${g} at ${y}`)
  }
  const mid = Math.round((5.5 / 12) * TILE)
  assert.equal(px(0, mid, mid)[2], 255)
  assert.equal(px(0, 4, 4)[2], 0)
  assert.equal(px(0, 4, 4)[3], 255)
  // frame 3 (one px left): its source px 4.5 sits at 5.5 in frame 0
  const [r, g, b] = px(3, Math.round((4.5 / 12) * TILE), mid)
  assert.ok(Math.abs((r / 255) * 12 - 5.5) <= 0.5, `r ${r}`)
  assert.ok(Math.abs((g / 255) * 12 - 5.5) <= 0.5, `g ${g}`)
  assert.ok(b > 200, `conf ${b}`)
})

// a 96px body whose true map is a rotation + scale; the flow is that map plus
// fine swirls (what Farneback gives on a waving tail)
const S = 96
const truth = (x, y) => {
  const X = x / S - 0.5
  const Y = y / S - 0.5
  return [0.5 + 0.9 * (0.94 * X - 0.34 * Y), 0.5 + 0.9 * (0.34 * X + 0.94 * Y)]
}
const synthetic = (noise) => {
  const frame = new Float32Array(S * S * 4)
  const u = new Float32Array(S * S)
  const v = new Float32Array(S * S)
  const conf = new Float32Array(S * S)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x
      frame[i * 4 + 3] = 1
      const [tu, tv] = truth(x + 0.5, y + 0.5)
      u[i] = tu + noise * Math.sin(x * 1.3 + y * 0.7)
      v[i] = tv + noise * Math.cos(x * 0.6 - y * 1.1)
      conf[i] = 1
    }
  return { frame, field: { u, v, conf } }
}
const rms = (f) => {
  let s = 0
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const [tu, tv] = truth(x + 0.5, y + 0.5)
      s += (f.u[y * S + x] - tu) ** 2 + (f.v[y * S + x] - tv) ** 2
    }
  return Math.sqrt(s / (S * S))
}

test('a locally affine field keeps a rotating body whole and drops fine swirls', () => {
  const clean = synthetic(0)
  const kept = locallyAffine(clean.field, clean.frame, S, S)
  assert.ok(rms(kept) < 1e-4, `an affine map is kept: ${rms(kept)}`)
  const noisy = synthetic(0.02)
  const before = rms(noisy.field)
  const after = rms(locallyAffine(noisy.field, noisy.frame, S, S))
  assert.ok(after < before / 5, `swirls ${before.toFixed(4)} → ${after.toFixed(4)}`)
  // confidence untouched
  assert.equal(locallyAffine(noisy.field, noisy.frame, S, S).conf, noisy.field.conf)
})

test('the fit trusts drawn lines over flat fill, where the flow has nothing to hold', () => {
  // dark lines 2px wide every 12px over a flat fill; on the flat fill the flow
  // is off by .05, on and beside the lines it is true
  const { frame, field } = synthetic(0)
  const lum = (x, y) => (x % 12 < 2 || y % 12 < 2 ? 0.1 : 0.8)
  const flat = (x, y) =>
    [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => lum(x + dx, y + dy) === lum(x, y))
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x
      frame.fill(lum(x, y), i * 4, i * 4 + 3)
      if (flat(x, y)) {
        field.u[i] += 0.05
        field.v[i] += 0.05
      }
    }
  const after = rms(locallyAffine(field, frame, S, S))
  assert.ok(after < 0.008, `flat fill pulls the fit off: ${after.toFixed(4)}`)
})

const unpack = (sheet, o) => [
  (sheet.data[o] * 256 + sheet.low[o]) / 65535,
  (sheet.data[o + 1] * 256 + sheet.low[o + 1]) / 65535,
]

test('flow is 16-bit: a tile written with u, v reads back within 1/65535', () => {
  const sheet = flowSheet(2)
  const n = 8 * 8
  writeTile(
    sheet,
    1,
    { u: new Float32Array(n).fill(0.123456), v: new Float32Array(n).fill(0.654321), conf: new Float32Array(n).fill(1) },
    8,
    8
  )
  // frame 1 is the second tile of a 2-column sheet
  const o = (0 * sheet.width + TILE) * 4
  const [u, v] = unpack(sheet, o)
  assert.ok(Math.abs(u - 0.123456) <= 1 / 65535, `u ${u}`)
  assert.ok(Math.abs(v - 0.654321) <= 1 / 65535, `v ${v}`)
  assert.equal(sheet.data[o + 2], 255)
  assert.equal(sheet.low[o + 3], 255)
})

test('frame 0 is the identity at 16 bits', () => {
  const sheet = flowSheet(1)
  const n = 4 * 4
  writeTile(
    sheet,
    0,
    { u: new Float32Array(n), v: new Float32Array(n), conf: new Float32Array(n).fill(1) },
    4,
    4
  )
  const first = unpack(sheet, 0)
  const last = unpack(sheet, (TILE - 1) * 4)
  assert.ok(Math.abs(first[0] - 0.5 / TILE) <= 1 / 65535)
  assert.ok(Math.abs(last[0] - (TILE - 0.5) / TILE) <= 1 / 65535)
})
