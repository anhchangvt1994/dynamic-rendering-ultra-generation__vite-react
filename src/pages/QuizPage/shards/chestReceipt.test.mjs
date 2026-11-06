import assert from 'node:assert/strict'
import test from 'node:test'
import { parseChestReceipt } from './chestReceipt.mjs'
const base = {
  roundId: '11111111-1111-4111-8111-111111111111',
  kind: 'combo',
  state: 'awarded',
  shards: [],
}
test('empty awarded and pending are distinct receipts', () => {
  assert.deepEqual(parseChestReceipt(base), base)
  assert.equal(
    parseChestReceipt({ ...base, roundId: 'local-1000000-25' }).roundId,
    'local-1000000-25'
  )
  const pending = { ...base, state: 'pending' }
  assert.equal(parseChestReceipt(pending).state, 'pending')
  assert.deepEqual(
    parseChestReceipt({ ...base, shards: [{ speciesId: 25, count: 3 }] })
      .shards,
    [{ speciesId: 25, count: 3 }]
  )
})
test('malformed and oversized receipts fail closed', () => {
  for (const bad of [
    null,
    {},
    { ...base, kind: 'other' },
    { ...base, roundId: 'bad' },
    { ...base, state: 'lost' },
    { ...base, shards: [{ speciesId: 0, count: 1 }] },
    { ...base, shards: [{ speciesId: 25, count: 4 }] },
    { ...base, shards: [{ speciesId: 25, count: 0 }] },
    { ...base, shards: [{ speciesId: 25, count: 1.5 }] },
    {
      ...base,
      shards: [
        { speciesId: 25, count: 2 },
        { speciesId: 26, count: 2 },
      ],
    },
    {
      ...base,
      shards: [
        { speciesId: 25, count: 1 },
        { speciesId: 25, count: 1 },
      ],
    },
    { ...base, state: 'pending', shards: [{ speciesId: 25, count: 1 }] },
  ])
    assert.throws(() => parseChestReceipt(bad))
})
