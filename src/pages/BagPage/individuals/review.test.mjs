import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { loadShardRows } from '../shards.mjs'
import {
  readShardSnapshot,
  validTraits,
  validTradeReceipt,
} from '../../QuizPage/shards/snapshot.mjs'

const [{ id, traits }] = JSON.parse(
  readFileSync(new URL('./golden.json', import.meta.url))
)
const individual = {
  id,
  speciesId: 25,
  nickname: null,
  ...traits,
  createdAt: '2026-11-04T00:00:00Z',
}
const catalog = () => ({
  name: 'pikachu',
  types: ['electric'],
  captureRate: 190,
  legendary: false,
  mythical: false,
  powerLevel: 2,
})

test('individual-only species remains reachable in the local bag', async () => {
  const snapshot = {
    version: 1,
    events: {},
    balances: {},
    cards: {},
    individuals: { [id]: individual },
  }
  const result = await loadShardRows({
    mode: 'local',
    storage: { getItem: () => JSON.stringify(snapshot) },
    catalog,
  })
  assert.equal(result.rows.length, 1)
  assert.equal(result.rows[0].speciesId, 25)
  assert.equal(result.rows[0].cardCount, 0)
})

test('individual-only species remains reachable in the server bag', async () => {
  const supabase = {
    rpc: async () => ({ data: [], error: null }),
    from: (table) => ({
      select: () => {
        const result = {
          data: table === 'pokemon_individuals' ? [{ pokemon_id: 25 }] : [],
          error: null,
        }
        return {
          then: (a, b) => Promise.resolve(result).then(a, b),
          eq: async () => result,
        }
      },
    }),
  }
  const result = await loadShardRows({ mode: 'server', supabase, catalog })
  assert.equal(result.rows.length, 1)
  assert.equal(result.rows[0].speciesId, 25)
})

test('corrupt traits are rejected before rendering or settling a receipt', () => {
  const mutations = [
    (t) => {
      t.appearance = {}
    },
    (t) => {
      t.appearance.v = 2
    },
    (t) => {
      t.appearance.hue = 0
    },
    (t) => {
      t.appearance.sat = 9
    },
    (t) => {
      t.appearance.light = -5
    },
    (t) => {
      t.appearance.mark = { kind: 'star' }
    },
    (t) => {
      t.appearance.mark = { kind: 'bad', x: 50, y: 50, size: 12, rot: 0 }
    },
    (t) => {
      t.potential.v = 2
    },
    (t) => {
      t.potential.stars = 99
    },
    (t) => {
      t.potential.offsets[0] = '0'
    },
    (t) => {
      t.potential.offsets[0] = 6
    },
  ]
  assert.equal(validTraits(traits), true)
  for (const mutate of mutations) {
    const bad = structuredClone(traits)
    mutate(bad)
    assert.equal(validTraits(bad), false, String(mutate))
    assert.equal(
      validTradeReceipt({
        operationId: id,
        individualId: id,
        speciesId: 25,
        cardCount: 0,
        traits: bad,
      }),
      false
    )
    const snapshot = {
      version: 1,
      events: {},
      balances: {},
      individuals: { [id]: { ...individual, ...bad } },
    }
    assert.throws(
      () => readShardSnapshot({ getItem: () => JSON.stringify(snapshot) }),
      /journal_corrupt/
    )
  }
})
