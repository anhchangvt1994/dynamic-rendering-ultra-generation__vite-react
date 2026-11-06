import test from 'node:test'
import assert from 'node:assert/strict'
import { alphaCenter, measureArtCenter } from './artCenter.mjs'

const SIZE = 100
function paint(box) {
  const alpha = new Uint8Array(SIZE * SIZE)
  for (let y = box.y0; y < box.y1; y++)
    for (let x = box.x0; x < box.x1; x++) alpha[y * SIZE + x] = 255
  return alpha
}

test('a centred block needs no shift', () => {
  const { x, y } = measureArtCenter(
    paint({ x0: 30, x1: 70, y0: 20, y1: 80 }),
    SIZE
  )
  assert.ok(Math.abs(x) < 0.01 && Math.abs(y) < 0.01)
})

test('a block standing right of the canvas reports a positive x offset', () => {
  const { x } = measureArtCenter(
    paint({ x0: 40, x1: 80, y0: 30, y1: 70 }),
    SIZE
  )
  assert.ok(Math.abs(x - 0.1) < 0.02, `x=${x}`)
})

test('soft shadow pixels below the threshold are ignored', () => {
  const alpha = paint({ x0: 30, x1: 70, y0: 30, y1: 70 })
  for (let i = 0; i < alpha.length; i++) if (!alpha[i]) alpha[i] = 10
  const { x, y } = measureArtCenter(alpha, SIZE)
  assert.ok(Math.abs(x) < 0.01 && Math.abs(y) < 0.01)
})

test('a thin tail pulls the centre only a little (box mostly, mass a bit)', () => {
  const alpha = paint({ x0: 20, x1: 50, y0: 30, y1: 70 })
  for (let y = 48; y < 52; y++)
    for (let x = 50; x < 90; x++) alpha[y * SIZE + x] = 255
  const c = alphaCenter(alpha, SIZE, SIZE)
  // box midpoint 55, centre of mass ~42: the blend stays nearer the box
  assert.ok(c.x > 48 && c.x < 55, `x=${c.x}`)
  assert.equal(c.width, 70)
})

test('empty art gives zero', () => {
  assert.deepEqual(measureArtCenter(new Uint8Array(SIZE * SIZE), SIZE), {
    x: 0,
    y: 0,
  })
  assert.equal(alphaCenter(new Uint8Array(SIZE * SIZE), SIZE, SIZE), null)
})

test('a few swinging frames do not drag the centre', () => {
  const W = 60
  const frames = 30
  const alpha = new Uint8Array(W * W * frames)
  const box = (f, x0, x1, y0, y1) => {
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) alpha[f * W * W + y * W + x] = 255
  }
  for (let f = 0; f < frames; f++) box(f, 20, 40, 20, 40)
  box(2, 0, 60, 0, 60) // a burst
  box(5, 40, 60, 20, 40) // a swing to the side (replaces nothing: adds)
  const c = alphaCenter(alpha, W, W, frames)
  assert.ok(Math.abs(c.x - 30) < 1 && Math.abs(c.y - 30) < 1, `c=${c.x},${c.y}`)
  assert.equal(c.width, 20)
})
