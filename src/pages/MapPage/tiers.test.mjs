import test from 'node:test'
import assert from 'node:assert/strict'
import { META, metaOf } from './data/species-meta.mjs'
import { WEIGHTS, PSEUDO, tierOf } from './tiers.mjs'

test('tier of well-known species', () => {
  assert.equal(tierOf(25), 'common')
  assert.equal(tierOf(149), 'pseudo')
  assert.equal(tierOf(150), 'legendary')
  assert.equal(tierOf(151), 'mythical')
  assert.doesNotThrow(() => tierOf(1025))
})
test('unknown ids fall back to common', () => {
  assert.equal(tierOf(0), 'common')
  assert.equal(tierOf(2000), 'common')
})
test('weights match the spec', () => {
  assert.deepEqual(WEIGHTS, { common: 100, uncommon: 50, rare: 20, veryRare: 6, pseudo: 2, legendary: 0.4, mythical: 0.15 })
  assert.ok(PSEUDO.includes(445))
})
test('meta covers the whole dex', () => {
  assert.equal(META.length, 1025)
  for (const [i, [bst, capture]] of META.entries()) {
    assert.ok(bst > 0, `bst of #${i + 1}`)
    assert.ok(capture >= 3 && capture <= 255, `capture of #${i + 1}`)
  }
  assert.ok(META.filter((m) => m[2] === 1 || m[2] === 2).length >= 60)
  assert.equal(metaOf(0), null)
  assert.equal(metaOf(25).bst, 320)
})
