import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('sucrase/register')
const {
  clusterColors,
  primaryMask,
  oklab,
  overrideFor,
  LOCK,
} = require('./clusters.ts')

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
const ORANGE = '#e2683c'
const CREAM = '#f6d7a7'
const BLUE = '#3d7fb8'

// 100×100: a transparent margin, a black outline, orange 60% / cream 30% /
// blue 10% of the inside, and a white spot on the orange
function picture() {
  const w = 100
  const h = 100
  const px = new Uint8Array(w * h * 4)
  const put = (x, y, rgb, a = 255) => px.set([...rgb, a], (y * w + x) * 4)
  for (let y = 5; y < 95; y++)
    for (let x = 5; x < 95; x++) {
      const edge = x < 7 || x > 92 || y < 7 || y > 92
      const t = (y - 7) / 86
      put(
        x,
        y,
        edge ? [0, 0, 0] : hex(t < 0.6 ? ORANGE : t < 0.9 ? CREAM : BLUE)
      )
    }
  for (let y = 20; y < 26; y++)
    for (let x = 40; x < 46; x++) put(x, y, [255, 255, 255])
  return { px, w, h }
}

test('three regions in share order; outline, white spot and transparency left out', () => {
  const { px, w, h } = picture()
  const { clusters, lock } = clusterColors([px], w, h)
  assert.deepEqual(lock, LOCK)
  assert.deepEqual(lock, { ink: 0.32, light: 0.93 })
  assert.equal(clusters.length, 3)
  const want = [ORANGE, CREAM, BLUE].map((c) => oklab(...hex(c)))
  clusters.forEach((c, i) => assert.ok(dist(c.lab, want[i]) < 0.01, `${i}`))
  assert.ok(Math.abs(clusters[0].share - 0.6) < 0.03, `${clusters[0].share}`)
  assert.ok(Math.abs(clusters[1].share - 0.3) < 0.03)
  assert.ok(Math.abs(clusters[2].share - 0.1) < 0.03)
  const total = clusters.reduce((s, c) => s + c.share, 0)
  assert.ok(Math.abs(total - 1) < 1e-9)
})

test('two colours closer than ΔE 0.08 are one region', () => {
  const a = hex('#e2683c')
  const b = hex('#d8653f')
  assert.ok(Math.abs(dist(oklab(...a), oklab(...b)) - 0.03) < 0.01)
  const w = 40
  const h = 40
  const px = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) px.set([...(i % 2 ? a : b), 255], i * 4)
  const { clusters } = clusterColors([px], w, h)
  assert.equal(clusters.length, 1)
  assert.equal(clusters[0].share, 1)
})

test('deterministic, over several frames', () => {
  const one = picture()
  const two = picture()
  two.px.fill(0, 0, 4000)
  const run = () => clusterColors([one.px, two.px], 100, 100)
  assert.deepEqual(run(), run())
})

test('an override replaces k-means: its colours are the centres, in its order', () => {
  const { px, w, h } = picture()
  const { clusters } = clusterColors([px], w, h, { clusters: [BLUE, ORANGE] })
  assert.equal(clusters.length, 2)
  assert.ok(dist(clusters[0].lab, oklab(...hex(BLUE))) < 1e-9)
  assert.ok(dist(clusters[1].lab, oklab(...hex(ORANGE))) < 1e-9)
  assert.ok(clusters[1].share > clusters[0].share)
  assert.deepEqual(overrideFor(327), { noMarks: true })
  assert.deepEqual(overrideFor(45), { noMarks: true })
  assert.equal(overrideFor(25), undefined)
})

test('primaryMask: the main region, without outline or spot', () => {
  const { px, w, h } = picture()
  const { clusters, lock } = clusterColors([px], w, h)
  const m = primaryMask(px, w, h, clusters, lock, 50)
  assert.equal(m.length, 2500)
  const at = (x, y) => m[Math.floor(y / 2) * 50 + Math.floor(x / 2)]
  assert.equal(at(50, 40), 1, 'orange')
  assert.equal(at(50, 80), 0, 'cream')
  assert.equal(at(50, 92), 0, 'blue')
  assert.equal(at(2, 2), 0, 'transparent')
  assert.equal(at(5, 50), 0, 'outline')
  assert.equal(at(42, 22), 0, 'white spot')
})
