import { useCallback, useEffect, useRef, useState } from 'react'
import { randomId } from 'utils/secure.mjs'
import { useAccount } from 'app/supabase/account'
import { getSupabase } from 'app/supabase/client'
import { modeFor } from 'pages/QuizPage/engine/mode'
import { createEpoch } from 'pages/BagPage/shards.mjs'
import type { Build } from 'pages/BagPage/individuals/client'
import { refreshBag } from 'pages/BagPage/bagStore'
import {
  awaken as sendAwaken,
  BUILD_ERRORS,
  fetchBuild,
  setMove as sendMove,
  useItem as sendItem,
} from './client.mjs'

export type BuildStatus = 'loading' | 'ready' | 'error' | 'unavailable'

/**
 * One individual's server-computed build. Mutations are idempotent by an
 * operation id kept across a retry after a network error; a reply for
 * another account or individual is dropped.
 */
export function useBuild(individualId: string | null) {
  const account = useAccount()
  const mode = modeFor(account.status)
  const key = `${mode}:${account.user?.id ?? ''}:${individualId ?? ''}`
  const [loaded, setLoaded] = useState<{
    key: string
    build: Build | null
    error: string | null
  }>({ key: '', build: null, error: null })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const epoch = useRef(createEpoch())
  const pending = useRef<{ id: string; what: string } | null>(null)
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
      .then((d) => fetchBuild(d, individualId))
      .then(
        (build: Build) => {
          if (epoch.current.isCurrent(mine))
            setLoaded({ key, build, error: null })
        },
        (error: Error) => {
          if (epoch.current.isCurrent(mine))
            setLoaded({ key, build: null, error: error.message })
        }
      )
    // key carries mode, account and individual
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    pending.current = null
    setActionError(null)
    load()
    const current = epoch.current
    return () => {
      current.next()
    }
  }, [load])

  const run = useCallback(
    async (
      what: string,
      send: (d: Awaited<ReturnType<typeof deps>>, id: string) => Promise<Build>
    ) => {
      if (!individualId || inFlight.current) return null
      const tag = `${key}:${what}`
      if (pending.current?.what !== tag)
        pending.current = { id: randomId(), what: tag }
      const { id } = pending.current
      const mine = epoch.current.next()
      inFlight.current = true
      setBusy(true)
      setActionError(null)
      try {
        const build = await send(await deps(), id)
        pending.current = null
        if (epoch.current.isCurrent(mine))
          setLoaded({ key, build, error: null })
        return build
      } catch (error: any) {
        if (error?.code !== 'network') pending.current = null
        if (epoch.current.isCurrent(mine))
          setActionError(error?.message ?? BUILD_ERRORS.network)
        return null
      } finally {
        inFlight.current = false
        setBusy(false)
      }
    },
    [deps, individualId, key]
  )

  const setMove = useCallback(
    (slot: number, move: string | null) =>
      run(`move:${slot}:${move ?? ''}`, (d, id) =>
        sendMove(d, id, individualId, slot, move)
      ),
    [run, individualId]
  )
  const applyItem = useCallback(
    async (item: string, stat?: number) => {
      const build = await run(`item:${item}:${stat ?? ''}`, (d, id) =>
        sendItem(d, id, individualId, item, stat ?? null)
      )
      if (build) refreshBag()
      return build
    },
    [run, individualId]
  )
  const awaken = useCallback(
    () => run('awaken', (d, id) => sendAwaken(d, id, individualId)),
    [run, individualId]
  )

  const mine = loaded.key === key
  const status: BuildStatus =
    mode !== 'server'
      ? mode === 'checking'
        ? 'loading'
        : 'unavailable'
      : mine && loaded.build
        ? 'ready'
        : mine && loaded.error
          ? 'error'
          : 'loading'
  return {
    build: mine ? loaded.build : null,
    status,
    error: mine ? loaded.error : null,
    retry: load,
    busy,
    actionError,
    setMove,
    applyItem,
    awaken,
  }
}
