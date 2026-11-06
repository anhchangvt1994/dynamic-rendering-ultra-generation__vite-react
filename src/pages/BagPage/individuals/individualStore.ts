import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useAccount } from 'app/supabase/account'
import { getSupabase } from 'app/supabase/client'
import { modeFor, type QuizMode } from 'pages/QuizPage/engine/mode'
import { createShardJournal } from 'pages/QuizPage/shards/local.mjs'
import { SHARD_KEY, validIndividual } from 'pages/QuizPage/shards/snapshot.mjs'
import { createEpoch } from '../shards.mjs'
import type { Individual } from './client'

// a trade or a rename just settled: every reader loads again
const listeners = new Set<() => void>()
export const refreshIndividuals = () => listeners.forEach((fn) => fn())

const fromRow = (row: any): Individual => ({
  id: row.id,
  speciesId: row.pokemon_id,
  nickname: row.nickname,
  personality: row.personality,
  appearance: row.appearance,
  potential: row.potential,
  createdAt: row.created_at,
})

const PAGE = 1000

/** Every individual of the owner (one species, or all), newest first; invalid rows fail the read. */
export async function fetchIndividuals(
  mode: QuizMode,
  speciesId: number | null
): Promise<Individual[]> {
  let items: Individual[] = []
  if (mode === 'server') {
    const supabase = await getSupabase()
    for (let from = 0; ; from += PAGE) {
      let query = supabase
        .from('pokemon_individuals')
        .select(
          'id,pokemon_id,nickname,personality,appearance,potential,created_at'
        )
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + PAGE - 1)
      if (speciesId !== null) query = query.eq('pokemon_id', speciesId)
      const out = await query
      if (out.error) throw new Error(out.error.message)
      const rows = (out.data ?? []).map(fromRow)
      items = items.concat(rows)
      if (rows.length < PAGE) break
    }
  } else {
    items = await createShardJournal().listLocalIndividuals(
      speciesId ?? undefined
    )
  }
  if (!items.every(validIndividual)) throw new Error('invalid_individuals')
  return items
}

/**
 * The player's individuals, newest first: the account's rows (RLS select),
 * this browser's journal (yarn dev), nothing for a guest. A failed or invalid
 * read is an error, never an empty list.
 */
export function useIndividualList(enabled: boolean, speciesId: number | null) {
  const account = useAccount()
  const mode = modeFor(account.status)
  const userId = account.user?.id
  const ownerKey = `${enabled}:${mode}:${userId ?? ''}:${speciesId ?? 'all'}`
  const [loadedOwner, setLoadedOwner] = useState('')
  const [state, setState] = useState<{
    items: Individual[] | null
    loading: boolean
    error: Error | null
  }>({ items: null, loading: false, error: null })
  const epoch = useRef(createEpoch())

  const load = useCallback(() => {
    if (!enabled || (mode !== 'server' && mode !== 'local')) return
    const mine = epoch.current.next()
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchIndividuals(mode, speciesId).then(
      (items) => {
        if (epoch.current.isCurrent(mine)) {
          setLoadedOwner(ownerKey)
          setState({ items, loading: false, error: null })
        }
      },
      (error: Error) => {
        if (epoch.current.isCurrent(mine)) {
          setLoadedOwner(ownerKey)
          setState((s) => ({ ...s, loading: false, error }))
        }
      }
    )
  }, [enabled, mode, speciesId, ownerKey])

  useEffect(() => {
    setState({ items: null, loading: false, error: null })
    load()
    listeners.add(load)
    const onStorage = (event: StorageEvent) => {
      if (mode === 'local' && (event.key === SHARD_KEY || event.key === null))
        load()
    }
    window.addEventListener('storage', onStorage)
    const current = epoch.current
    return () => {
      current.next()
      listeners.delete(load)
      window.removeEventListener('storage', onStorage)
    }
  }, [load, mode, userId])

  return loadedOwner === ownerKey
    ? { ...state, retry: load }
    : {
        items: null,
        loading: enabled && (mode === 'server' || mode === 'local'),
        error: null,
        retry: load,
      }
}

// One shared count per species for the collection badges: the first badge on
// screen loads it, every card reads it, a settled trade reloads it.
let owned: { key: string; counts: Record<number, number> | null } = {
  key: '',
  counts: null,
}
let ownedEpoch = 0
let ownedMode: QuizMode | null = null
const ownedListeners = new Set<() => void>()
const setOwned = (next: typeof owned) => {
  owned = next
  ownedListeners.forEach((fn) => fn())
}
const loadOwned = () => {
  if (!owned.key || !ownedMode) return
  const key = owned.key
  const mine = ++ownedEpoch
  fetchIndividuals(ownedMode, null).then(
    (items) => {
      if (mine !== ownedEpoch) return
      const counts: Record<number, number> = {}
      for (const item of items)
        counts[item.speciesId] = (counts[item.speciesId] ?? 0) + 1
      setOwned({ key, counts })
    },
    () => {
      // no badge rather than a wrong one
      if (mine === ownedEpoch) setOwned({ key, counts: null })
    }
  )
}
listeners.add(() => loadOwned())
const subscribeOwned = (fn: () => void) => {
  ownedListeners.add(fn)
  return () => {
    ownedListeners.delete(fn)
  }
}

/** How many individuals of this species the player owns (0 for guests and while unknown). */
export function useOwnedCount(speciesId: number) {
  const account = useAccount()
  const mode = modeFor(account.status)
  const key =
    mode === 'local'
      ? 'local'
      : mode === 'server' && account.user?.id
        ? `server:${account.user.id}`
        : ''
  useEffect(() => {
    if (!key) return
    if (owned.key !== key) {
      ownedMode = mode
      setOwned({ key, counts: null })
      loadOwned()
    }
  }, [key, mode])
  return useSyncExternalStore(
    subscribeOwned,
    () => (owned.key === key ? (owned.counts?.[speciesId] ?? 0) : 0),
    () => 0
  )
}
