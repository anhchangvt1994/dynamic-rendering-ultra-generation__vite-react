import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readShardSnapshot } from './snapshot.mjs'

const read = (value) =>
  readShardSnapshot({
    getItem: () => (value == null ? null : JSON.stringify(value)),
    setItem: () => {
      throw Error('read must not write')
    },
  })
const legacy = {
  version: 1,
  events: {},
  balances: { 10: 3 },
  extension: { keep: true },
}
test('empty and legacy snapshots normalize without writing or dropping extensions', () => {
  assert.deepEqual(read(null), {
    version: 1,
    events: {},
    balances: {},
    cards: {},
    crafts: {},
    individuals: {},
    trades: {},
    chestEvents: {},
  })
  assert.deepEqual(read(legacy), {
    ...legacy,
    cards: {},
    crafts: {},
    individuals: {},
    trades: {},
    chestEvents: {},
  })
})
test('invalid snapshot maps, versions and asset counts fail closed', () => {
  for (const extra of [
    { version: 2 },
    { cards: [] },
    { crafts: null },
    { balances: { 10: -1 } },
    { cards: { 10: 1.5 } },
    { cards: { 10: Number.MAX_SAFE_INTEGER + 1 } },
    { events: [] },
    { balances: { 1026: 3 } },
    { crafts: { bad: {} } },
  ]) {
    assert.throws(() => read({ ...legacy, ...extra }), /journal_corrupt/)
  }
})

test('chest events must carry valid entropy and a valid receipt', () => {
  const piece = { groupRoll: 0.1, speciesRoll: 0.2 }
  const good = {
    roundId: 'local-1-25',
    kind: 'combo',
    entropy: { countRoll: 0.5, pieces: [piece, piece, piece] },
    state: 'awarded',
    shards: [{ speciesId: 25, count: 2 }],
  }
  const read = (event, key = 'local-1-25:combo') =>
    readShardSnapshot({
      getItem: () =>
        JSON.stringify({
          version: 1,
          events: {},
          balances: {},
          chestEvents: { [key]: event },
        }),
    })
  assert.deepEqual(read(good).chestEvents['local-1-25:combo'], good)
  for (const bad of [
    { ...good, roundId: 'nope' },
    { ...good, entropy: { countRoll: 1, pieces: [piece, piece, piece] } },
    { ...good, entropy: { countRoll: 0.5, pieces: [piece] } },
    {
      ...good,
      entropy: {
        countRoll: 0.5,
        pieces: [piece, piece, { groupRoll: 'x', speciesRoll: 0 }],
      },
    },
    { ...good, shards: [{ speciesId: 25, count: 4 }] },
    { ...good, state: 'pending' },
  ])
    assert.throws(() => read(bad, `${bad.roundId}:combo`), /journal_corrupt/)
})
