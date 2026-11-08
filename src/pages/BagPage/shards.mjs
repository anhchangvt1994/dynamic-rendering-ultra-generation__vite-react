// The shard pocket's data: balances joined to the catalog's rule, wherever
// the game keeps them. Pure of React; shardStore.ts wires it to the page.
import { shardRule } from '../QuizPage/shards/rules.mjs'
import { readShardSnapshot } from '../QuizPage/shards/snapshot.mjs'
import { createShardJournal } from '../QuizPage/shards/local.mjs'

const shippedCatalog = async (id) => {
  const { default: data } = await import('../QuizPage/shards/catalog.json')
  return data.species.find((entry) => entry.id === id)
}

/** One species' row: a balance with no catalog entry is an error, not a guess. */
export function toRow(speciesId, count, entry, cardCount = 0) {
  if (!entry) throw new Error(`missing_metadata:${speciesId}`)
  const { required, drop } = shardRule(entry)
  return {
    speciesId,
    name: entry.name,
    count,
    cardCount,
    required,
    drop,
    types: entry.types,
  }
}

const progress = (row) => row.count / row.required

const checkedCount = (speciesId, value) => {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`invalid_count:${speciesId}`)
  return value
}

/** Amber first, then shard count descending, with species id as stable tie-break. */
export const shardRows = (rows) =>
  [...rows].sort(
    (a, b) =>
      Number(b.cardCount > 0) - Number(a.cardCount > 0) ||
      b.count - a.count ||
      a.speciesId - b.speciesId
  )

// shards and cards joined per species; a species holding only cards still shows
const rowsOf = async (shards, cards, catalog, individuals = []) => {
  const owned = new Map(
    individuals.map((id) => [id, { count: 0, cardCount: 0 }])
  )
  for (const [id, count] of shards)
    owned.set(id, { count: checkedCount(id, count), cardCount: 0 })
  for (const [id, count] of cards) {
    const entry = owned.get(id) ?? { count: 0, cardCount: 0 }
    entry.cardCount = checkedCount(id, count)
    owned.set(id, entry)
  }
  return shardRows(
    await Promise.all(
      [...owned].map(async ([id, { count, cardCount }]) =>
        toRow(id, count, await catalog(id), cardCount)
      )
    )
  )
}

const positive = (map) =>
  Object.entries(map)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => [Number(id), count])

/**
 * Loads the pocket. Guests read nothing. A failed balance read throws (never
 * an empty pocket); a failed reconcile only reports, the known rows stay.
 */
export async function loadShardRows({
  mode,
  supabase,
  storage = globalThis.localStorage,
  catalog = shippedCatalog,
  journal = undefined,
}) {
  if (mode === 'local') {
    let reconcileError = null
    try {
      await (
        journal ?? createShardJournal({ storage })
      ).reconcileLocalChestShards()
    } catch (error) {
      reconcileError = error
    }
    const snapshot = readShardSnapshot(storage)
    const pending = [
      ...Object.values(snapshot.events),
      ...Object.values(snapshot.chestEvents),
    ].filter((event) => event.state === 'pending').length
    return {
      rows: await rowsOf(
        positive(snapshot.balances),
        positive(snapshot.cards),
        catalog,
        Object.values(snapshot.individuals).map((item) => item.speciesId)
      ),
      pending,
      reconcileError,
    }
  }
  if (mode !== 'server') return { rows: [], pending: 0, reconcileError: null }
  let reconcileError = null
  const reconciled = await supabase.rpc('quiz_reconcile_shards')
  if (reconciled.error) reconcileError = new Error(reconciled.error.message)
  try {
    const chests = await supabase.rpc('quiz_reconcile_chest_shards')
    if (chests.error) reconcileError ??= new Error(chests.error.message)
  } catch (error) {
    reconcileError ??= error
  }
  const [owned, cards, individuals, waiting, chests] = await Promise.all([
    supabase.from('pokemon_shards').select('pokemon_id, count'),
    supabase.from('pokemon_cards').select('pokemon_id, count'),
    supabase.from('pokemon_individuals').select('pokemon_id'),
    supabase
      .from('quiz_shard_events')
      .select('round_id')
      .eq('state', 'pending'),
    supabase
      .from('quiz_chest_shard_events')
      .select('round_id')
      .eq('state', 'pending'),
  ])
  if (owned.error) throw new Error(owned.error.message)
  if (cards.error) throw new Error(cards.error.message)
  if (individuals.error) throw new Error(individuals.error.message)
  if (waiting.error) throw new Error(waiting.error.message)
  if (chests.error) throw new Error(chests.error.message)
  return {
    rows: await rowsOf(
      owned.data.map((row) => [row.pokemon_id, row.count]),
      cards.data.map((row) => [row.pokemon_id, row.count]),
      catalog,
      individuals.data.map((row) => row.pokemon_id)
    ),
    pending: waiting.data.length + chests.data.length,
    reconcileError,
  }
}

/** Each load takes a number; a reply for an older one (another user) is dropped. */
export function createEpoch() {
  let current = 0
  return { next: () => ++current, isCurrent: (n) => n === current }
}
