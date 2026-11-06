import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('sucrase/register')
const sharp = require('sharp')
const { flowToFirst, encodeFlow, premultiplied, TILE } = require('./flow.ts')

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
