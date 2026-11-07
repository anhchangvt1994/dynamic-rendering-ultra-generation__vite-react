// Trading a card for an individual reuses the craft controller's durable
// operation machinery (id stored before the request, replayed until settled).
import {
  validIndividualNameResult,
  validTradeReceipt,
} from '../../QuizPage/shards/snapshot.mjs'
import { createCraftController } from '../crafting/operations.mjs'

export const tradePendingKey = (ownerKey) =>
  `pokedex:individual-trade-pending-v1:${ownerKey}`

export const TRADE_TERMINAL = [
  'invalid_operation',
  'invalid_species',
  'operation_conflict',
  'insufficient_cards',
  'not_found',
  'invalid_nickname',
  'locks_unavailable',
  'journal_corrupt',
  'trade_unavailable',
  // the trade happened, but its receipt is newer than this page knows
  'client_outdated',
]
const fail = (code) => Object.assign(new Error(code), { code })
const usable = (mode) => mode === 'server' || mode === 'local'
const rpcFail = (error) => {
  const code = TRADE_TERMINAL.find((c) => c === error.message)
  return code ? fail(code) : new Error(error.message)
}

/**
 * One trade against wherever the game keeps cards; the receipt is checked.
 * Server mode first asks the species' vibe so the server has stored it for
 * the RPC (a failure only means pool palettes).
 */
export async function tradeCard(
  { mode, supabase, journal, vibe },
  operationId,
  speciesId
) {
  if (!usable(mode)) throw fail('trade_unavailable')
  let data
  if (mode === 'server') {
    try {
      await vibe?.(speciesId)
    } catch {
      // the trade goes on without it
    }
    const out = await supabase.rpc('pokemon_trade_card', {
      p_operation: operationId,
      p_species: speciesId,
    })
    if (out.error) throw rpcFail(out.error)
    data = out.data
  } else {
    data = await journal.tradeLocalCard(operationId, speciesId)
  }
  // an appearance version past this client's: the card is spent server
  // side; a reload shows the individual (never "uncertain", never re-sent)
  const v = data?.traits?.appearance?.v
  if (Number.isInteger(v) && v > 3) throw fail('client_outdated')
  if (
    !validTradeReceipt(data) ||
    data.operationId.toLowerCase() !== operationId.toLowerCase() ||
    data.speciesId !== speciesId
  )
    throw fail('invalid_receipt')
  return data
}

export async function nameIndividual(
  { mode, supabase, journal },
  individualId,
  nickname
) {
  if (!usable(mode)) throw fail('trade_unavailable')
  let data
  if (mode === 'server') {
    const out = await supabase.rpc('pokemon_name_individual', {
      p_individual: individualId,
      p_nickname: nickname,
    })
    if (out.error) throw rpcFail(out.error)
    data = out.data
  } else {
    data = await journal.nameLocalIndividual(individualId, nickname)
  }
  if (
    !validIndividualNameResult(data) ||
    data.individualId.toLowerCase() !== individualId.toLowerCase()
  )
    throw fail('invalid_receipt')
  return { individualId: data.individualId, nickname: data.nickname }
}

export function createTradeController(options) {
  const controller = createCraftController({
    ...options,
    keyOf: tradePendingKey,
    terminal: TRADE_TERMINAL,
  })
  return {
    trade: controller.craft,
    retry: controller.craft,
    resume: controller.resume,
    dispose: controller.dispose,
  }
}
