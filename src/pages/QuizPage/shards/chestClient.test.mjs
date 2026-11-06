import assert from 'node:assert/strict'
import test from 'node:test'
import { startChestClaim } from './chestClient.mjs'
const receipt = {
  roundId: 'local-1000-25',
  kind: 'combo',
  state: 'pending',
  shards: [],
}
test('cancelled session never emits its delayed receipt', async () => {
  let resolve
  const pending = new Promise((r) => {
    resolve = r
  })
  const seen = []
  const cancel = startChestClaim(
    { claimChestShards: () => pending },
    receipt.roundId,
    'combo',
    (v) => seen.push(v)
  )
  cancel()
  resolve(receipt)
  await pending
  await Promise.resolve()
  assert.equal(seen.filter((v) => v.receipt).length, 0)
})
test('pending receipt remains pending, not an empty award', async () => {
  const seen = []
  startChestClaim(
    {
      claimChestShards: async (id, kind) => {
        assert.equal(id, receipt.roundId)
        assert.equal(kind, 'combo')
        return receipt
      },
    },
    receipt.roundId,
    'combo',
    (v) => seen.push(v)
  )
  await new Promise((r) => setImmediate(r))
  assert.equal(seen.at(-1).receipt.state, 'pending')
})
