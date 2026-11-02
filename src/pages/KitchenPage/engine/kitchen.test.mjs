// The kitchen's engines: the browser's (yarn dev) on the database's rules
// (supabase/tests/database/kitchen.test.sql has the same cases), the
// account's (RPCs), the guest's (a menu to look at)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DISHES } from '../recipes.mjs'
import { KNOWN, SECRET_CLUES, publicMenu } from '../menu.mjs'
import { cookPot, menuOf } from './rules.mjs'
import { createLocalEngine, KEYS } from './local.mjs'
import { createGuestEngine } from './guest.mjs'
import { createServerEngine } from './server.ts'

const memory = (data = {}) => {
  const map = new Map(
    Object.entries(data).map(([k, v]) => [k, JSON.stringify(v)])
  )
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    read: (k) => JSON.parse(map.get(k) ?? 'null'),
  }
}
const fresh = (bag) => ({ bag, dishes: {}, discovered: [], attempts: [] })

test('the public menu: known dishes in full, secrets as clues only', () => {
  assert.equal(KNOWN.length, 12)
  assert.equal(SECRET_CLUES.length, 8)
  for (const clue of SECRET_CLUES) {
    assert.ok(
      !('name' in clue) && !('ingredients' in clue) && !('stats' in clue)
    )
    const dish = DISHES.find((d) => d.id === clue.id)
    assert.deepEqual(
      menuOf([]).dishes.find((d) => d.id === clue.id),
      clue
    )
    assert.equal(clue.count, dish.ingredients.length)
  }
  assert.deepEqual(publicMenu(), menuOf([]))
})

test('a known dish from the menu: spent and given', () => {
  const { state, result } = cookPot(
    fresh({ 'pecha-berry': 3, 'moomoo-milk': 1 }),
    'poffin-pecha',
    null
  )
  assert.equal(result.outcome, 'dish')
  assert.equal(result.dish.name, 'Poffin Pecha')
  assert.deepEqual(state.bag, { 'pecha-berry': 1 })
  assert.deepEqual(state.dishes, { 'poffin-pecha': 1 })
})

test('the errors of the database', () => {
  const state = fresh({ 'pecha-berry': 1, 'fire-stone': 1, 'oran-berry': 9 })
  assert.throws(() => cookPot(state, 'poffin-pecha', null), /missing/)
  assert.throws(() => cookPot(state, 'bi-an-1', null), /unknown_dish/)
  assert.throws(() => cookPot(state, 'nope', null), /unknown_dish/)
  assert.throws(() => cookPot(state, null, ['pecha-berry']), /bad_pot/)
  assert.throws(
    () => cookPot(state, null, Array(5).fill('oran-berry')),
    /bad_pot/
  )
  assert.throws(
    () => cookPot(state, null, ['fire-stone', 'pecha-berry']),
    /not_food/
  )
})

test('a failure: half back (rounded up, the first sorted), the attempt kept, how near', () => {
  const { state, result } = cookPot(
    fresh({ 'pomeg-berry': 2, 'aspear-berry': 1, 'pecha-berry': 1 }),
    null,
    ['pomeg-berry', 'aspear-berry', 'pecha-berry']
  )
  assert.deepEqual(result, {
    outcome: 'failed',
    returned: ['aspear-berry', 'pecha-berry'],
    near: 2,
  })
  assert.deepEqual(state.bag, {
    'pomeg-berry': 1,
    'aspear-berry': 1,
    'pecha-berry': 1,
  })
  assert.deepEqual(state.attempts, [
    ['aspear-berry', 'pecha-berry', 'pomeg-berry'],
  ])
})

test('a failure with an ingredient twice: the half back counts each one', () => {
  const { state, result } = cookPot(
    fresh({ 'oran-berry': 2, 'pecha-berry': 1 }),
    null,
    ['pecha-berry', 'oran-berry', 'oran-berry']
  )
  assert.equal(result.outcome, 'failed')
  assert.deepEqual(result.returned, ['oran-berry', 'oran-berry'])
  assert.deepEqual(state.bag, { 'oran-berry': 2 })
  assert.deepEqual(state.attempts, [
    ['oran-berry', 'oran-berry', 'pecha-berry'],
  ])
})

test('a secret found in any order; then known; then it no longer counts as near', () => {
  let { state, result } = cookPot(
    fresh({
      'pomeg-berry': 2,
      'pecha-berry': 2,
      'moomoo-milk': 1,
      'aspear-berry': 1,
    }),
    null,
    ['moomoo-milk', 'pomeg-berry', 'pecha-berry']
  )
  assert.equal(result.discovered, true)
  assert.equal(result.dish.id, 'bi-an-1')
  const menu = menuOf(state.discovered, state.attempts)
  assert.equal(menu.found, 1)
  assert.ok(menu.dishes.find((d) => d.id === 'bi-an-1').ingredients)
  ;({ result } = cookPot(state, null, [
    'pomeg-berry',
    'pecha-berry',
    'aspear-berry',
  ]))
  assert.equal(result.near, 1)
})

test('a known recipe in the pot: a dish, no discovery', () => {
  const { result } = cookPot(
    fresh({ 'cheri-berry': 2, 'lava-cookie': 1 }),
    null,
    ['lava-cookie', 'cheri-berry', 'cheri-berry']
  )
  assert.equal(result.outcome, 'dish')
  assert.equal(result.discovered, false)
})

test('the local engine keeps it all in this browser, sharing the quiz bag', async () => {
  const storage = memory({ [KEYS.bag]: { 'pecha-berry': 2, 'moomoo-milk': 1 } })
  const engine = createLocalEngine({ storage })
  assert.equal(engine.kind, 'local')
  await engine.cook('poffin-pecha', null)
  assert.deepEqual(storage.read(KEYS.bag), {})
  assert.deepEqual(await engine.dishes(), { 'poffin-pecha': 1 })
  assert.equal((await createLocalEngine({ storage }).menu()).dishes.length, 20)
})

test('the account engine maps the RPCs', async () => {
  const calls = []
  const replies = {
    kitchen_menu: { dishes: [], found: 0, attempts: [] },
    kitchen_cook: { outcome: 'failed', returned: ['a'], near: 1 },
  }
  const supabase = {
    rpc: async (name, args) => {
      calls.push([name, args])
      return { data: replies[name], error: null }
    },
    from: () => ({
      select: async () => ({
        data: [{ dish_id: 'ca-ri-lua', count: 2 }],
        error: null,
      }),
    }),
  }
  const engine = createServerEngine(supabase)
  assert.deepEqual(await engine.cook(null, ['x', 'y']), replies.kitchen_cook)
  assert.deepEqual(calls.at(-1), [
    'kitchen_cook',
    { p_dish: null, p_ingredients: ['x', 'y'] },
  ])
  assert.deepEqual(await engine.dishes(), { 'ca-ri-lua': 2 })
})

test('guests look at the menu but can not cook', async () => {
  const engine = createGuestEngine()
  assert.equal(engine.kind, 'guest')
  assert.deepEqual(await engine.menu(), publicMenu())
  await assert.rejects(engine.cook('poffin-pecha', null), /sign_in/)
  assert.deepEqual(await engine.dishes(), {})
})
