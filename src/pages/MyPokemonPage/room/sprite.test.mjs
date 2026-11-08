import assert from 'node:assert/strict'
import test from 'node:test'
import { alphaBox, fitSprite, placeSprite, spriteFor } from './sprite.mjs'

const BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
const ART = (id) => `${BASE}/other/official-artwork/${id}.png`

test('our smoothed webp first, the pixel gif behind it', () => {
  assert.deepEqual(spriteFor(25), {
    src: '/api/image/25.webp',
    fallback: `${BASE}/other/showdown/25.gif`,
  })
})

test('past the showdown set the artwork is the fallback', () => {
  assert.equal(spriteFor(1011).src, '/api/image/1011.webp')
  assert.equal(spriteFor(1011).fallback, ART(1011))
})

test('pixel sprites grow by whole multiples', () => {
  assert.deepEqual(fitSprite(40, 40, 160), { width: 160, height: 160 })
  assert.deepEqual(fitSprite(96, 96, 160), { width: 96, height: 96 })
  assert.deepEqual(fitSprite(50, 30, 160), { width: 250, height: 150 })
})

const canvas = (w, h, filled) => {
  const data = new Uint8ClampedArray(w * h * 4)
  for (const [x, y, a = 255] of filled) data[(y * w + x) * 4 + 3] = a
  return data
}

test('alphaBox: the box round the visible pixels, faint ones ignored', () => {
  const data = canvas(10, 8, [
    [2, 5],
    [6, 1],
    [4, 7],
    [9, 0, 10],
  ])
  assert.deepEqual(alphaBox(data, 10, 8), { x: 2, y: 1, width: 5, height: 7 })
})

test('alphaBox: nothing visible gives null', () => {
  assert.equal(alphaBox(canvas(4, 4, [[1, 1, 5]]), 4, 4), null)
})

test('placeSprite: the visible body, not the picture, sits at the centre', () => {
  // a 96px gif whose body is a 30x40 block in the lower left
  const p = placeSprite({
    natural: { width: 96, height: 96 },
    content: { x: 10, y: 50, width: 30, height: 40 },
    box: 124,
    pixel: true,
    dpr: 1,
  })
  assert.equal(p.scale, 3)
  assert.deepEqual([p.width, p.height], [288, 288])
  // body centre (25, 70) * 3 = (75, 210); picture centre 144 → shift
  assert.deepEqual([p.x, p.y], [69, -66])
})

test('placeSprite: pixel scale snaps to whole device pixels, the nearest step, overshooting a third at most', () => {
  const at = (dpr, size = 1) =>
    placeSprite({
      natural: { width: 80, height: 80 },
      content: { x: 0, y: 0, width: 50, height: 50 },
      box: 124,
      size,
      pixel: true,
      dpr,
    }).scale
  // the body should be 124: 2x is 100, 2.5x is 125
  assert.equal(at(1), 2)
  assert.equal(at(2), 2.5)
  assert.equal(at(3), 7 / 3)
  // 2x would be 100 against 70: too far, so 1x
  assert.equal(
    placeSprite({
      natural: { width: 80, height: 80 },
      content: { x: 0, y: 0, width: 50, height: 50 },
      box: 70,
      pixel: true,
      dpr: 1,
    }).scale,
    1
  )
  // a big body on a 1x screen: 87px wanting 135 is nearer 2x (174) than 1x
  assert.equal(
    placeSprite({
      natural: { width: 87, height: 79 },
      content: { x: 0, y: 0, width: 87, height: 79 },
      box: 150,
      size: 0.9,
      pixel: true,
      dpr: 1,
    }).scale,
    2
  )
  assert.ok(at(3, 1.2) > at(3, 1) && at(3, 0.8) < at(3, 1))
  for (const dpr of [1, 2, 3])
    assert.equal(Number.isInteger(Math.round(at(dpr) * dpr * 1e9) / 1e9), true)
})

test('placeSprite: big artwork shrinks to fit, offsets land on device pixels', () => {
  const p = placeSprite({
    natural: { width: 475, height: 475 },
    content: { x: 40, y: 20, width: 380, height: 430 },
    box: 124,
    pixel: false,
    dpr: 2,
  })
  assert.ok(Math.abs(p.content.height - 124) < 1e-9)
  assert.equal(p.x * 2, Math.round(p.x * 2))
  assert.equal(p.y * 2, Math.round(p.y * 2))
})

test('placeSprite: no content box yet falls back to fitting the whole picture', () => {
  const p = placeSprite({
    natural: { width: 96, height: 96 },
    content: null,
    box: 160,
    pixel: true,
    dpr: 1,
  })
  assert.deepEqual([p.width, p.height, p.x, p.y], [96, 96, 0, 0])
})

test('placeSprite: a measured visual centre wins over the box midpoint', () => {
  const p = placeSprite({
    natural: { width: 100, height: 100 },
    content: { x: 10, y: 10, width: 40, height: 40, cx: 40, cy: 30 },
    box: 80,
    pixel: false,
    dpr: 1,
  })
  assert.equal(p.scale, 2)
  assert.equal(p.x, (50 - 40) * 2)
  assert.equal(p.y, (50 - 30) * 2)
})

test("placeSprite: a round frame fits the body's diagonal, not its box", () => {
  const p = placeSprite({
    natural: { width: 100, height: 100 },
    content: { x: 0, y: 0, width: 100, height: 100, cx: 50, cy: 50 },
    box: 200,
    round: true,
  })
  assert.ok(Math.abs(p.content.width - (200 * 1.08) / Math.SQRT2) < 1e-9)
})
