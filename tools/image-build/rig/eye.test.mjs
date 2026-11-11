import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('sucrase/register')
const { eyeMask, shrinkMask } = require('./eye.ts')
const sharp = require('sharp')

const image = () => {
  const w = 40, h = 24
  const rgba = new Uint8Array(w * h * 4)
  const put = (x, y, color) => rgba.set([...color, 255], (y * w + x) * 4)
  // Near-white sclera outlined in dark, with a dark iris and catch-light.
  for (let y = 4; y <= 12; y++) for (let x = 5; x <= 18; x++) put(x, y, [0, 0, 0])
  for (let y = 5; y <= 11; y++) for (let x = 6; x <= 17; x++) put(x, y, [246, 245, 243])
  for (let y = 7; y <= 10; y++) for (let x = 10; x <= 13; x++) put(x, y, [35, 24, 28])
  put(10, 7, [255, 255, 255])
  for (let y = 15; y <= 19; y++) for (let x = 25; x <= 34; x++) put(x, y, [220, 215, 210])
  return { rgba, w, h }
}

test('eye mask selects sclera, excluding iris, outline and pale belly', () => {
  const { rgba, w, h } = image()
  const mask = eyeMask(rgba, w, h)
  const on = (x, y) => mask[y * w + x] > 0
  assert.ok(on(8, 8), 'sclera should be protected')
  assert.ok(!on(11, 9), 'iris should not be masked')
  assert.ok(!on(5, 5), 'outline should not be masked')
  assert.ok(!on(29, 17), 'belly should remain recolorable')
})

test('eye mask is empty for a sprite with no eye context', () => {
  const { w, h } = image()
  const rgba = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) rgba.set([220, 215, 210, 255], i * 4)
  assert.equal(eyeMask(rgba, w, h).some(Boolean), false)
})

test('eye mask detects sclera but excludes its iris and belly', () => {
  const w = 512, h = 512
  const rgba = new Uint8Array(w * h * 4)
  const put = (x, y, color) => rgba.set([...color, 255], (y * w + x) * 4)
  for (let y = 147; y <= 159; y++) for (let x = 271; x <= 289; x++) put(x, y, [20, 20, 20])
  for (let y = 149; y <= 157; y++) for (let x = 273; x <= 288; x++) put(x, y, [197, 199, 214])
  // Raised eye-region thresholds normalized from source Nidoqueen sclera pixels.
  for (let y = 150; y <= 157; y++) for (let x = 266; x <= 272; x++) put(x, y, [26, 22, 23])
  for (let y = 265; y <= 295; y++) for (let x = 330; x <= 370; x++) put(x, y, [202, 202, 216])
  const mask = eyeMask(rgba, w, h)
  const protectedAt = (x, y) => mask[y * w + x] > 0
  assert.ok(protectedAt(280, 153), 'sclera should be protected')
  assert.ok(!protectedAt(269, 153), 'iris should not be masked')
  assert.ok(!protectedAt(350, 280), 'belly should remain recolorable')
})

test('eye mask keeps sclera with a soft blue-gray antialiased rim', () => {
  const w = 200, h = 160
  const rgba = new Uint8Array(w * h * 4)
  const put = (x, y, color) => rgba.set([...color, 255], (y * w + x) * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) put(x, y, [77, 129, 172])
  for (let y = 20; y <= 100; y++)
    for (let x = 40; x <= 150; x++) put(x, y, [75, 93, 114])
  for (let y = 24; y <= 96; y++)
    for (let x = 44; x <= 150; x++) put(x, y, [197, 199, 214])
  for (let y = 24; y <= 96; y++)
    for (let x = 141; x <= 146; x++) put(x, y, [180, 187, 203])
  for (let y = 20; y <= 100; y++)
    for (let x = 147; x <= 150; x++) put(x, y, [75, 93, 114])
  for (let y = 60; y <= 90; y++)
    for (let x = 48; x <= 60; x++) put(x, y, [26, 22, 23])

  const mask = eyeMask(rgba, w, h)
  const maskedSclera = Array.from({ length: 73 }, (_, dy) =>
    Array.from({ length: 97 }, (_, dx) => mask[(24 + dy) * w + 50 + dx] > 0)
  ).flat().filter(Boolean).length
  assert.ok(maskedSclera > 0.8 * (97 * 73 - 13 * 31), `sclera mostly masked, got ${maskedSclera}`)
  assert.ok(mask[75 * w + 100] > 0, 'sclera center should be protected')
  assert.ok(!mask[70 * w + 52], 'iris should remain recolorable')
  assert.ok(!mask[5 * w + 5], 'background should remain recolorable')
})

test('eye mask excludes the yellow Charizard belly on animation frame 14', () => {
  const frame = new Uint8Array(
    readFileSync(new URL('./fixtures/charizard-frame14.rgba', import.meta.url))
  )
  const w = 256, h = 256
  const mask = eyeMask(frame, w, h)
  assert.ok(!mask[174 * w + 83], 'belly highlight must remain recolorable')
})

test('eye mask covers the complete Nidoqueen sclera from the served rig frame', () => {
  const sheet = new Uint8Array(
    readFileSync(new URL('./fixtures/nidoqueen-frame0.rgba', import.meta.url))
  )
  const mask = eyeMask(sheet, 512, 512)
  const on = (x, y) => mask[y * 512 + x] > 0
  let light = 0
  let covered = 0
  for (let y = 142; y <= 168; y++)
    for (let x = 258; x <= 291; x++) {
      const o = (y * 512 + x) * 4
      const lo = Math.min(sheet[o], sheet[o + 1], sheet[o + 2])
      const hi = Math.max(sheet[o], sheet[o + 1], sheet[o + 2])
      // the sclera only: the dark iris/outline left of x=270 is not part of it
      if (sheet[o + 3] < 128 || lo < 175 || hi - lo > 80) continue
      light++
      if (on(x, y)) covered++
    }
  assert.ok(light > 350, `fixture should hold a sclera, got ${light}`)
  assert.ok(covered >= 0.95 * light, `sclera coverage should be complete, got ${covered}/${light}`)
  assert.ok(!on(270, 153), 'dark iris should not be protected')
  assert.ok(!on(350, 280), 'body highlight should remain recolorable')
})

test('eye mask keeps a sclera whose rim is mid-dark brown, not black (animation frames)', () => {
  const w = 120, h = 100
  const rgba = new Uint8Array(w * h * 4)
  const put = (x, y, color) => rgba.set([...color, 255], (y * w + x) * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) put(x, y, [150, 40, 50])
  // rim only ~110 bright: a softer outline than the first frame has
  for (let y = 20; y <= 60; y++) for (let x = 30; x <= 80; x++) put(x, y, [110, 60, 60])
  for (let y = 23; y <= 57; y++) for (let x = 33; x <= 77; x++) put(x, y, [230, 232, 240])
  // pale belly with the same mid-red surround must stay recolorable
  for (let y = 70; y <= 95; y++) for (let x = 10; x <= 60; x++) put(x, y, [225, 225, 235])
  const mask = eyeMask(rgba, w, h)
  assert.ok(mask[40 * w + 55] > 0, 'sclera should be protected')
  assert.ok(!mask[80 * w + 30], 'belly should remain recolorable')
})

test('eye mask generated from a sprite frame remains full resolution', async () => {
  const { rgba, w, h } = image()
  const frame = await sharp(Buffer.from(rgba), {
    raw: { width: w, height: h, channels: 4 },
  }).png().toBuffer()
  const { data, info } = await sharp(frame)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const mask = eyeMask(data, info.width, info.height)
  assert.equal(mask.length, w * h)
  assert.ok(mask[8 * w + 8] > 0)
})

test('shrinkMask keeps a lone pixel as one pixel, and nothing as nothing', () => {
  const m = new Uint8Array(64)
  m[2 * 8 + 5] = 255
  const out = shrinkMask(m, 8, 8, 4, 4)
  assert.equal(out.length, 16)
  assert.equal(out.filter(Boolean).length, 1)
  assert.equal(out[1 * 4 + 2], 255)
  assert.equal(shrinkMask(new Uint8Array(64), 8, 8, 4, 4).some(Boolean), false)
})
