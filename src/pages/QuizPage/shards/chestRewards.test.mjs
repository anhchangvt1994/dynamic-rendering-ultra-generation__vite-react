import assert from 'node:assert/strict'
import test from 'node:test'
import catalog from './catalog.json' with { type: 'json' }
import { drawChestShards, isRare, completeCatalog } from './chestRewards.mjs'
const entries = catalog.species
const entropy = (countRoll, rolls = [0, 0, 0], groupRoll = 0) => ({
  countRoll,
  pieces: rolls.map((speciesRoll) => ({ speciesRoll, groupRoll })),
})
const total = (rows) => rows.reduce((n, row) => n + row.count, 0)

test('each count interval has width one quarter', () => {
  for (const [roll, n] of [
    [0, 0],
    [0.249999, 0],
    [0.25, 1],
    [0.5, 2],
    [0.75, 3],
    [0.999999, 3],
  ])
    assert.equal(total(drawChestShards('combo', entries, entropy(roll))), n)
})
test('rare membership is inclusive OR, and 70 percent boundary is exclusive', () => {
  assert.equal(isRare({ captureRate: 45 }), true)
  assert.equal(isRare({ captureRate: 46 }), false)
  assert.equal(isRare({ captureRate: 255, legendary: true }), true)
  assert.equal(isRare({ captureRate: 255, mythical: true }), true)
  for (const [roll, rare] of [
    [0.699999, true],
    [0.7, false],
  ]) {
    const [row] = drawChestShards(
      'special',
      entries,
      entropy(0.25, [0, 0, 0], roll)
    )
    assert.equal(isRare(entries.find((e) => e.id === row.speciesId)), rare)
  }
})
test('independent picks aggregate repeats and ignore catalog order', () => {
  const e = entropy(0.75, [0, 0.5, 0.999999])
  const rows = drawChestShards('combo', entries, e)
  assert.equal(rows.length, 3)
  assert.equal(rows[0].speciesId, Math.min(...entries.map((e) => e.id)))
  assert.equal(rows[2].speciesId, Math.max(...entries.map((e) => e.id)))
  assert.deepEqual(drawChestShards('combo', [...entries].reverse(), e), rows)
  assert.deepEqual(drawChestShards('combo', entries, entropy(0.75)), [
    { speciesId: rows[0].speciesId, count: 3 },
  ])
  assert.deepEqual(
    drawChestShards('combo', entries, entropy(0.75, [0, 0.5, 0.999999], 0.9)),
    rows
  )
})
test('incomplete catalog and invalid entropy never masquerade as zero', () => {
  assert.equal(completeCatalog(entries), true)
  for (const bad of [[], entries.slice(1), [...entries.slice(1), entries[1]]]) {
    assert.equal(completeCatalog(bad), false)
    assert.throws(
      () => drawChestShards('combo', bad, entropy(0)),
      /catalog_unavailable/
    )
  }
  for (const roll of [-1, 1, NaN])
    assert.throws(() => drawChestShards('combo', entries, entropy(roll)))
  assert.throws(() => drawChestShards('other', entries, entropy(0)))
})
