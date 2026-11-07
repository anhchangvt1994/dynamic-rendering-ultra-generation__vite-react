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
      t.appearance.v = 4
    },
    (t) => {
      t.appearance.palette = 'nope'
    },
    (t) => {
      t.appearance.shift[0][0] = 9
    },
    (t) => {
      t.appearance.shift[1][1] = -11
    },
    (t) => {
      t.appearance.shift[2][2] = 7
    },
    (t) => {
      t.appearance.shift.pop()
    },
    (t) => {
      t.appearance.marks = { kind: 'bad', count: 3, seed: 7 }
    },
    (t) => {
      t.appearance.marks = { kind: 'spots', count: 0, seed: 7 }
    },
    (t) => {
      t.appearance.marks = { kind: 'spots', count: 11, seed: 7 }
    },
    (t) => {
      t.appearance.marks = { kind: 'spots', count: 3, seed: -1 }
    },
    (t) => {
      t.appearance.marks = { kind: 'spots', count: 3 }
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
  assert.equal(
    validTraits({
      ...traits,
      appearance: {
        ...traits.appearance,
        marks: { kind: 'spots', count: 3, seed: 7 },
      },
    }),
    true
  )
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

test('every golden v3 trait set is valid, and so are v2 and v1 ones', () => {
  const all = JSON.parse(
    readFileSync(new URL('./golden.json', import.meta.url))
  )
  for (const g of all) assert.equal(validTraits(g.traits), true, g.id)
  const v1 = {
    ...traits,
    appearance: { v: 1, hue: -6, sat: 3, light: -2, mark: null },
  }
  assert.equal(validTraits(v1), true)
  v1.appearance.hue = 0
  assert.equal(validTraits(v1), false)
  // v2 may name a palette v3 removed, until the upgrade re-derives it
  const v2 = structuredClone(traits)
  v2.appearance.v = 2
  v2.appearance.palette = 'ember'
  assert.equal(validTraits(v2), true)
  for (const palette of ['', 7, null]) {
    v2.appearance.palette = palette
    assert.equal(validTraits(v2), false, String(palette))
  }
  const v3 = structuredClone(traits)
  v3.appearance.palette = 'ember'
  assert.equal(validTraits(v3), false, 'v3 needs a known key')
})
