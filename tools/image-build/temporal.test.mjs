import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('sucrase/register')
const { sourceChanges, stillMask, smoothAlongTime } = require('./temporal.ts')

const W = 8
const H = 8
// RGBA source frame from a pixel function
const frame = (px) => {
  const b = Buffer.alloc(W * H * 4)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) b.set(px(x, y), (y * W + x) * 4)
  return b
}
const grey = [128, 128, 128, 255]
const black = [0, 0, 0, 255]

test('a source pixel changed between two frames is flagged, the loop included', () => {
  const frames = [
    frame(() => grey),
    frame((x, y) => (x === 2 && y === 3 ? black : grey)),
    frame((x, y) => (x === 5 && y === 5 ? [0, 0, 0, 0] : grey)),
  ]
  const c = sourceChanges(frames, W, H)
  assert.equal(c.length, 3)
  assert.equal(c[0][3 * W + 2], 1) // 0 → 1: grey becomes black
  assert.equal(c[1][3 * W + 2], 1) // 1 → 2: black back to grey
  assert.equal(c[1][5 * W + 5], 1) // 1 → 2: covered becomes empty
  assert.equal(c[2][5 * W + 5], 1) // 2 → 0: the loop closes
  assert.equal(c[0][0], 0)
  assert.equal(c[2][3 * W + 2], 0)
})

test('the still mask is 0 around any change inside the span, wrapping round', () => {
  const none = new Uint8Array(W * H)
  const one = new Uint8Array(W * H)
  one[4 * W + 4] = 1
  const changes = [none, none, one]
  const inside = stillMask(changes, 1, 3, W, H)
  assert.equal(inside[4 * W + 4], 0)
  assert.equal(inside[3 * W + 3], 0) // one pixel of margin
  assert.equal(inside[2 * W + 2], 255)
  assert.equal(stillMask(changes, 0, 2, W, H)[4 * W + 4], 255)
  assert.equal(stillMask(changes, -1, 1, W, H)[4 * W + 4], 0) // -1 is frame 2
})

test('wobble where the source stands still is averaged; a stroke that moved is never mixed in', async () => {
  const n = 6
  // the left half turns from black to white at frame 3; the right never moves
  const src = Array.from({ length: n }, (_, f) =>
    frame((x) => (x < 4 ? (f < 3 ? black : [255, 255, 255, 255]) : grey))
  )
  // the "upscaled" frames: same picture, the right half wobbling 100/120
  const out = Buffer.concat(
    src.map((s, f) => {
      const b = Buffer.from(s)
      for (let y = 0; y < H; y++)
        for (let x = 4; x < W; x++)
          b.fill(f % 2 ? 120 : 100, (y * W + x) * 4, (y * W + x) * 4 + 3)
      return b
    })
  )
  await smoothAlongTime(out, {
    w: W,
    h: H,
    tw: W,
    th: H,
    frames: n,
    k: 1,
    changes: sourceChanges(src, W, H),
  })
  const at = (f, x, y) => out[f * W * H * 4 + (y * W + x) * 4]
  assert.equal(at(2, 1, 4), 0, 'the black before the change keeps no white ghost')
  assert.equal(at(3, 1, 4), 255, 'the white after it keeps no black ghost')
  const v = at(2, 6, 4)
  assert.ok(v > 102 && v < 118, `the wobble is averaged (${v})`)
  assert.equal(out[2 * W * H * 4 + (4 * W + 6) * 4 + 3], 255)
})
