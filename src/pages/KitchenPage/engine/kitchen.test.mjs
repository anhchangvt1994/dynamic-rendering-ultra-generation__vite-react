// The kitchen's engines: the browser's (yarn dev) on the database's rules
// (supabase/tests/database/kitchen.test.sql has the same cases), the
// account's (RPCs), the guest's (a menu to look at)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DISHES } from '../recipes.mjs'
import { KNOWN, SECRET_CLUES, publicMenu } from '../menu.mjs'
import { cookPot, keptOf, menuOf } from './rules.mjs'
import { flavorLevel, shapeOf } from '../kitchen.mjs'
import { batchMax, scaleStats } from '../batch.mjs'
import { missingOf, pinnedOf, potWithKept } from '../kept.mjs'
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
      {
        ...clue,
        kept: [],
      }
    )
    assert.equal(clue.count, dish.ingredients.length)
  }
  assert.deepEqual(
    publicMenu().dishes.map((d) => d.id),
    menuOf([]).dishes.map((d) => d.id)
  )
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

test('a failure: all back, the attempt kept, how near and which secret', () => {
  const { state, result } = cookPot(
    fresh({ 'pomeg-berry': 2, 'aspear-berry': 1, 'pecha-berry': 1 }),
    null,
    ['pomeg-berry', 'aspear-berry', 'pecha-berry']
  )
  assert.deepEqual(result, {
    outcome: 'failed',
    returned: ['aspear-berry', 'pecha-berry', 'pomeg-berry'],
    near: 2,
    closest: 'bi-an-1',
  })
  assert.deepEqual(state.bag, {
    'pomeg-berry': 2,
    'aspear-berry': 1,
    'pecha-berry': 1,
  })
  assert.deepEqual(state.attempts, [
    ['aspear-berry', 'pecha-berry', 'pomeg-berry'],
  ])
})

test('a failure with an ingredient twice: both come back', () => {
  const { state, result } = cookPot(
    fresh({ 'oran-berry': 2, 'pecha-berry': 1 }),
    null,
    ['pecha-berry', 'oran-berry', 'oran-berry']
  )
  assert.equal(result.outcome, 'failed')
  assert.deepEqual(result.returned, ['oran-berry', 'oran-berry', 'pecha-berry'])
  assert.deepEqual(state.bag, { 'oran-berry': 2, 'pecha-berry': 1 })
  assert.deepEqual(state.attempts, [
    ['oran-berry', 'oran-berry', 'pecha-berry'],
  ])
})

test('a pot near no secret: closest is null', () => {
  const { result } = cookPot(fresh({ 'oran-berry': 1, 'soda-pop': 1 }), null, [
    'oran-berry',
    'soda-pop',
  ])
  assert.deepEqual([result.near, result.closest], [0, null])
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
    { p_dish: null, p_ingredients: ['x', 'y'], p_times: 1 },
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

// batch cooking (2026-11-02-kitchen-batch-cook-design.md): kitchen.test.sql
// has the same cases
test('a batch of a menu dish: all its portions at once, to the last', () => {
  const { state, result } = cookPot(
    fresh({ 'chesto-berry': 6, 'fresh-water': 3 }),
    'tra-da-chesto',
    null,
    3
  )
  assert.equal(result.count, 3)
  assert.deepEqual(state.bag, {})
  assert.deepEqual(state.dishes, { 'tra-da-chesto': 3 })
})

test('a batch one portion short cooks nothing; its limits', () => {
  const state = fresh({ 'chesto-berry': 7, 'fresh-water': 3 })
  assert.throws(() => cookPot(state, 'tra-da-chesto', null, 4), /missing/)
  assert.deepEqual(state.bag, { 'chesto-berry': 7, 'fresh-water': 3 })
  assert.throws(() => cookPot(state, 'tra-da-chesto', null, 0), /bad_times/)
  assert.throws(() => cookPot(state, 'tra-da-chesto', null, 100), /bad_times/)
  assert.throws(
    () => cookPot(state, null, ['chesto-berry', 'fresh-water'], 2),
    /bad_times/
  )
  assert.equal(cookPot(state, 'tra-da-chesto', null).result.count, 1)
})

test('how many portions a bag makes, and what they give', () => {
  const pecha = ['moomoo-milk', 'pecha-berry', 'pecha-berry']
  assert.equal(batchMax(pecha, { 'pecha-berry': 9, 'moomoo-milk': 4 }), 4)
  assert.equal(batchMax(pecha, { 'pecha-berry': 9 }), 0)
  assert.equal(batchMax(pecha, { 'pecha-berry': 500, 'moomoo-milk': 500 }), 99)
  assert.deepEqual(scaleStats({ happiness: 3, friendship: 3 }, 3), {
    happiness: 9,
    friendship: 9,
  })
})

test('the local and server engines cook a batch', async () => {
  const storage = memory({
    [KEYS.bag]: { 'chesto-berry': 4, 'fresh-water': 2 },
  })
  const local = createLocalEngine({ storage })
  const result = await local.cook('tra-da-chesto', null, 2)
  assert.equal(result.count, 2)
  assert.deepEqual(storage.read(KEYS.bag), {})
  const calls = []
  const server = createServerEngine({
    rpc: async (name, args) => (
      calls.push([name, args]),
      { data: {}, error: null }
    ),
    from: () => ({ select: async () => ({ data: [], error: null }) }),
  })
  await server.cook('tra-da-chesto', null, 2)
  await server.cook(null, ['chesto-berry', 'fresh-water'])
  assert.deepEqual(calls, [
    [
      'kitchen_cook',
      { p_dish: 'tra-da-chesto', p_ingredients: null, p_times: 2 },
    ],
    [
      'kitchen_cook',
      {
        p_dish: null,
        p_ingredients: ['chesto-berry', 'fresh-water'],
        p_times: 1,
      },
    ],
  ])
})

// the secret dishes' flavour shadow (2026-11-02-kitchen-flavor-shadow-design.md)
test('a flavour sum in 3 levels, capped at 40', () => {
  assert.deepEqual(
    [0, 13, 14, 26, 27, 40, 90].map(flavorLevel),
    [0, 0, 1, 1, 2, 2, 2]
  )
})

test("every secret's clue carries its recipe's shape, and still no recipe", () => {
  for (const clue of SECRET_CLUES) {
    const dish = DISHES.find((d) => d.id === clue.id)
    assert.deepEqual(clue.shape, shapeOf(dish.ingredients), clue.id)
    assert.deepEqual(Object.keys(clue.shape), [
      'spicy',
      'dry',
      'sweet',
      'bitter',
      'sour',
    ])
    assert.ok(!('ingredients' in clue) && !('name' in clue))
  }
})

// the right ingredients kept (2026-11-03-kitchen-kept-design.md)
test("a secret's right ingredients: every attempt's share, counted, never more than the recipe", () => {
  const recipe = ['moomoo-milk', 'pecha-berry', 'pomeg-berry']
  assert.deepEqual(keptOf(recipe, []), [])
  assert.deepEqual(
    keptOf(recipe, [
      ['aspear-berry', 'pecha-berry', 'pecha-berry'],
      ['lemonade', 'pomeg-berry'],
    ]),
    ['pecha-berry', 'pomeg-berry']
  )
  assert.deepEqual(
    keptOf(
      ['oran-berry', 'oran-berry', 'sitrus-berry'],
      [
        ['oran-berry', 'pecha-berry'],
        ['oran-berry', 'oran-berry', 'oran-berry'],
      ]
    ),
    ['oran-berry', 'oran-berry']
  )
})

test('the menu gives each unfound secret its kept ingredients, a found one its recipe', () => {
  let { state } = cookPot(
    fresh({ 'pomeg-berry': 1, 'aspear-berry': 1, 'pecha-berry': 1 }),
    null,
    ['pomeg-berry', 'aspear-berry', 'pecha-berry']
  )
  const clue = menuOf(state.discovered, state.attempts).dishes.find(
    (d) => d.id === 'bi-an-1'
  )
  assert.deepEqual(clue.kept, ['pecha-berry', 'pomeg-berry'])
  assert.ok(!('ingredients' in clue))
})

test('a hunt fills the pot with what the bag has of the kept, then what was there', () => {
  const kept = ['pecha-berry', 'pomeg-berry']
  assert.deepEqual(
    potWithKept(kept, ['oran-berry'], {
      'pecha-berry': 1,
      'pomeg-berry': 1,
      'oran-berry': 1,
    }),
    ['pecha-berry', 'pomeg-berry', 'oran-berry']
  )
  assert.deepEqual(
    potWithKept(kept, ['pecha-berry', 'lemonade'], {
      'pecha-berry': 1,
      lemonade: 1,
    }),
    ['pecha-berry', 'lemonade']
  )
  assert.deepEqual(
    potWithKept(['a', 'b'], ['c', 'd', 'e'], { a: 1, b: 1, c: 1, d: 1, e: 1 }),
    ['a', 'b', 'c', 'd']
  )
})

test("the pot's pinned slots, and the kept still missing", () => {
  const kept = ['oran-berry', 'oran-berry', 'pecha-berry']
  assert.deepEqual(
    pinnedOf(kept, ['oran-berry', 'lemonade', 'oran-berry', 'oran-berry']),
    [true, false, true, false]
  )
  assert.deepEqual(missingOf(kept, ['oran-berry', 'lemonade']), [
    'oran-berry',
    'pecha-berry',
  ])
})
