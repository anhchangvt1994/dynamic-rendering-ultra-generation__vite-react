// The room's care in this browser (yarn dev without a session): care.mjs's
// rules on localStorage, spending the local kitchen's dishes. Loaded only in
// dev (client.mjs): the dishes' stats come from recipes.mjs, which holds the
// secret recipes.
import { webLock } from '../../../utils/secure.mjs'
import { readJSON, saveJSON } from '../../QuizPage/progress.mjs'
import { KEYS } from '../../KitchenPage/engine/local.mjs'
import {
  CARE,
  applyBathe,
  applyFeed,
  applyPet,
  blockedReason,
  initialCare,
  needsNow,
} from './care.mjs'
import { tasteOf } from './likes.mjs'
import { CARE_KEY } from './client.mjs'

export { CARE_KEY }

const fail = (code) => Object.assign(new Error(code), { code })

const localIndividuals = async () => {
  const { createShardJournal } = await import('../../QuizPage/shards/local.mjs')
  return createShardJournal().listLocalIndividuals()
}
const localRecipes = async () =>
  (await import('../../KitchenPage/recipes.mjs')).dishById

export function createCareJournal({
  storage = globalThis.localStorage,
  now = () => new Date(),
  individuals = localIndividuals,
  recipes = null,
  lock = webLock(),
} = {}) {
  const exclusive = (fn) => (lock ? lock(CARE_KEY, fn) : fn())
  const load = () => ({
    states: {},
    ops: {},
    ...readJSON(CARE_KEY, {}, storage),
  })
  const find = async (id) => (await individuals()).find((one) => one.id === id)
  const dishOf = async (id) => (recipes ?? (await localRecipes()))(id)

  return {
    async read(individualId) {
      const one = await find(individualId)
      if (!one) return null
      return load().states[individualId] ?? initialCare(one.createdAt)
    },
    act: (operationId, action, individualId, dishId) =>
      exclusive(async () => {
        if (typeof operationId !== 'string' || !operationId)
          throw fail('invalid_operation')
        const journal = load()
        const prior = journal.ops[operationId]
        if (prior) {
          if (
            prior.action !== action ||
            prior.individualId !== individualId ||
            (prior.dishId ?? null) !== (dishId ?? null)
          )
            throw fail('operation_conflict')
          return prior
        }
        const one = await find(individualId)
        if (!one) throw fail('not_found')
        const at = now()
        const state = journal.states[individualId] ?? initialCare(one.createdAt)
        const kitchen = { dishes: {}, ...readJSON(KEYS.kitchen, {}, storage) }
        const count = action === 'feed' ? (kitchen.dishes[dishId] ?? 0) : null
        if (action === 'feed' && needsNow(state, at).hunger >= CARE.FULL_AT)
          throw fail('full')
        if (action === 'feed' && count < 1) throw fail('no_dish')
        if (action === 'bathe' && blockedReason(state, action, at))
          throw fail('bathe_cooldown')
        let care
        const receipt = { operationId, individualId, action }
        if (action === 'feed') {
          const dish = await dishOf(dishId)
          if (!dish) throw fail('no_dish')
          care = applyFeed(
            state,
            dish,
            tasteOf(one.personality, dish),
            one.potential?.stars ?? 1,
            at
          )
          kitchen.dishes[dishId] = count - 1
          if (count - 1 === 0) delete kitchen.dishes[dishId]
          saveJSON(KEYS.kitchen, kitchen, storage)
          Object.assign(receipt, { dishId, dishCount: count - 1 })
        } else if (action === 'bathe') care = applyBathe(state, at)
        else if (action === 'pet') care = applyPet(state, at)
        else throw fail('invalid_action')
        receipt.care = care
        journal.states[individualId] = care
        journal.ops[operationId] = receipt
        saveJSON(CARE_KEY, journal, storage)
        return receipt
      }),
  }
}
