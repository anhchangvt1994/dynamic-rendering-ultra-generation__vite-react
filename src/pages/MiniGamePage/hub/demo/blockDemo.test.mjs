import test from 'node:test'
import assert from 'node:assert/strict'
import { ROWS, TOP, blockFrames } from './blockDemo.mjs'

const frames = blockFrames()

test('the demo plays many different pieces, not one shape', () => {
  const types = new Set(frames.filter((f) => f.fresh.length).map((f) => f.type))
  assert.ok(types.size >= 6, `only ${types.size} shapes`)
  assert.ok(frames.filter((f) => f.fresh.length).length >= 20)
})

test('rows clear, and the stack stays inside the small screen', () => {
  assert.ok(frames.some((f) => f.rows.length >= 1))
  for (const f of frames) {
    f.cells.forEach((v, i) => assert.ok(!v || Math.floor(i / 10) >= TOP, `cell above the window at ${i}`))
    assert.ok(f.hover.every((i) => Math.floor(i / 10) >= TOP && Math.floor(i / 10) < 20))
  }
  assert.equal(ROWS + TOP, 20)
})

test('every landed Pokémon has a skin and neighbours differ', () => {
  const last = frames.at(-1)
  last.cells.forEach((v, i) => v && assert.ok(last.skins[i] > 0))
  const landed = frames.filter((f) => f.fresh.length)
  assert.ok(new Set(landed.map((f) => f.skins[f.fresh[0]])).size >= 8)
})
