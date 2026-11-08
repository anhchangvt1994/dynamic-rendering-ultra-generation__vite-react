// Trading a card for an individual reuses the craft controller's durable
// operation machinery (id stored before the request, replayed until settled).
import {
  validIndividualNameResult,
  validTradeReceipt,
} from '../../QuizPage/shards/snapshot.mjs'
import { randomId } from '../../../utils/secure.mjs'
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
const SYSTEMIC_TERMINAL = new Set([
  'client_outdated',
  'locks_unavailable',
  'journal_corrupt',
  'trade_unavailable',
])
const fail = (code) => Object.assign(new Error(code), { code })
const randomOperationId = () => randomId()
const terminalCodeFor = (error) =>
  TRADE_TERMINAL.find((code) => code === error?.code || code === error?.message)
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
  const latest = new Map()
  const {
    ownerKey,
    storage,
    submit,
    refresh = async () => {},
    onState,
    onBatch,
    newId = randomOperationId,
  } = options
  const controller = createCraftController({
    ...options,
    keyOf: tradePendingKey,
    terminal: TRADE_TERMINAL,
    onState: (speciesId, state) => {
      latest.set(speciesId, state)
      onState?.(speciesId, state)
    },
  })
  const batchPendingKey = tradePendingKey(ownerKey) + ':batch'
  const batchInflight = new Map()
  let batchLive = true

  const readBatchPending = () => {
    try {
      const raw = storage.getItem(batchPendingKey)
      const map = raw == null ? {} : JSON.parse(raw)
      if (!map || typeof map !== 'object' || Array.isArray(map)) return null
      return map
    } catch {
      return null
    }
  }
  const writeBatchPending = (map) => storage.setItem(batchPendingKey, JSON.stringify(map))
  const emit = (speciesId, state) => {
    if (!batchLive) return
    latest.set(speciesId, state)
    onState?.(speciesId, state)
  }
  const refreshSettled = async () => {
    try {
      await refresh()
    } catch {
      // Receipt remains authoritative; a later page read refreshes balances.
    }
  }

  const runBatch = async (speciesId, quantity, available = quantity) => {
    if (!Number.isSafeInteger(quantity) || quantity < 1)
      throw fail('invalid_quantity')
    const count = Math.min(quantity, Math.max(0, Math.floor(available)))
    const receipts = []
    const failures = []
    if (batchInflight.has(speciesId)) return batchInflight.get(speciesId)
    const task = (async () => {
      for (let index = 0; index < count; index += 1) {
        if (!batchLive) break
        let pending = readBatchPending()
        if (pending === null) {
          failures.push({ index: index + 1, kind: 'error', code: 'pending_unreadable' })
          emit(speciesId, { kind: 'error', retryable: false, code: 'pending_unreadable' })
          break
        }
        let operationId = pending[speciesId]
        if (!operationId) {
          try {
            operationId = newId()
          } catch {
            failures.push({ index: index + 1, kind: 'error', code: 'id_unavailable' })
            emit(speciesId, { kind: 'error', retryable: false, code: 'id_unavailable' })
            break
          }
          try {
            writeBatchPending({ ...pending, [speciesId]: operationId })
          } catch {
            failures.push({ index: index + 1, kind: 'error', code: 'storage_blocked' })
            emit(speciesId, { kind: 'error', retryable: false, code: 'storage_blocked' })
            break
          }
        }
        emit(speciesId, { kind: 'submitting', retryable: false })
        let result
        try {
          result = await submit(operationId, speciesId)
          if (
            result?.operationId?.toLowerCase() !== operationId.toLowerCase() ||
            result.speciesId !== speciesId
          )
            throw new Error('invalid_receipt')
        } catch (error) {
          if (!batchLive) break
          const code = terminalCodeFor(error)
          if (code) {
            // client_outdated may have spent the amber; keep its ID for replay.
            if (code !== 'client_outdated') {
              const current = readBatchPending()
              if (current) {
                delete current[speciesId]
                try { writeBatchPending(current) } catch {}
              }
            }
            failures.push({ index: index + 1, kind: 'error', code })
            emit(speciesId, { kind: 'error', retryable: code === 'client_outdated', code })
            await refreshSettled()
            if (SYSTEMIC_TERMINAL.has(code)) break
            continue
          }
          failures.push({ index: index + 1, kind: 'uncertain' })
          emit(speciesId, { kind: 'uncertain', retryable: true })
          break
        }
        if (!batchLive) break
        // A validated receipt means the trade committed. Surface it before
        // best-effort local cleanup so quota errors cannot erase success.
        receipts.push(result)
        emit(speciesId, { kind: 'success', retryable: false, receipt: result, batch: true })
        const current = readBatchPending()
        if (current) {
          delete current[speciesId]
          try { writeBatchPending(current) } catch {}
        }
        await refreshSettled()
      }
      const summary = {
        receipts,
        failures,
        uncertain: failures.some((failure) => failure.kind === 'uncertain'),
      }
      if (batchLive) onBatch?.(speciesId, summary)
      return summary
    })().finally(() => batchInflight.delete(speciesId))
    batchInflight.set(speciesId, task)
    return task
  }
  const tradeMany = (speciesId, quantity, available = quantity) =>
    runBatch(speciesId, quantity, available)
  const retryMany = (speciesId) => {
    const pending = readBatchPending()
    if (!pending || !pending[speciesId]) return Promise.resolve({ receipts: [], failures: [], uncertain: false })
    return runBatch(speciesId, 1, 1)
  }

  return {
    trade: controller.craft,
    tradeMany,
    retry: controller.craft,
    retryMany,
    resume: async () => {
      const legacy = await controller.resume()
      const pending = readBatchPending()
      if (!batchLive || !pending) return legacy
      const results = []
      for (const [rawSpecies, operationId] of Object.entries(pending)) {
        if (!batchLive) break
        const speciesId = Number(rawSpecies)
        if (!Number.isSafeInteger(speciesId) || speciesId < 1 || typeof operationId !== 'string') continue
        emit(speciesId, { kind: 'uncertain', retryable: true })
        const result = await runBatch(speciesId, 1, 1)
        results.push({ speciesId, result })
      }
      return results
    },
    dispose() {
      batchLive = false
      controller.dispose()
    },
  }
}
