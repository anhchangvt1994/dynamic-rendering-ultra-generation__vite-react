// The kitchen's rules for the browser's engine (yarn dev), the same as the
// database's kitchen_cook and kitchen_menu (20261104000000_kitchen.sql):
// engine/kitchen.test.mjs mirrors kitchen.test.sql.
import { FLAVORS } from '../../QuizPage/items.mjs'
import { DISHES, dishById, recipeKey } from '../recipes.mjs'
import { byMenuOrder, clueOf } from '../kitchen.mjs'
import { MAX_BATCH } from '../batch.mjs'

const fail = (code) => {
  throw new Error(code)
}
// "C" order, as the database sorts a pot
const sorted = (pot) => [...pot].sort()
const countOf = (pot) => {
  const counts = {}
  for (const id of pot) counts[id] = (counts[id] ?? 0) + 1
  return counts
}

/** How many ingredients two pots share, as multisets. */
export function overlap(a, b) {
  const left = countOf(a)
  const right = countOf(b)
  return Object.keys(left).reduce(
    (sum, id) => sum + Math.min(left[id], right[id] ?? 0),
    0
  )
}

/** The menu: known dishes and found secrets in full, the others as clues. */
export function menuOf(discovered = [], attempts = []) {
  return {
    dishes: DISHES.map((dish) =>
      !dish.secret || discovered.includes(dish.id) ? dish : clueOf(dish)
    ).sort(byMenuOrder),
    found: discovered.length,
    attempts,
  }
}

/**
 * Cook a dish of the menu (dishId) or a pot of 2 to 4 ingredients from
 * `state` ({ bag, dishes, discovered, attempts }): the new state and what
 * came out. A menu dish cooks `times` portions at once (1 to 99), all or
 * none. Throws the database's codes.
 */
export function cookPot(state, dishId, ingredients, times = 1) {
  if (
    !Number.isInteger(times) ||
    times < 1 ||
    times > MAX_BATCH ||
    (times > 1 && !dishId)
  )
    fail('bad_times')
  let recipe = null
  let pot
  if (dishId) {
    recipe = dishById(dishId)
    if (!recipe || (recipe.secret && !state.discovered.includes(recipe.id)))
      fail('unknown_dish')
    pot = recipe.ingredients
  } else pot = sorted(ingredients ?? [])
  if (pot.length < 2 || pot.length > 4) fail('bad_pot')
  if (pot.some((id) => !(id in FLAVORS))) fail('not_food')
  const need = countOf(pot)
  for (const id in need) need[id] *= times
  if (Object.entries(need).some(([id, n]) => (state.bag[id] ?? 0) < n))
    fail('missing')

  const bag = { ...state.bag }
  for (const [id, n] of Object.entries(need)) {
    bag[id] -= n
    if (!bag[id]) delete bag[id]
  }
  recipe ??= DISHES.find(
    (dish) => recipeKey(dish.ingredients) === pot.join('+')
  )

  if (recipe) {
    const discovered = recipe.secret && !state.discovered.includes(recipe.id)
    return {
      state: {
        ...state,
        bag,
        dishes: {
          ...state.dishes,
          [recipe.id]: (state.dishes[recipe.id] ?? 0) + times,
        },
        discovered: discovered
          ? [...state.discovered, recipe.id]
          : state.discovered,
      },
      result: { outcome: 'dish', dish: recipe, discovered, count: times },
    }
  }

  const returned = pot.slice(0, Math.ceil(pot.length / 2))
  for (const id of returned) bag[id] = (bag[id] ?? 0) + 1
  const key = pot.join('+')
  const near = Math.max(
    0,
    ...DISHES.filter(
      (dish) => dish.secret && !state.discovered.includes(dish.id)
    ).map((dish) => overlap(pot, dish.ingredients))
  )
  return {
    state: {
      ...state,
      bag,
      attempts: [
        ...state.attempts.filter((tried) => tried.join('+') !== key),
        pot,
      ],
    },
    result: { outcome: 'failed', returned, near },
  }
}
