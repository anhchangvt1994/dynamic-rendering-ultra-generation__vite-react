import assert from 'node:assert/strict'
import test from 'node:test'
import { toneOf } from './tone.mjs'

const one = (palette, shift = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]) => ({
  speciesId: 25,
  appearance: { v: 3, palette, shift, marks: null },
})

test('the same individual gives the same tone', () => {
  assert.deepEqual(toneOf(one('lavender')), toneOf(one('lavender')))
})

test('two palettes give two hues', () => {
  assert.notEqual(toneOf(one('lavender')).hue, toneOf(one('banana')).hue)
})

test('the shift moves the hue a little, never the palette', () => {
  const base = toneOf(one('lavender')).hue
  const moved = toneOf(one('lavender', [[10, 0, 0], [0, 0, 0], [0, 0, 0]])).hue
  assert.notEqual(base, moved)
  assert.ok(Math.abs(moved - base) < 30)
})

test('an unknown palette, a missing appearance or the origin fall back to the default', () => {
  const fallback = toneOf(one('origin'))
  assert.deepEqual(toneOf(one('no-such-palette')), fallback)
  assert.deepEqual(toneOf({ speciesId: 25 }), fallback)
  assert.deepEqual(toneOf(null), fallback)
  for (const key of ['accent', 'deep', 'glow']) assert.match(fallback[key], /^(#|hsl|rgb)/)
})
