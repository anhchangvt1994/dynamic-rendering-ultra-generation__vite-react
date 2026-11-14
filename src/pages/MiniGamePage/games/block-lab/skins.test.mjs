import test from 'node:test'
import assert from 'node:assert/strict'
import { POOL, speciesFor } from './skins.mjs'

test('every piece wears a Pokémon from the pool, steady for a seed', () => {
  assert.ok(POOL.length >= 40 && POOL.every((id) => Number.isInteger(id) && id >= 1 && id <= 1025))
  assert.equal(speciesFor(25, 3), speciesFor(25, 3))
  assert.notDeepEqual(Array.from({ length: 20 }, (_, i) => speciesFor(25, i)), Array.from({ length: 20 }, (_, i) => speciesFor(133, i)))
})

test('the first pieces are varied and neighbours differ; the companion shows up', () => {
  const run = Array.from({ length: 20 }, (_, i) => speciesFor(25, i))
  assert.ok(new Set(run).size >= 10)
  for (let i = 1; i < run.length; i += 1) assert.notEqual(run[i], run[i - 1])
  assert.equal(run[0], 25)
  assert.equal(run[5], 25)
})
