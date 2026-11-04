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
  })
  assert.deepEqual(read(legacy), {
    ...legacy,
    cards: {},
    crafts: {},
    individuals: {},
    trades: {},
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
