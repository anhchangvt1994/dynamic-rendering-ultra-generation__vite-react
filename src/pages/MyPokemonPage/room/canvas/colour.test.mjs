import assert from 'node:assert/strict'
import test from 'node:test'
import { hexToOklab, oklabToRgb, paletteUniforms } from './colour.mjs'

const near = (a, b, eps, msg) =>
  assert.ok(Math.abs(a - b) <= eps, `${msg ?? ''} ${a} vs ${b}`)
const hue = (a, b) => (Math.atan2(b, a) * 180) / Math.PI
const angleBetween = (h1, h2) => ((h2 - h1 + 540) % 360) - 180

const CLUSTERS = [
  { lab: [0.7, 0.12, 0.08], share: 0.5 },
  { lab: [0.85, -0.03, 0.09], share: 0.3 },
  { lab: [0.4, 0.02, -0.1], share: 0.2 },
]
const ZERO = [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
]
const app = (palette, shift = ZERO) => ({ v: 2, palette, shift, marks: null })

test('white is L 1, no chroma', () => {
  const [L, a, b] = hexToOklab('#ffffff')
  near(L, 1, 1e-4)
  near(a, 0, 1e-4)
  near(b, 0, 1e-4)
})

test('hex → OKLab → RGB comes home within a step', () => {
  for (const hex of ['#e2683c', '#3d7fb8', '#1e1e26', '#fff0b8', '#000000']) {
    const rgb = oklabToRgb(hexToOklab(hex))
    for (let k = 0; k < 3; k++)
      near(
        rgb[k],
        parseInt(hex.slice(1 + 2 * k, 3 + 2 * k), 16) / 255,
        1 / 255,
        hex
      )
  }
})

test('origin with no shift keeps the sprite own colours', () => {
  const u = paletteUniforms(app('origin'), CLUSTERS)
  assert.equal(u.count, 3)
  assert.equal(u.effect, 0)
  assert.deepEqual(Array.from(u.target), Array.from(u.source))
  near(u.source[0], 0.7, 1e-6)
})

test('a palette lays its colours on the regions in order', () => {
  const u = paletteUniforms(app('ember'), CLUSTERS)
  const want = hexToOklab('#3d7fb8')
  for (let k = 0; k < 3; k++) near(u.target[6 + k], want[k], 1e-6)
  for (let k = 0; k < 3; k++) near(u.accent[k], want[k], 1e-6)
})

test('a hue shift of 8 turns the region exactly 8°', () => {
  const shift = [
    [8, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  const u = paletteUniforms(app('origin', shift), CLUSTERS)
  near(
    angleBetween(hue(u.source[1], u.source[2]), hue(u.target[1], u.target[2])),
    8,
    1e-6
  )
  near(Math.hypot(u.target[1], u.target[2]), Math.hypot(0.12, 0.08), 1e-6)
  near(u.target[0], 0.7, 1e-6)
})

test('saturation and lightness shifts scale chroma and lift L', () => {
  const shift = [
    [0, 10, -6],
    [0, 0, 0],
    [0, 0, 0],
  ]
  const u = paletteUniforms(app('origin', shift), CLUSTERS)
  near(Math.hypot(u.target[1], u.target[2]), 1.1 * Math.hypot(0.12, 0.08), 1e-6)
  near(u.target[0], 0.64, 1e-6)
})

test('invert turns every region 180° and says so', () => {
  const u = paletteUniforms(app('invert'), CLUSTERS)
  assert.equal(u.effect, 2)
  for (let i = 0; i < 3; i++)
    near(
      Math.abs(
        angleBetween(
          hue(u.source[i * 3 + 1], u.source[i * 3 + 2]),
          hue(u.target[i * 3 + 1], u.target[i * 3 + 2])
        )
      ),
      180,
      1e-6
    )
})

test('gold is metal', () => {
  assert.equal(paletteUniforms(app('gold'), CLUSTERS).effect, 1)
})

test('dark and light tones come from the main region', () => {
  const u = paletteUniforms(app('origin'), CLUSTERS)
  near(u.dark[0], 0.52, 1e-6)
  near(u.light[0], 0.85, 1e-6)
  near(u.dark[1], 0.12, 1e-6)
  const bright = paletteUniforms(app('origin'), [
    { lab: [0.95, 0, 0], share: 1 },
  ])
  assert.equal(bright.count, 1)
  near(bright.light[0], 1, 1e-9)
  // fewer regions than three: the accent is the last one
  near(bright.accent[0], 0.95, 1e-6)
})

test('no regions: nothing to swap', () => {
  const u = paletteUniforms(app('ember'), [])
  assert.equal(u.count, 0)
  assert.equal(u.source.length, 9)
})
