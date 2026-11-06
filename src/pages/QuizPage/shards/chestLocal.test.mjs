import assert from 'node:assert/strict'
import test from 'node:test'
import { createShardJournal, SHARD_KEY } from './local.mjs'
import catalog from './catalog.json' with { type: 'json' }
const id = '11111111-1111-4111-8111-111111111111'
const entropy = {
  countRoll: 0.75,
  pieces: Array.from({ length: 3 }, () => ({ groupRoll: 0, speciesRoll: 0 })),
}
const memory = () => {
  const m = new Map()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }
}
test('two chests survive replay and reload without double award', async () => {
  const storage = memory()
  let chain = Promise.resolve()
  const lock = (_, fn) => {
    const p = chain.then(fn)
    chain = p.catch(() => {})
    return p
  }
  const make = () =>
    createShardJournal({
      storage,
      lock,
      chestCatalog: async () => catalog.species,
    })
  const j = make()
  await j.recordLocalChestRewards(id, [
    { kind: 'combo', entropy },
    { kind: 'special', entropy },
  ])
  const [a, b] = await Promise.all([
    j.claimLocalChestShards(id, 'combo'),
    make().claimLocalChestShards(id, 'combo'),
  ])
  assert.deepEqual(a, b)
  await j.recordLocalChestRewards(id, [
    { kind: 'combo', entropy: { ...entropy, countRoll: 0 } },
  ])
  await j.reconcileLocalChestShards()
  const s = JSON.parse(storage.getItem(SHARD_KEY))
  assert.equal(s.balances[1], 6)
  assert.equal(Object.keys(s.chestEvents).length, 2)
  assert.equal(
    Object.values(s.balances).reduce((a, b) => a + b, 0),
    6
  )
})
test('missing catalog stays pending and saved entropy later settles once', async () => {
  const storage = memory()
  let entries = []
  const j = createShardJournal({
    storage,
    lock: (_, fn) => fn(),
    chestCatalog: async () => entries,
  })
  await j.recordLocalChestRewards(id, [{ kind: 'combo', entropy }])
  assert.equal((await j.claimLocalChestShards(id, 'combo')).state, 'pending')
  entries = catalog.species
  assert.equal((await j.claimLocalChestShards(id, 'combo')).shards[0].count, 3)
  assert.equal((await j.reconcileLocalChestShards()).length, 0)
})
