// The browser's kitchen (yarn dev without a session): the database's rules
// (rules.mjs) on this browser's storage, sharing the quiz's bag. Loaded only
// in dev (useKitchenEngine): it holds the secret recipes.
import { readJSON, saveJSON } from '../../QuizPage/progress.mjs'
import { BAG_KEY } from '../../BagPage/bag.mjs'
import { cookPot, menuOf } from './rules.mjs'

export const KEYS = { bag: BAG_KEY, kitchen: 'pokedex:kitchen' }

export function createLocalEngine({ storage = globalThis.localStorage } = {}) {
  const kitchen = () => ({
    dishes: {},
    discovered: [],
    attempts: [],
    ...readJSON(KEYS.kitchen, {}, storage),
  })
  return {
    kind: 'local',
    async menu() {
      const { discovered, attempts } = kitchen()
      return menuOf(discovered, attempts)
    },
    async cook(dish, pot) {
      const { state, result } = cookPot(
        { ...kitchen(), bag: readJSON(KEYS.bag, {}, storage) },
        dish,
        pot
      )
      const { bag, ...rest } = state
      saveJSON(KEYS.bag, bag, storage)
      saveJSON(KEYS.kitchen, rest, storage)
      return result
    },
    async dishes() {
      return kitchen().dishes
    },
  }
}
