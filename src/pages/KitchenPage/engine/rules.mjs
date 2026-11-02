// The kitchen's rules for the browser's engine (yarn dev), the same as the
// database's kitchen_cook and kitchen_menu (20261104000000_kitchen.sql,
// 20261107000000_kitchen_kept.sql):
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

/**
 * A secret's right ingredients found so far: for each of its ingredients, as
 * many as one attempt held at most, never more than the recipe. Sorted.
 */
export function keptOf(recipe, attempts = []) {
  const need = countOf(recipe)
  const tried = attempts.map(countOf)
  return Object.keys(need)
    .sort()
    .flatMap((id) =>
      Array(
        Math.min(need[id], Math.max(0, ...tried.map((pot) => pot[id] ?? 0)))
      ).fill(id)
    )
}

/**
 * The menu: known dishes and found secrets in full, the others as clues
 * with their right ingredients found so far (kept).
 */
export function menuOf(discovered = [], attempts = []) {
  return {
    dishes: DISHES.map((dish) =>
      !dish.secret || discovered.includes(dish.id)
        ? dish
        : { ...clueOf(dish), kept: keptOf(dish.ingredients, attempts) }
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

  // a failure costs nothing: all of it back
  for (const id of pot) bag[id] = (bag[id] ?? 0) + 1
  const key = pot.join('+')
  // the unfound secret sharing the most, in the menu's order on a tie
  let near = 0
  let closest = null
  for (const dish of DISHES.filter(
    (d) => d.secret && !state.discovered.includes(d.id)
  ).sort(byMenuOrder)) {
    const shared = overlap(pot, dish.ingredients)
    if (shared > near) [near, closest] = [shared, dish.id]
  }
  return {
    state: {
      ...state,
      bag,
      attempts: [
        ...state.attempts.filter((tried) => tried.join('+') !== key),
        pot,
      ],
    },
    result: { outcome: 'failed', returned: pot, near, closest },
  }
}
