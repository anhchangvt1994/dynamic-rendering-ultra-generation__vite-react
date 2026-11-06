import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createShardJournal, SHARD_KEY } from '../../QuizPage/shards/local.mjs'
import { individualTraits } from './traits.mjs'

const memory = () => {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    data,
  }
}
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
let n = 0
const ids = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
const seed = (cards, extra = {}) => {
  const storage = memory()
  storage.setItem(
    SHARD_KEY,
    JSON.stringify({
      version: 1,
      events: {},
      balances: { 10: 2 },
      cards,
      keep: 'me',
      ...extra,
    })
  )
  return storage
}
const make = (storage, o = {}) =>
  createShardJournal({
    storage,
    lock: o.lock ?? mutex(),
    randomUUID: o.randomUUID ?? ids,
  })
const read = (storage) => JSON.parse(storage.getItem(SHARD_KEY))

test('a trade spends one card, makes one individual with the traits of its id, keeps the rest', async () => {
  const storage = seed({ 25: 2 })
  const receipt = await make(storage).tradeLocalCard(OP1, 25)
  const snap = read(storage)
  assert.equal(snap.cards[25], 1)
  assert.equal(receipt.cardCount, 1)
  assert.equal(Object.keys(snap.individuals).length, 1)
  const mine = snap.individuals[receipt.individualId]
  assert.equal(mine.speciesId, 25)
  assert.equal(mine.nickname, null)
  assert.deepEqual(receipt.traits, await individualTraits(receipt.individualId))
  assert.equal(mine.personality, receipt.traits.personality)
  assert.deepEqual(snap.trades[OP1], receipt)
  assert.deepEqual(snap.balances, { 10: 2 })
  assert.equal(snap.keep, 'me')
})
test('the last card removes its row', async () => {
  const storage = seed({ 25: 1 })
  await make(storage).tradeLocalCard(OP1, 25)
  assert.equal(read(storage).cards[25], undefined)
})
test('replay returns the stored receipt, also after reload, and trades nothing twice', async () => {
  const storage = seed({ 25: 2 })
  const first = await make(storage).tradeLocalCard(OP1, 25)
  assert.deepEqual(await make(storage).tradeLocalCard(OP1, 25), first)
  assert.equal(read(storage).cards[25], 1)
  assert.equal(Object.keys(read(storage).individuals).length, 1)
})
test('terminal refusals change nothing', async () => {
  const storage = seed({ 25: 1 })
  const journal = make(storage)
  await journal.tradeLocalCard(OP1, 25)
  const before = storage.getItem(SHARD_KEY)
  await assert.rejects(journal.tradeLocalCard(OP1, 10), /operation_conflict/)
  await assert.rejects(journal.tradeLocalCard(OP2, 25), /insufficient_cards/)
  await assert.rejects(journal.tradeLocalCard('bad', 25), /invalid_operation/)
  await assert.rejects(journal.tradeLocalCard(OP2, 0), /invalid_species/)
  assert.equal(storage.getItem(SHARD_KEY), before)
})
test('two trades for one card through the lock: one succeeds', async () => {
  const storage = seed({ 25: 1 })
  const journal = make(storage)
  const results = await Promise.allSettled([
    journal.tradeLocalCard(OP1, 25),
    journal.tradeLocalCard(OP2, 25),
  ])
  assert.deepEqual(results.map((r) => r.status).sort(), [
    'fulfilled',
    'rejected',
  ])
  assert.equal(Object.keys(read(storage).individuals).length, 1)
})
test('a failed save leaves the snapshot as it was', async () => {
  const storage = seed({ 25: 1 })
  const before = storage.getItem(SHARD_KEY)
  const broken = {
    ...storage,
    getItem: storage.getItem,
    setItem: () => {
      throw Error('quota')
    },
  }
  await assert.rejects(make(broken).tradeLocalCard(OP1, 25), /quota/)
  assert.equal(storage.getItem(SHARD_KEY), before)
  await make(storage).tradeLocalCard(OP1, 25)
})
test('corrupt individuals or trades maps are journal_corrupt, not empty', async () => {
  for (const extra of [
    { individuals: [] },
    { trades: 'x' },
    { individuals: { nope: {} } },
    { trades: { [OP1]: { operationId: OP2 } } },
  ]) {
    const storage = seed({ 25: 1 }, extra)
    await assert.rejects(
      make(storage).tradeLocalCard(OP2, 25),
      /journal_corrupt/
    )
    await assert.rejects(
      make(storage).listLocalIndividuals(),
      /journal_corrupt/
    )
  }
})
test('naming: normalised, idempotent, cleared, refused, unknown id', async () => {
  const storage = seed({ 25: 2 })
  const journal = make(storage)
  const { individualId } = await journal.tradeLocalCard(OP1, 25)
  assert.deepEqual(
    await journal.nameLocalIndividual(individualId, '  Pika   Chu '),
    {
      individualId,
      nickname: 'Pika Chu',
    }
  )
  assert.equal(
    (await journal.nameLocalIndividual(individualId, 'Pika Chu')).nickname,
    'Pika Chu'
  )
  await assert.rejects(
    journal.nameLocalIndividual(individualId, 'a​b'),
    /invalid_nickname/
  )
  await assert.rejects(
    journal.nameLocalIndividual(individualId, 'x'.repeat(17)),
    /invalid_nickname/
  )
  assert.equal(read(storage).individuals[individualId].nickname, 'Pika Chu')
  assert.equal(
    (await journal.nameLocalIndividual(individualId, '  ')).nickname,
    null
  )
  await assert.rejects(journal.nameLocalIndividual(ids(), 'x'), /not_found/)
  await assert.rejects(journal.nameLocalIndividual('bad', 'x'), /not_found/)
})
test('list: newest first, filtered by species', async () => {
  const storage = seed({ 25: 2, 10: 1 })
  let t = 0
  const journal = createShardJournal({
    storage,
    lock: mutex(),
    randomUUID: ids,
    now: () => new Date(Date.UTC(2026, 10, 4, 0, 0, ++t)),
  })
  const a = await journal.tradeLocalCard(OP1, 25)
  await journal.tradeLocalCard(OP2, 10)
  const c = await journal.tradeLocalCard(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    25
  )
  assert.deepEqual(
    (await journal.listLocalIndividuals(25)).map((i) => i.id),
    [c.individualId, a.individualId]
  )
  assert.equal((await journal.listLocalIndividuals()).length, 3)
  const first = (await journal.listLocalIndividuals(25))[0]
  assert.deepEqual(Object.keys(first).sort(), [
    'appearance',
    'createdAt',
    'id',
    'nickname',
    'personality',
    'potential',
    'speciesId',
  ])
})

test('a v1 individual in the snapshot is upgraded on the first read, once', async () => {
  const id = '9e3779b1-0000-4000-8000-000000000001'
  const op = 'f0f0f0f0-0000-4000-8000-0000000000f2'
  const old = { v: 1, hue: 5, sat: 0, light: 0, mark: null }
  const fresh = await individualTraits(id)
  const one = {
    id,
    speciesId: 25,
    nickname: null,
    personality: fresh.personality,
    appearance: old,
    potential: fresh.potential,
    createdAt: '2026-11-04T00:00:00.000Z',
  }
  const storage = seed(
    {},
    {
      individuals: { [id]: one },
      trades: {
        [op]: {
          operationId: op,
          speciesId: 25,
          individualId: id,
          cardCount: 0,
          traits: { ...fresh, appearance: old },
        },
      },
    }
  )
  let writes = 0
  const setItem = storage.setItem
  storage.setItem = (k, v) => {
    writes++
    setItem(k, v)
  }
  const journal = createShardJournal({ storage, lock: mutex() })
  const [got] = await journal.listLocalIndividuals()
  assert.deepEqual(got.appearance, fresh.appearance)
  const stored = JSON.parse(storage.getItem(SHARD_KEY))
  assert.deepEqual(stored.individuals[id].appearance, fresh.appearance)
  assert.deepEqual(stored.trades[op].traits.appearance, fresh.appearance)
  assert.equal(stored.keep, 'me')
  assert.equal(writes, 1)
  await journal.listLocalIndividuals()
  assert.deepEqual((await journal.tradeLocalCard(op, 25)).traits, fresh)
  assert.equal(writes, 1, 'no second write')
})
test('a v1 snapshot is upgraded by a trade too', async () => {
  const id = '9e3779b1-0000-4000-8000-000000000002'
  const fresh = await individualTraits(id)
  const storage = seed(
    { 25: 1 },
    {
      individuals: {
        [id]: {
          id,
          speciesId: 25,
          nickname: null,
          personality: fresh.personality,
          appearance: { v: 1, hue: -4, sat: 0, light: 0, mark: null },
          potential: fresh.potential,
          createdAt: '2026-11-04T00:00:00.000Z',
        },
      },
    }
  )
  const journal = createShardJournal({
    storage,
    lock: mutex(),
    randomUUID: ids,
  })
  await journal.tradeLocalCard(OP1, 25)
  const stored = JSON.parse(storage.getItem(SHARD_KEY))
  assert.deepEqual(stored.individuals[id].appearance, fresh.appearance)
})
