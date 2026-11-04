import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SHARD_KEY } from '../QuizPage/shards/local.mjs'
import { createEpoch, loadShardRows, shardRows, toRow } from './shards.mjs'

const CATALOG = {
  25: {
    id: 25,
    name: 'pikachu',
    types: ['electric'],
    captureRate: 190,
    legendary: false,
    mythical: false,
    powerLevel: 2,
  },
  150: {
    id: 150,
    name: 'mewtwo',
    types: ['psychic'],
    captureRate: 3,
    legendary: true,
    mythical: false,
    powerLevel: 8,
  },
  10: {
    id: 10,
    name: 'caterpie',
    types: ['bug'],
    captureRate: 255,
    legendary: false,
    mythical: false,
    powerLevel: 0,
  },
}
const catalog = (id) => CATALOG[id]
const row = (speciesId, count, required) => ({
  speciesId,
  name: String(speciesId),
  count,
  required,
  drop: 0.5,
  types: [],
})
const fakeSupabase = ({
  shards,
  events,
  cards,
  failShards,
  failCards,
  failReconcile,
} = {}) => {
  const calls = []
  return {
    calls,
    rpc: async (name) => {
      calls.push(name)
      return failReconcile
        ? { data: null, error: { message: 'down' } }
        : { data: [], error: null }
    },
    from: (table) => {
      calls.push(`from:${table}`)
      const result = () =>
        table === 'pokemon_shards'
          ? failShards
            ? { data: null, error: { message: 'read failed' } }
            : { data: shards ?? [], error: null }
          : table === 'pokemon_cards'
            ? failCards
              ? { data: null, error: { message: 'cards failed' } }
              : { data: cards ?? [], error: null }
            : {
                data: table === 'pokemon_individuals' ? [] : (events ?? []),
                error: null,
              }
      return {
        select: () => ({
          ...Promise.resolve(result()),
          then: (a, b) => Promise.resolve(result()).then(a, b),
          eq: () => Promise.resolve(result()),
        }),
      }
    },
  }
}

test('ready species first, then progress, then species id; counts above required kept', () => {
  const sorted = shardRows([
    row(3, 1, 10),
    row(2, 12, 10),
    row(1, 5, 10),
    row(4, 5, 10),
    row(5, 10, 10),
  ])
  assert.deepEqual(
    sorted.map((r) => r.speciesId),
    [2, 5, 1, 4, 3]
  )
  assert.equal(sorted[0].count, 12)
})

test('a catalog entry becomes a row with its rule; a missing one is an explicit error', () => {
  const r = toRow(25, 2, catalog(25))
  assert.deepEqual(
    [r.speciesId, r.name, r.count, r.required, r.types],
    [25, 'pikachu', 2, 7, ['electric']]
  )
  assert.ok(Math.abs(r.drop - 0.806) < 0.001)
  assert.throws(() => toRow(999, 1, undefined), /missing_metadata/)
})

test('guest reads nothing', async () => {
  const supabase = fakeSupabase()
  const out = await loadShardRows({ mode: 'guest', supabase, catalog })
  assert.deepEqual(out, { rows: [], pending: 0, reconcileError: null })
  assert.deepEqual(supabase.calls, [])
})

test('server: reconciles, reads balances, counts pending; a failed read is an error, not empty', async () => {
  const supabase = fakeSupabase({
    shards: [
      { pokemon_id: 25, count: 7 },
      { pokemon_id: 10, count: 1 },
    ],
    events: [{ round_id: 'a' }, { round_id: 'b' }],
  })
  const out = await loadShardRows({ mode: 'server', supabase, catalog })
  assert.equal(supabase.calls[0], 'quiz_reconcile_shards')
  assert.deepEqual(
    out.rows.map((r) => r.speciesId),
    [25, 10]
  )
  assert.equal(out.pending, 2)
  await assert.rejects(
    loadShardRows({
      mode: 'server',
      supabase: fakeSupabase({ failShards: true }),
      catalog,
    }),
    /read failed/
  )
})

test('a failed reconcile keeps the known balances and reports the error', async () => {
  const out = await loadShardRows({
    mode: 'server',
    supabase: fakeSupabase({
      shards: [{ pokemon_id: 25, count: 1 }],
      failReconcile: true,
    }),
    catalog,
  })
  assert.equal(out.rows.length, 1)
  assert.match(out.reconcileError.message, /down/)
})

test('a balance with no catalog entry fails the load loudly', async () => {
  await assert.rejects(
    loadShardRows({
      mode: 'server',
      supabase: fakeSupabase({ shards: [{ pokemon_id: 999, count: 1 }] }),
      catalog,
    }),
    /missing_metadata/
  )
})

test('local reads the journal snapshot; pending events are counted, not owned', async () => {
  const snapshot = {
    version: 1,
    events: { a: { state: 'pending' }, b: { state: 'awarded' } },
    balances: { 150: 2 },
  }
  const storage = {
    getItem: (k) => (k === SHARD_KEY ? JSON.stringify(snapshot) : null),
  }
  const out = await loadShardRows({ mode: 'local', storage, catalog })
  assert.deepEqual(
    out.rows.map((r) => [r.speciesId, r.count, r.required]),
    [[150, 2, 19]]
  )
  assert.equal(out.pending, 1)
  const empty = await loadShardRows({
    mode: 'local',
    storage: { getItem: () => null },
    catalog,
  })
  assert.deepEqual(empty.rows, [])
  await assert.rejects(
    loadShardRows({
      mode: 'local',
      storage: { getItem: () => '{bad' },
      catalog,
    }),
    /journal_corrupt/
  )
})

test('a response for a user who left is ignored', () => {
  const epoch = createEpoch()
  const old = epoch.next()
  const current = epoch.next()
  assert.equal(epoch.isCurrent(old), false)
  assert.equal(epoch.isCurrent(current), true)
})

test('a local snapshot of another version is a corrupt journal, as the journal says', async () => {
  const storage = {
    getItem: () => JSON.stringify({ version: 2, events: {}, balances: {} }),
  }
  await assert.rejects(
    loadShardRows({ mode: 'local', storage, catalog }),
    /journal_corrupt/
  )
})

test('a snapshot with cards and crafts stays readable; a corrupt cards map is an error', async () => {
  const OP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const base = { version: 1, events: {}, balances: { 150: 2 } }
  const read = (extra) =>
    loadShardRows({
      mode: 'local',
      storage: { getItem: () => JSON.stringify({ ...base, ...extra }) },
      catalog,
    })
  const ok = await read({
    cards: { 150: 1 },
    crafts: {
      [OP]: {
        operationId: OP,
        speciesId: 150,
        spent: 19,
        shardCount: 2,
        cardCount: 1,
      },
    },
  })
  assert.deepEqual(
    ok.rows.map((r) => [r.speciesId, r.count]),
    [[150, 2]]
  )
  await assert.rejects(read({ cards: [] }), /journal_corrupt/)
})

test('server: card-only species become rows; shards and cards join per species', async () => {
  const out = await loadShardRows({
    mode: 'server',
    supabase: fakeSupabase({
      shards: [{ pokemon_id: 25, count: 3 }],
      cards: [
        { pokemon_id: 25, count: 2 },
        { pokemon_id: 10, count: 1 },
      ],
    }),
    catalog,
  })
  assert.deepEqual(
    out.rows.map((r) => [r.speciesId, r.count, r.cardCount]),
    [
      [25, 3, 2],
      [10, 0, 1],
    ]
  )
})

test('rows order: ready, progress, then card-only, then species id', () => {
  const r = (speciesId, count, cardCount) => ({
    ...row(speciesId, count, 10),
    cardCount,
  })
  assert.deepEqual(
    shardRows([
      r(9, 0, 1),
      r(3, 0, 2),
      r(7, 5, 0),
      r(8, 10, 4),
      r(2, 2, 0),
    ]).map((x) => x.speciesId),
    [8, 7, 2, 3, 9]
  )
})

test('a failed card read is an error, never an empty or shards-only pocket', async () => {
  await assert.rejects(
    loadShardRows({
      mode: 'server',
      supabase: fakeSupabase({
        shards: [{ pokemon_id: 25, count: 1 }],
        failCards: true,
      }),
      catalog,
    }),
    /cards failed/
  )
})

test('malformed card counts and a card with no catalog entry fail loudly', async () => {
  for (const cards of [
    [{ pokemon_id: 25, count: -1 }],
    [{ pokemon_id: 25, count: 1.5 }],
    [{ pokemon_id: 25, count: '2' }],
  ]) {
    await assert.rejects(
      loadShardRows({
        mode: 'server',
        supabase: fakeSupabase({ cards }),
        catalog,
      }),
      /invalid_count/
    )
  }
  await assert.rejects(
    loadShardRows({
      mode: 'server',
      supabase: fakeSupabase({ cards: [{ pokemon_id: 999, count: 1 }] }),
      catalog,
    }),
    /missing_metadata/
  )
})

test('local: cards from the journal appear, card-only included', async () => {
  const storage = {
    getItem: () =>
      JSON.stringify({
        version: 1,
        events: {},
        balances: { 150: 2 },
        cards: { 25: 3 },
      }),
  }
  const out = await loadShardRows({ mode: 'local', storage, catalog })
  assert.deepEqual(
    out.rows.map((r) => [r.speciesId, r.count, r.cardCount]),
    [
      [150, 2, 0],
      [25, 0, 3],
    ]
  )
})
