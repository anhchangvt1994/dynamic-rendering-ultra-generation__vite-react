// All the kitchen's dishes, known and secret: for the local engine (yarn
// dev), the tests and the migration's seed. The page ships menu.mjs only.
import { KNOWN } from './menu.mjs'
import { SECRETS } from './secrets.mjs'
import { clueOf, hintText } from './kitchen.mjs'

export {
  FLAVOR_LABEL,
  FLAVOR_STAT,
  KINDS,
  STATS,
  dishStats,
  recipeKey,
} from './kitchen.mjs'

export const DISHES = [...KNOWN, ...SECRETS]

const BY_ID = new Map(DISHES.map((d) => [d.id, d]))
export const dishById = (id) => BY_ID.get(id)

/** A secret dish's clue in words. */
export const hintOf = (dish) => hintText(clueOf(dish))
