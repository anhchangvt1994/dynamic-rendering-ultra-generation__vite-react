import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { randomId } from 'utils/secure.mjs'
import { useAccount } from 'app/supabase/account'
import { getSupabase } from 'app/supabase/client'
import { modeFor } from 'pages/QuizPage/engine/mode'
import { createEpoch } from 'pages/BagPage/shards.mjs'
import { refreshBag } from 'pages/BagPage/bagStore'
import { refreshIndividuals } from 'pages/BagPage/individuals/individualStore'
import { buildDiff } from '../build/format.mjs'
import { fetchBuild } from '../build/client.mjs'
import { bumpEvolution, useEvolutionRev } from './evolutionStore'
import {
  EVOLUTION_ERRORS,
  fetchEvolutionOptions,
  sendEvolve,
} from './client.mjs'
import { itemBranches, readyBranches } from './format.mjs'

export type EvolutionStatus = 'loading' | 'ready' | 'error' | 'unavailable'
export type Receipt = {
  from: number
  to: number
  first: boolean
  item: string | null
  levelBefore: number
  levelAfter: number
  build: any
  dropped: string[]
}
export type EvolveResult = {
  receipt: Receipt
  diff: { stats: number[] } | null
}

/**
 * One individual's evolution options, from the server. `evolve` is idempotent
 * by an operation id kept across a retry after a network error.
 */
export function useEvolution(individualId: string | null, version = 0) {
  const account = useAccount()
  const mode = modeFor(account.status)
  const rev = useEvolutionRev()
  const key = `${mode}:${account.user?.id ?? ''}:${individualId ?? ''}`
  const [loaded, setLoaded] = useState<{
    key: string
    options: any
    error: string | null
  }>({ key: '', options: null, error: null })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const epoch = useRef(createEpoch())
  const pending = useRef<{ id: string; what: string; before: any } | null>(null)
  const inFlight = useRef(false)

  const deps = useCallback(
    async () => ({
      mode,
      supabase: mode === 'server' ? await getSupabase() : undefined,
    }),
    [mode]
  )

  const load = useCallback(() => {
    if (!individualId || mode !== 'server') return
    const mine = epoch.current.next()
    deps()
      .then((d) => fetchEvolutionOptions(d, individualId))
      .then(
        (options: any) => {
          if (epoch.current.isCurrent(mine))
            setLoaded({ key, options, error: null })
        },
        (error: Error) => {
          if (epoch.current.isCurrent(mine))
            setLoaded({ key, options: null, error: error.message })
        }
      )
    // key carries mode, account and individual
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    pending.current = null
    setActionError(null)
    const current = epoch.current
    return () => {
      current.next()
    }
  }, [key])

  // care moved the level, or another reader evolved something: fetch again,
  // keeping the old options on screen meanwhile
  useEffect(() => {
    load()
  }, [load, version, rev])

  const evolve = useCallback(
    async (branch: number, item?: string): Promise<EvolveResult | null> => {
      if (!individualId || inFlight.current) return null
      const what = `${key}:${branch}:${item ?? ''}`
      if (pending.current?.what !== what)
        pending.current = { id: randomId(), what, before: undefined }
      const op = pending.current
      inFlight.current = true
      setBusy(true)
      setActionError(null)
      try {
        const d = await deps()
        if (op.before === undefined)
          op.before = await fetchBuild(d, individualId).catch(() => null)
        const receipt: Receipt = await sendEvolve(
          d,
          op.id,
          individualId,
          branch,
          { item: item ?? null }
        )
        pending.current = null
        const diff = op.before
          ? buildDiff({ ...op.before, species: receipt.build?.species }, receipt.build)
          : null
        refreshBag()
        refreshIndividuals()
        bumpEvolution()
        return { receipt, diff }
      } catch (error: any) {
        if (error?.code !== 'network') pending.current = null
        setActionError(error?.message ?? EVOLUTION_ERRORS.network)
        return null
      } finally {
        inFlight.current = false
        setBusy(false)
      }
    },
    [deps, individualId, key]
  )

  const mine = loaded.key === key
  const options = mine ? loaded.options : null
  const status: EvolutionStatus =
    mode !== 'server'
      ? mode === 'checking'
        ? 'loading'
        : 'unavailable'
      : mine && loaded.options
        ? 'ready'
        : mine && loaded.error
          ? 'error'
          : 'loading'
  const ready = useMemo(() => readyBranches(options), [options])
  const items = useMemo(() => itemBranches(options), [options])
  return {
    options,
    status,
    ready,
    items,
    busy,
    error: actionError ?? (mine ? loaded.error : null),
    retry: load,
    evolve,
  }
}
