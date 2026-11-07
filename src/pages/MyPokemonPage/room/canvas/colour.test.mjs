import assert from 'node:assert/strict'
import test from 'node:test'
import { hexToOklab, oklabToRgb, paletteUniforms } from './colour.mjs'
import { PALETTES } from '../../../BagPage/individuals/palettes.mjs'

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
const app = (palette, shift = ZERO) => ({ v: 3, palette, shift, marks: null })
const chroma = (lab) => Math.hypot(lab[1], lab[2])
const hueOf = (lab) => hue(lab[1], lab[2])
const at = (u, i) => Array.from(u.target.subarray(i * 3, i * 3 + 3))
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])

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

test('ramp swap: main takes P0, an unrelated region takes P1 within reach', () => {
  // sky: P0 #5fa8e8 (light, reach .2), P1 #e6f3ff
  const u = paletteUniforms(app('sky'), CLUSTERS)
  const p0 = hexToOklab('#5fa8e8')
  const p1 = hexToOklab('#e6f3ff')
  const main = at(u, 0)
  near(main[0], Math.min(0.9, Math.max(0.5, p0[0])), 1e-6, 'main L')
  near(chroma(main), chroma(p0), 1e-6, 'main C')
  near(angleBetween(hueOf(p0), hueOf(main)), 0, 1e-4, 'main hue')
  // region 1 (L .85, other hue) and region 2 (L .4): the second colour,
  // its L kept within .2 of the region's own
  near(at(u, 1)[0], Math.min(1.05, Math.max(0.65, p1[0])), 1e-6)
  near(at(u, 2)[0], 0.6, 1e-6, 'region 2 lifted at most .2')
  near(chroma(at(u, 2)), chroma(p1), 1e-6)
})

test('ramp swap: a shade of the main keeps its step, a dim region stays dim', () => {
  const clusters = [
    CLUSTERS[0],
    { lab: [0.5, 0.06, 0.04], share: 0.3 }, // main hue, darker
    { lab: [0.3, 0.01, 0.01], share: 0.2 }, // dim outline-ish
  ]
  const u = paletteUniforms(app('sky'), clusters)
  const main = at(u, 0)
  const shade = at(u, 1)
  near(shade[0], main[0] - 0.2, 1e-6, 'same ΔL below the main')
  near(chroma(shade), chroma(main) / 2, 1e-6, 'chroma in proportion')
  near(angleBetween(hueOf(main), hueOf(shade)), 0, 1e-4)
  const dim = at(u, 2)
  near(dim[0], 0.3, 1e-6, 'own L')
  near(chroma(dim), Math.min(0.04, chroma(main)), 1e-6)
  near(angleBetween(hueOf(main), hueOf(dim)), 0, 1e-4)
})

test('ramp swap: a dark P0 reaches .4 and keeps some chroma', () => {
  // midnight #232a52: L < .45
  const p0 = hexToOklab('#232a52')
  assert.ok(p0[0] < 0.45)
  const pale = [{ lab: [0.85, 0.1, 0.06], share: 1 }]
  const u = paletteUniforms(app('midnight'), pale)
  near(at(u, 0)[0], 0.45, 1e-6, 'no darker than srcL − .4')
  near(chroma(at(u, 0)), Math.max(0.06, chroma(p0)), 1e-6)
})

test('the shift applies after the ramp', () => {
  const shift = [
    [0, 0, -6],
    [0, 0, 0],
    [0, 0, 0],
  ]
  const plain = paletteUniforms(app('sky'), CLUSTERS)
  const moved = paletteUniforms(app('sky', shift), CLUSTERS)
  near(moved.target[0], plain.target[0] - 0.06, 1e-6)
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

test('mark tones: dark and light move away from the main, accent stands out', () => {
  const u = paletteUniforms(app('origin'), CLUSTERS)
  near(u.dark[0], 0.4, 1e-6, 'a light main gets a darker tone')
  near(u.dark[1], 0.12 * 1.3, 1e-6)
  near(u.light[0], 0.95, 1e-6, 'a mid main gets a lighter scar')
  near(u.light[1], 0.12 * 0.3, 1e-6)
  const deep = paletteUniforms(app('origin'), [{ lab: [0.4, 0.05, 0], share: 1 }])
  near(deep.dark[0], 0.1, 1e-6, 'a dark main still gets a darker tone (the rim stays dark)')
  near(deep.light[0], 0.65, 1e-6)
  const night = paletteUniforms(app('origin'), [{ lab: [0.2, 0.05, 0], share: 1 }])
  near(night.dark[0], 0.5, 1e-6, 'a near-black main: no darker room, lighter')
  near(night.light[0], 0.75, 1e-6, 'and the scar further still')
  const bright = paletteUniforms(app('origin'), [{ lab: [0.95, 0, 0], share: 1 }])
  assert.equal(bright.count, 1)
  near(bright.light[0], 0.73, 1e-6, 'a pale main gets a darker scar')
  near(bright.dark[0], 0.53, 1e-6, 'and a dark tone well below it')
  // origin has no accent colour: the complement of the main
  const a = Array.from(u.accent)
  near(Math.abs(angleBetween(hue(0.12, 0.08), hueOf(a))), 180, 1e-4)
  near(chroma(a), Math.max(0.1, Math.hypot(0.12, 0.08)), 1e-6)
  near(a[0], 0.45, 1e-6, '.25 away from the main')
})

test('a palette accent is used as is unless it is too close to the main', () => {
  const u = paletteUniforms(app('sky'), CLUSTERS)
  const want = hexToOklab('#f4b942')
  for (let k = 0; k < 3; k++) near(u.accent[k], want[k], 1e-6)
})

test('every palette on light, mid and dark mains keeps the tones readable', () => {
  const mains = [0.2, 0.45, 0.6, 0.75, 0.95].map((L) => [
    { lab: [L, 0.08, 0.05], share: 0.6 },
    { lab: [Math.min(0.98, L + 0.15), -0.02, 0.06], share: 0.3 },
    { lab: [0.3, 0.01, 0], share: 0.1 },
  ])
  const shifts = [
    ZERO,
    [
      [8, 10, 6],
      [-8, -10, -6],
      [0, 0, 0],
    ],
  ]
  for (const p of PALETTES)
    for (const clusters of mains)
      for (const shift of shifts) {
        const u = paletteUniforms(app(p.key, shift), clusters)
        const main = at(u, 0)
        const tag = `${p.key} L${clusters[0].lab[0]}`
        assert.ok(Math.abs(u.dark[0] - main[0]) >= 0.25 - 1e-9, `dark ${tag}`)
        assert.ok(Math.abs(u.light[0] - main[0]) >= 0.2 - 1e-9, `scar ${tag}`)
        assert.ok(dist(Array.from(u.accent), main) >= 0.15 - 1e-9, `accent ${tag}`)
        assert.ok(Math.abs(u.dark[0] - u.light[0]) >= 0.15 - 1e-9, `dark vs scar ${tag}`)
        if (main[0] >= 0.3) assert.ok(u.dark[0] < main[0], `dark rim below ${tag}`)
        for (const v of [...u.target, ...u.dark, ...u.light, ...u.accent])
          assert.ok(Number.isFinite(v), tag)
      }
})

test('no regions: nothing to swap', () => {
  const u = paletteUniforms(app('ember'), [])
  assert.equal(u.count, 0)
  assert.equal(u.source.length, 9)
})
