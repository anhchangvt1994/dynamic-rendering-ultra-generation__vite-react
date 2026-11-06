import assert from 'node:assert/strict'
import test from 'node:test'
import { applyFeed, initialCare } from './care.mjs'
import { CARE_KEY, createCareJournal } from './journal.mjs'
import { tasteOf } from './likes.mjs'

const NOW = new Date('2026-11-05T05:00:00.000Z')
const PROUD = {
  id: 'c0000000-0000-4000-8000-000000000001',
  speciesId: 25,
  nickname: null,
  personality: 8,
  appearance: { v: 2, palette: 'origin', shift: [], marks: null },
  potential: { v: 1, offsets: [], stars: 1 },
  createdAt: '2026-11-05T00:00:00.000Z',
}
const DISHES = {
  'poffin-cheri': {
    id: 'poffin-cheri',
    stats: { power: 4, friendship: 3 },
    top: ['power'],
  },
  'tra-da-chesto': {
    id: 'tra-da-chesto',
    stats: { beauty: 2, friendship: 3 },
    top: ['beauty'],
  },
}
const OP = 'd0000000-0000-4000-8000-000000000001'

function memory(initial = {}) {
  const data = new Map(
    Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)])
  )
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    json: (k) => JSON.parse(data.get(k) ?? 'null'),
  }
}
const journal = (storage) =>
  createCareJournal({
    storage,
    now: () => NOW,
    individuals: async () => [PROUD],
    recipes: (id) => DISHES[id],
    lock: null,
  })

test('feed spends one dish and removes the key at zero', async () => {
  const storage = memory({
    'pokedex:kitchen': { dishes: { 'poffin-cheri': 2, 'tra-da-chesto': 1 } },
  })
  const care = journal(storage)
  const one = await care.act(OP, 'feed', PROUD.id, 'poffin-cheri')
  assert.equal(one.dishCount, 1)
  assert.equal(one.dishId, 'poffin-cheri')
  assert.equal(storage.json('pokedex:kitchen').dishes['poffin-cheri'], 1)
  await care.act(crypto.randomUUID(), 'feed', PROUD.id, 'tra-da-chesto')
  assert.equal('tra-da-chesto' in storage.json('pokedex:kitchen').dishes, false)
})

test('the stored care is applyFeed of the same input', async () => {
  const storage = memory({
    'pokedex:kitchen': { dishes: { 'poffin-cheri': 1 } },
  })
  const receipt = await journal(storage).act(
    OP,
    'feed',
    PROUD.id,
    'poffin-cheri'
  )
  const expected = applyFeed(
    initialCare(PROUD.createdAt),
    DISHES['poffin-cheri'],
    tasteOf(8, DISHES['poffin-cheri']),
    1,
    NOW
  )
  assert.deepEqual(receipt.care, expected)
  assert.equal(receipt.care.moodEvent, 'disliked')
  assert.deepEqual(await journal(storage).read(PROUD.id), expected)
  assert.deepEqual(storage.json(CARE_KEY).states[PROUD.id], expected)
})

test('no dish: no_dish, nothing written', async () => {
  const storage = memory({ 'pokedex:kitchen': { dishes: {} } })
  await assert.rejects(
    journal(storage).act(OP, 'feed', PROUD.id, 'poffin-cheri'),
    { code: 'no_dish' }
  )
  assert.equal(storage.json(CARE_KEY), null)
})

test('a replay returns the receipt and spends nothing more', async () => {
  const storage = memory({
    'pokedex:kitchen': { dishes: { 'poffin-cheri': 2 } },
  })
  const first = await journal(storage).act(OP, 'feed', PROUD.id, 'poffin-cheri')
  const again = await journal(storage).act(OP, 'feed', PROUD.id, 'poffin-cheri')
  assert.deepEqual(again, first)
  assert.equal(storage.json('pokedex:kitchen').dishes['poffin-cheri'], 1)
})

test('the same id for another action conflicts', async () => {
  const storage = memory()
  await journal(storage).act(OP, 'pet', PROUD.id)
  await assert.rejects(journal(storage).act(OP, 'bathe', PROUD.id), {
    code: 'operation_conflict',
  })
})

test('an individual not in the journal is not_found', async () => {
  await assert.rejects(
    journal(memory()).act(OP, 'pet', 'c0000000-0000-4000-8000-0000000000ff'),
    { code: 'not_found' }
  )
  assert.equal(await journal(memory()).read('nope'), null)
})

test('read: an individual nobody cared for has the initial care', async () => {
  assert.deepEqual(
    await journal(memory()).read(PROUD.id),
    initialCare(PROUD.createdAt)
  )
})

test('blocked actions refuse with their code', async () => {
  const storage = memory()
  await journal(storage).act(OP, 'bathe', PROUD.id)
  await assert.rejects(
    journal(storage).act(crypto.randomUUID(), 'bathe', PROUD.id),
    { code: 'bathe_cooldown' }
  )
})
