import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount } from 'app/supabase/account'
import { getSupabase } from 'app/supabase/client'
import { modeFor } from 'pages/QuizPage/engine/mode'
import { SHARD_KEY } from 'pages/QuizPage/shards/local.mjs'
import { createEpoch, loadShardRows } from './shards.mjs'

export type ShardRow = {
  speciesId: number
  name: string
  count: number
  cardCount: number
  required: number
  drop: number
  types: string[]
}

// a claim just settled: every reader loads again
const listeners = new Set<() => void>()
export const refreshShards = () => listeners.forEach((listener) => listener())

/**
 * The shard pocket: the account's balances (signed in), this browser's
 * journal (yarn dev), nothing for a guest. Kept apart from the item bag: a
 * failed read is an error here, never an empty pocket.
 */
export function useShardStore(enabled: boolean) {
  const account = useAccount()
  const mode = modeFor(account.status)
  const userId = account.user?.id
  const [state, setState] = useState<{
    rows: ShardRow[] | null
    pending: number
    loading: boolean
    error: Error | null
  }>({ rows: null, pending: 0, loading: false, error: null })
  const epoch = useRef(createEpoch())

  const load = useCallback(() => {
    if (!enabled || mode === 'checking') return
    const mine = epoch.current.next()
    setState((s) => ({ ...s, loading: true, error: null }))
    ;(async () => {
      const supabase = mode === 'server' ? await getSupabase() : undefined
      return loadShardRows({ mode, supabase })
    })().then(
      (out: any) => {
        if (epoch.current.isCurrent(mine))
          setState({
            rows: out.rows,
            pending: out.pending,
            loading: false,
            error: out.reconcileError,
          })
      },
      (error: Error) => {
        if (epoch.current.isCurrent(mine))
          setState((s) => ({ ...s, loading: false, error }))
      }
    )
  }, [enabled, mode])

  useEffect(() => {
    // another account or mode: what was loaded is not theirs
    setState({ rows: null, pending: 0, loading: false, error: null })
    load()
    listeners.add(load)
    const onStorage = (event: StorageEvent) => {
      if (mode === 'local' && (event.key === SHARD_KEY || event.key === null))
        load()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      epoch.current.next()
      listeners.delete(load)
      window.removeEventListener('storage', onStorage)
    }
  }, [load, mode, userId])

  return { ...state, retry: load }
}
