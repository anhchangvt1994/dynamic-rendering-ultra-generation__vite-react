// Crafting a card is one idempotent operation: a client-made id is written to
// storage before the request and reused until the outcome is known, so a
// timeout, a reload or a double click can never craft twice. Pure of React.
import {
  validCraftReceipt,
  validOperation,
} from '../../QuizPage/shards/snapshot.mjs'

export const pendingKey = (ownerKey) =>
  `pokedex:card-craft-pending-v1:${ownerKey}`

// the outcome is known and nothing was (or will be) written: the id is spent
export const TERMINAL = [
  'invalid_operation',
  'invalid_species',
  'operation_conflict',
  'missing_catalog',
  'insufficient_shards',
  'locks_unavailable',
  'journal_corrupt',
  'craft_unavailable',
]
const fail = (code) => Object.assign(new Error(code), { code })

/** One craft against wherever the game keeps cards; the receipt is checked. */
export async function craftCard(
  { mode, supabase, journal },
  operationId,
  speciesId
) {
  if (mode !== 'server' && mode !== 'local') throw fail('craft_unavailable')
  let data
  if (mode === 'server') {
    const out = await supabase.rpc('pokemon_craft_card', {
      p_operation: operationId,
      p_species: speciesId,
    })
    if (out.error) {
      const code = TERMINAL.find((c) => c === out.error.message)
      throw code ? fail(code) : new Error(out.error.message)
    }
    data = out.data
  } else {
    data = await journal.craftLocalCard(operationId, speciesId)
  }
  if (
    !validCraftReceipt(data) ||
    data.operationId.toLowerCase() !== operationId.toLowerCase() ||
    data.speciesId !== speciesId
  )
    throw fail('invalid_receipt')
  return {
    operationId: data.operationId,
    speciesId: data.speciesId,
    spent: data.spent,
    shardCount: data.shardCount,
    cardCount: data.cardCount,
  }
}

/**
 * Per-species craft state with durable recovery. States: submitting,
 * uncertain (id kept, retryable), error (retryable only when the id is kept),
 * success. Nothing retries by itself; resume() settles restored work once.
 */
export function createCraftController({
  ownerKey,
  storage,
  submit,
  refresh = async () => {},
  onState,
  newId = () => globalThis.crypto.randomUUID(),
  // the same durable-operation machinery serves trading cards for individuals
  keyOf = pendingKey,
  terminal = TERMINAL,
}) {
  const key = keyOf(ownerKey)
  const terminalCode = (error) =>
    [error?.code, error?.message].find((value) => terminal.includes(value))
  const inflight = new Map()
  let live = true
  const emit = (speciesId, state) => {
    if (live) onState(speciesId, state)
  }

  // null: the stored map is unreadable, so no id can be trusted or replaced
  const readPending = () => {
    try {
      const raw = storage.getItem(key)
      if (raw == null) return {}
      const map = JSON.parse(raw)
      if (map === null || typeof map !== 'object' || Array.isArray(map))
        return null
      for (const [species, id] of Object.entries(map))
        if (!/^[1-9]\d*$/.test(species) || !validOperation(id)) return null
      return map
    } catch {
      return null
    }
  }
  const writePending = (map) => storage.setItem(key, JSON.stringify(map))
  const settle = async () => {
    if (!live) return
    try {
      await refresh()
    } catch {
      // the success stands; the next read corrects the numbers
    }
  }

  const run = async (speciesId) => {
    const pending = readPending()
    if (pending === null)
      return emit(speciesId, {
        kind: 'error',
        retryable: false,
        code: 'pending_unreadable',
      })
    const operationId = pending[speciesId] ?? newId()
    try {
      if (pending[speciesId] !== operationId)
        writePending({ ...pending, [speciesId]: operationId })
    } catch {
      return emit(speciesId, {
        kind: 'error',
        retryable: true,
        code: 'storage_blocked',
      })
    }
    emit(speciesId, { kind: 'submitting', retryable: false })
    const clear = () => {
      // a disposed controller never saw the outcome: keep the id so the next
      // mount replays the same operation and the player still gets the result
      if (!live) return
      const now = readPending()
      if (!now || !(speciesId in now)) return
      delete now[speciesId]
      try {
        writePending(now)
      } catch {
        // the id stays: a replay returns the same receipt
      }
    }
    try {
      const receipt = await submit(operationId, speciesId)
      if (
        receipt?.operationId?.toLowerCase() !== operationId.toLowerCase() ||
        receipt.speciesId !== speciesId
      )
        throw new Error('invalid_receipt')
      clear()
      emit(speciesId, { kind: 'success', retryable: false, receipt })
      await settle()
    } catch (error) {
      const code = terminalCode(error)
      if (code) {
        clear()
        emit(speciesId, { kind: 'error', retryable: false, code })
        await settle()
      } else {
        emit(speciesId, { kind: 'uncertain', retryable: true })
      }
    }
  }

  const craft = (speciesId) => {
    if (!live) return Promise.resolve()
    const running = inflight.get(speciesId)
    if (running) return running
    const task = run(speciesId).finally(() => inflight.delete(speciesId))
    inflight.set(speciesId, task)
    return task
  }

  return {
    craft,
    retry: craft,
    async resume() {
      const pending = readPending()
      if (pending === null) return
      const species = Object.keys(pending).map(Number)
      for (const id of species) emit(id, { kind: 'uncertain', retryable: true })
      await Promise.all(species.map(craft))
    },
    dispose() {
      live = false
    },
  }
}
