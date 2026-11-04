import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createShardJournal, SHARD_KEY } from './local.mjs'

const memory = () => {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    data,
  }
}
// a real mutex: callers queue like Web Locks do
const mutex = () => {
  let tail = Promise.resolve()
  return (name, fn) => {
    const run = tail.then(fn)
    tail = run.catch(() => {})
    return run
  }
}
const OP1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OP2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

test('craft is atomic, preserves excess, and replays an immutable receipt after reload', async () => {
  const storage = memory()
  storage.setItem(
    SHARD_KEY,
    JSON.stringify({
      version: 1,
      events: {},
      balances: { 150: 40 },
      extra: 'keep',
    })
  )
  const { journal } = make({ storage })
  const first = await journal.craftLocalCard(OP1, 150)
  assert.deepEqual(first, {
    operationId: OP1,
    speciesId: 150,
    spent: 19,
    shardCount: 21,
    cardCount: 1,
  })
  await journal.craftLocalCard(OP2, 150)
  assert.deepEqual(
    await make({ storage }).journal.craftLocalCard(OP1, 150),
    first
  )
  const state = JSON.parse(storage.getItem(SHARD_KEY))
  assert.equal(state.balances[150], 2)
  assert.equal(state.cards[150], 2)
  assert.equal(state.extra, 'keep')
  await assert.rejects(journal.craftLocalCard(OP1, 25), /operation_conflict/)
  await assert.rejects(journal.craftLocalCard('bad', 150), /invalid_operation/)
  await assert.rejects(journal.craftLocalCard(OP1, 0), /invalid_species/)
})
test('craft failure does not consume assets and exact balance removes zero row', async () => {
  const storage = memory()
  const seed = (count) =>
    storage.setItem(
      SHARD_KEY,
      JSON.stringify({ version: 1, events: {}, balances: { 150: count } })
    )
  seed(18)
  await assert.rejects(
    make({ storage }).journal.craftLocalCard(OP1, 150),
    /insufficient_shards/
  )
  seed(19)
  await assert.rejects(
    make({ storage, catalog: async () => undefined }).journal.craftLocalCard(
      OP1,
      150
    ),
    /missing_catalog/
  )
  const before = storage.getItem(SHARD_KEY)
  const broken = {
    getItem: storage.getItem,
    setItem: () => {
      throw Error('quota')
    },
  }
  await assert.rejects(
    make({ storage: broken }).journal.craftLocalCard(OP1, 150),
    /quota/
  )
  assert.equal(storage.getItem(SHARD_KEY), before)
  await make({ storage }).journal.craftLocalCard(OP1, 150)
  assert.equal(JSON.parse(storage.getItem(SHARD_KEY)).balances[150], undefined)
})
test('competing crafts and quiz claim share a mutex without dropping cards or events', async () => {
  const storage = memory()
  storage.setItem(
    SHARD_KEY,
    JSON.stringify({ version: 1, events: {}, balances: { 150: 19 } })
  )
  const { journal } = make({ storage })
  const results = await Promise.allSettled([
    journal.craftLocalCard(OP1, 150),
    journal.craftLocalCard(OP2, 150),
  ])
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
  await journal.recordLocalOutcome(round('after-craft'), 'right')
  await journal.claimLocalShard('after-craft')
  assert.equal(JSON.parse(storage.getItem(SHARD_KEY)).cards[150], 1)
  storage.setItem(
    SHARD_KEY,
    JSON.stringify({
      ...JSON.parse(storage.getItem(SHARD_KEY)),
      balances: { 150: 19 },
    })
  )
  await journal.recordLocalOutcome(round('race'), 'right')
  await Promise.all([
    journal.craftLocalCard(OP2, 150),
    journal.claimLocalShard('race'),
  ])
  const state = JSON.parse(storage.getItem(SHARD_KEY))
  assert.equal(state.cards[150], 2)
  assert.equal(state.balances[150], 1)
  assert.equal(state.events.race.state, 'awarded')
})

const MEWTWO = {
  captureRate: 3,
  powerLevel: 8,
  legendary: true,
  mythical: false,
} // 19 shards, 15%
const catalog =
  (rows = { 150: MEWTWO }) =>
  async (version, id) =>
    version === 1 ? rows[id] : undefined
const round = (id, extra = {}) => ({
  id,
  answerId: 150,
  shardRuleVersion: 1,
  shardCatalogVersion: 1,
  shardRoll: 0.1,
  ...extra,
})
const make = (o = {}) => {
  const storage = o.storage ?? memory()
  return {
    storage,
    journal: createShardJournal({
      storage,
      lock: o.lock ?? mutex(),
      catalog: o.catalog ?? catalog(),
    }),
  }
}

test('a right answer under the drop is awarded once; retry and reload give the same receipt', async () => {
  const { storage, journal } = make()
  assert.equal(
    (await journal.recordLocalOutcome(round('r1'), 'right')).state,
    'pending'
  )
  const first = await journal.claimLocalShard('r1')
  assert.deepEqual(
    { ...first, drop: undefined },
    {
      roundId: 'r1',
      speciesId: 150,
      state: 'awarded',
      count: 1,
      required: 19,
      drop: undefined,
    }
  )
  assert.ok(Math.abs(first.drop - 0.15) < 0.001)
  assert.deepEqual(await journal.claimLocalShard('r1'), first)
  const reloaded = createShardJournal({
    storage,
    lock: mutex(),
    catalog: catalog(),
  })
  assert.deepEqual(await reloaded.claimLocalShard('r1'), first)
  assert.equal(JSON.parse(storage.getItem(SHARD_KEY)).balances[150], 1)
})
test('a roll at or above the drop is not awarded', async () => {
  const { journal } = make()
  await journal.recordLocalOutcome(round('r1', { shardRoll: 0.9 }), 'right')
  const receipt = await journal.claimLocalShard('r1')
  assert.equal(receipt.state, 'not_awarded')
  assert.equal(receipt.count, 0)
})
test('wrong, time and rounds from before the feature are ineligible and store nothing extra', async () => {
  const { storage, journal } = make()
  for (const outcome of ['wrong', 'time']) {
    assert.equal(
      (await journal.recordLocalOutcome(round(outcome), outcome)).state,
      'ineligible'
    )
    assert.equal((await journal.claimLocalShard(outcome)).state, 'ineligible')
  }
  const old = await journal.recordLocalOutcome(
    { id: 'old', answerId: 150 },
    'right'
  )
  assert.equal(old.state, 'ineligible')
  assert.equal(JSON.parse(storage.getItem(SHARD_KEY)).events.old, undefined)
  assert.deepEqual(JSON.parse(storage.getItem(SHARD_KEY)).balances, {})
})
test('the first verdict of a round is the only one', async () => {
  const { journal } = make()
  await journal.recordLocalOutcome(round('r1'), 'wrong')
  assert.equal(
    (await journal.recordLocalOutcome(round('r1'), 'right')).state,
    'ineligible'
  )
  assert.equal((await journal.claimLocalShard('r1')).state, 'ineligible')
})
test('a missing catalog entry leaves the event pending with its roll; a later catalog settles it', async () => {
  const storage = memory()
  const early = make({ storage, catalog: catalog({}) }).journal
  await early.recordLocalOutcome(round('r1'), 'right')
  assert.equal((await early.claimLocalShard('r1')).state, 'pending')
  assert.equal(JSON.parse(storage.getItem(SHARD_KEY)).events.r1.roll, 0.1)
  const late = make({ storage }).journal
  assert.equal((await late.claimLocalShard('r1')).state, 'awarded')
})
test('a failed storage write is an error, never a success receipt, and the retry works', async () => {
  const storage = memory()
  const { journal } = make({ storage })
  await journal.recordLocalOutcome(round('r1'), 'right')
  const set = storage.setItem
  storage.setItem = () => {
    throw new Error('quota')
  }
  await assert.rejects(() => journal.claimLocalShard('r1'), /quota/)
  storage.setItem = set
  assert.deepEqual(JSON.parse(storage.getItem(SHARD_KEY)).balances, {})
  assert.equal((await journal.claimLocalShard('r1')).count, 1)
})
test('two tabs claiming at once add one shard', async () => {
  const storage = memory()
  const lock = mutex()
  const a = make({ storage, lock }).journal
  const b = make({ storage, lock }).journal
  await a.recordLocalOutcome(round('r1'), 'right')
  const [x, y] = await Promise.all([
    a.claimLocalShard('r1'),
    b.claimLocalShard('r1'),
  ])
  assert.deepEqual(x, y)
  assert.equal(JSON.parse(storage.getItem(SHARD_KEY)).balances[150], 1)
})
test('without Web Locks it reports unavailable instead of claiming cross-tab safety', async () => {
  const journal = createShardJournal({
    storage: memory(),
    lock: undefined,
    catalog: catalog(),
  })
  await assert.rejects(() => journal.recordLocalOutcome(round('r1'), 'right'), {
    code: 'locks_unavailable',
  })
})
test('a corrupt snapshot is an error, never an empty journal', async () => {
  const storage = memory()
  storage.setItem(SHARD_KEY, '{nope')
  const { journal } = make({ storage })
  await assert.rejects(() => journal.recordLocalOutcome(round('r1'), 'right'), {
    code: 'journal_corrupt',
  })
  assert.equal(storage.getItem(SHARD_KEY), '{nope')
})
test('claiming a round the journal never saw is an error', async () => {
  const { journal } = make()
  await assert.rejects(() => journal.claimLocalShard('nope'), {
    code: 'no_round',
  })
})
