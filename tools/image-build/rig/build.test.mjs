import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('sucrase/register')
const sharp = require('sharp')
const { buildRig, RIG_VERSION } = require('./build.ts')
const { sheetPlan, encodeSheet } = require('./sheet.ts')

const tiny = readFileSync(new URL('./fixtures/tiny.gif', import.meta.url))

// the upscaler's output stands in: every source frame twice (k = 2), 50ms
// each; the copy differs by a near-transparent corner, or WebP merges them
const animated = async () => {
  const pages = []
  for (let f = 0; f < 4; f++) {
    const raw = await sharp(tiny, { page: f }).ensureAlpha().raw().toBuffer()
    const copy = Buffer.from(raw)
    copy[3] = 1
    for (const px of [raw, copy])
      pages.push(
        await sharp(px, { raw: { width: 12, height: 12, channels: 4 } })
          .png()
          .toBuffer()
      )
  }
  return sharp(pages, { join: { animated: true } })
    .webp({ delay: Array(8).fill(50), loop: 0, lossless: true })
    .toBuffer()
}

test('the sheet is 512px cells, 64 to a page, at most 4 pages (frames drop past 256)', () => {
  const plan = (m) => {
    const p = sheetPlan(m)
    return [p.size, p.pages, p.per, p.cols, p.rows, p.keep.length]
  }
  assert.deepEqual(plan(1), [512, 1, 1, 1, 1, 1])
  assert.deepEqual(plan(8), [512, 1, 8, 3, 3, 8])
  assert.deepEqual(plan(64), [512, 1, 64, 8, 8, 64])
  assert.deepEqual(plan(65), [512, 2, 64, 8, 8, 65])
  assert.deepEqual(plan(130), [512, 3, 64, 8, 8, 130])
  assert.deepEqual(plan(300), [512, 4, 64, 8, 8, 256])
  const kept = sheetPlan(300).keep
  assert.equal(kept[0], 0)
  assert.ok(kept.every((k, i) => i === 0 || k > kept[i - 1]))
  assert.ok(kept.at(-1) < 300)
})

test('encodeSheet writes one webp per page, frame K in page K/64 cell K%64', async () => {
  const frames = Array.from({ length: 130 }, (_, K) => {
    const f = new Uint8Array(4 * 4 * 4)
    for (let i = 0; i < 16; i++) f.set([K, 0, 0, 255], i * 4)
    return f
  })
  const pages = await encodeSheet(
    frames,
    4,
    4,
    { cols: 8, rows: 8, per: 64, pages: 3 },
    100
  )
  assert.equal(pages.length, 3)
  for (const page of pages) {
    const m = await sharp(page).metadata()
    assert.deepEqual([m.format, m.width, m.height], ['webp', 32, 32])
  }
  const red = async (page, x, y) =>
    (await sharp(pages[page]).ensureAlpha().raw().toBuffer())[(y * 32 + x) * 4]
  assert.ok(Math.abs((await red(1, 1, 1)) - 64) <= 6)
  assert.ok(Math.abs((await red(2, 5, 1)) - 129) <= 6)
})

test('dropped frames hand their delay to the frame kept before them', () => {
  const { keep } = sheetPlan(300)
  const { delays } = sheetPlan(300, Array(300).fill(10))
  assert.equal(delays.length, 256)
  assert.equal(
    delays.reduce((a, b) => a + b),
    3000
  )
  assert.equal(delays[0], (keep[1] - keep[0]) * 10)
})

test('an animation: one sheet cell and one flow tile per displayed frame', async () => {
  const { json, sheet, flow, eye } = await buildRig(tiny, await animated(), null)
  assert.equal(RIG_VERSION, 9)
  assert.equal(json.v, 9)
  assert.equal(json.frames, 8)
  assert.deepEqual(json.src, { n: 4, k: 2 })
  assert.deepEqual(json.delays, Array(8).fill(50))
  assert.deepEqual(json.sheet, { cols: 3, size: 512 })
  assert.deepEqual(json.frame, { w: 512, h: 512 })
  assert.deepEqual(json.flow, { cols: 3, tile: 128, bits: 8 })
  const s = await sharp(sheet).metadata()
  assert.equal(s.format, 'webp')
  assert.equal(s.width, 3 * 512)
  assert.equal(s.height, 3 * 512)
  const f = await sharp(flow).metadata()
  assert.equal(f.format, 'webp')
  assert.equal(f.width, 3 * 128)
  assert.equal(f.height, 3 * 128)
  const e = await sharp(eye).metadata()
  assert.equal(e.format, 'png')
  assert.equal(e.width, 3 * 512)
  assert.equal(e.height, 3 * 512)
  const eyePixels = await sharp(eye).raw().toBuffer()
  assert.equal(eyePixels.some((value) => value > 0), false, 'tiny fixture has no eye')
  assert.ok(json.clusters.length >= 1 && json.clusters.length <= 3)
  assert.deepEqual(json.lock, { ink: 0.32, light: 0.93 })
  assert.equal(json.primary.size, 64)
  assert.equal(Buffer.from(json.primary.bits, 'base64').length, 512)
  assert.ok(Array.isArray(json.branches))
  // frame 6 shows source frame 3 (one px left): its px 4.5 sits at 5.5
  const raw = await sharp(flow).ensureAlpha().raw().toBuffer()
  const X = (6 % 3) * 128 + Math.round((4.5 / 12) * 128)
  const Y = Math.floor(6 / 3) * 128 + Math.round((5.5 / 12) * 128)
  const r = raw[(Y * 384 + X) * 4]
  assert.ok(Math.abs((r / 255) * 12 - 5.5) <= 0.5, `r ${r}`)
  assert.ok(raw[(Y * 384 + X) * 4 + 2] > 200)
})

test('a still alone: one frame, a second long, the identity flow', async () => {
  const still = await sharp(tiny, { page: 0 }).png().toBuffer()
  const { json, sheet, flow, eye } = await buildRig(null, null, still)
  assert.equal(json.frames, 1)
  const eyeMeta = await sharp(eye).metadata()
  assert.equal(eyeMeta.width, 512)
  assert.equal(eyeMeta.height, 512)
  assert.deepEqual(json.delays, [1000])
  assert.deepEqual(json.src, { n: 1, k: 1 })
  assert.deepEqual(json.sheet, { cols: 1, size: 512 })
  assert.equal((await sharp(sheet).metadata()).width, 512)
  const f = await sharp(flow).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  assert.equal(f.info.width, 128)
  const at = (x, y) => f.data[(y * 128 + x) * 4]
  assert.ok(Math.abs(at(64, 64) - (64.5 / 128) * 255) <= 1)
})

test('a species with noMarks says so in its rig', async () => {
  const still = await sharp(tiny, { page: 0 }).png().toBuffer()
  const { json } = await buildRig(null, null, still, 327)
  assert.equal(json.noMarks, true)
  const plain = await buildRig(null, null, still, 6)
  assert.equal(plain.json.noMarks, undefined)
})

test('the flow is stored losslessly: written tiles come back byte for byte', async () => {
  const { flow, json } = await buildRig(tiny, await animated(), null)
  assert.equal((await sharp(flow).metadata()).format, 'webp')
  const { data, info } = await sharp(flow)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  assert.equal(info.channels, 4)
  const { cols, tile } = json.flow
  // every written tile has alpha 255 (only the spare tile of the grid is empty)
  for (let K = 0; K < json.frames; K++) {
    const o = (Math.floor(K / cols) * tile * info.width + (K % cols) * tile) * 4
    assert.equal(data[o + 3], 255)
  }
  // frame 0 is the identity: u, v are the cell centres, byte for byte
  assert.equal(data[0], Math.round((0.5 / tile) * 255))
  assert.equal(data[(tile - 1) * 4], Math.round(((tile - 0.5) / tile) * 255))
})
