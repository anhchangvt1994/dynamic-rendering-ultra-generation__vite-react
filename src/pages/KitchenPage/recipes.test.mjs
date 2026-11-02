import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  FLAVORS,
  INGREDIENTS,
  ITEMS,
  flavorsOf,
  itemById,
} from '../QuizPage/items.mjs'
import {
  DISHES,
  KINDS,
  STATS,
  dishById,
  dishStats,
  hintOf,
  recipeKey,
} from './recipes.mjs'

test('the berries taste as in the games (PokéAPI)', () => {
  assert.deepEqual(flavorsOf('oran-berry'), {
    spicy: 10,
    dry: 10,
    bitter: 10,
    sour: 10,
  })
  assert.deepEqual(flavorsOf('tamato-berry'), { spicy: 20, dry: 10 })
  assert.deepEqual(flavorsOf('pecha-berry'), { sweet: 10 })
  assert.deepEqual(flavorsOf('fresh-water'), {})
  assert.equal(flavorsOf('fire-stone'), null)
})

test('27 ingredients: the berries, drinks and sweets, nothing else', () => {
  assert.equal(INGREDIENTS.length, 27)
  for (const id of INGREDIENTS) {
    const item = itemById(id)
    assert.ok(item, id)
    assert.ok(['berry', 'drink', 'cake', 'candy'].includes(item.kind), id)
    assert.ok(id in FLAVORS)
  }
  assert.ok(!INGREDIENTS.includes('rare-candy'))
  assert.equal(ITEMS.filter((item) => FLAVORS[item.id]).length, 27)
})

test('20 dishes: 12 known, 7 secret, 1 legendary; recipes unique, 2 to 4 ingredients', () => {
  assert.equal(DISHES.length, 20)
  assert.equal(DISHES.filter((d) => !d.secret).length, 12)
  assert.equal(DISHES.filter((d) => d.secret).length, 8)
  assert.equal(DISHES.filter((d) => d.rarity === 4).length, 1)
  const keys = new Set(DISHES.map((d) => recipeKey(d.ingredients)))
  assert.equal(keys.size, 20)
  for (const dish of DISHES) {
    assert.ok(
      dish.ingredients.length >= 2 && dish.ingredients.length <= 4,
      dish.id
    )
    for (const id of dish.ingredients)
      assert.ok(INGREDIENTS.includes(id), `${dish.id}: ${id}`)
    assert.ok(KINDS[dish.kind], dish.id)
  }
})

test('a recipe is a multiset: the order does not count, the quantities do', () => {
  assert.equal(
    recipeKey(['moomoo-milk', 'pecha-berry', 'pecha-berry']),
    recipeKey(['pecha-berry', 'moomoo-milk', 'pecha-berry'])
  )
  assert.notEqual(
    recipeKey(['pecha-berry', 'moomoo-milk']),
    recipeKey(['pecha-berry', 'pecha-berry', 'moomoo-milk'])
  )
})

test('a dish gives what its flavours say, never a negative', () => {
  assert.deepEqual(dishById('poffin-pecha').stats, {
    happiness: 3,
    friendship: 3,
  })
  assert.deepEqual(dishById('ca-ri-lua').stats, {
    power: 5,
    happiness: 1,
    friendship: 3,
  })
  assert.deepEqual(dishById('sup-lua-tamato').stats, {
    power: 6,
    beauty: 2,
    friendship: 5,
  })
  assert.deepEqual(dishById('dai-tiec-cau-vong').stats, {
    wisdom: 5,
    power: 5,
    beauty: 3,
    friendship: 6,
  })
  for (const dish of DISHES) {
    assert.deepEqual(dish.stats, dishStats(dish.ingredients, dish.secret))
    for (const [stat, points] of Object.entries(dish.stats)) {
      assert.ok(STATS[stat], stat)
      assert.ok(points > 0, `${dish.id} ${stat}`)
    }
  }
})

test('every secret dish can be found: a rare berry in it, a hint that matches', () => {
  for (const dish of DISHES.filter((d) => d.secret)) {
    assert.ok(
      dish.ingredients.some((id) => itemById(id).tier === 3),
      dish.id
    )
    const hint = hintOf(dish)
    assert.match(hint, new RegExp(KINDS[dish.kind].label))
    assert.match(hint, new RegExp(`${dish.ingredients.length} nguyên liệu`))
    const top = Object.entries(dish.stats)
      .filter(([stat]) => stat !== 'friendship')
      .slice(0, 2)
      .map(([stat]) => STATS[stat].label)
    for (const label of top) assert.match(hint, new RegExp(label))
  }
  assert.match(hintOf(dishById('banh-kem-qualot')), /1 quả mọng, 2 bánh ngọt/)
})
