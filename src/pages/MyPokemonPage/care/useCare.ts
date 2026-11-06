import { useCallback, useEffect, useRef, useState } from 'react'
import { randomId } from 'utils/secure.mjs'
import { useAccount } from 'app/supabase/account'
import { getSupabase } from 'app/supabase/client'
import { modeFor, type QuizMode } from 'pages/QuizPage/engine/mode'
import { createEpoch } from 'pages/BagPage/shards.mjs'
import type { Individual } from 'pages/BagPage/individuals/client'
import {
  CARE_ERRORS,
  CARE_KEY,
  localJournal,
  readCare,
  sendCare,
} from './client.mjs'

export type CareAction = 'feed' | 'bathe' | 'pet'
export type CareState = {
  needs: { hunger: number; clean: number; fun: number }
  needsAt: string
  affection: number
  stats: Record<
    'power' | 'beauty' | 'happiness' | 'agility' | 'wisdom' | 'friendship',
    number
  >
  lastCaredAt: string | null
  moodEvent: 'liked' | 'disliked' | 'overpet' | null
  moodEventAt: string | null
  petWindowStart: string | null
  petWindowCount: number
  bathedAt: string | null
}
export type CareReceipt = {
  operationId: string
  individualId: string
  action: CareAction
  care: CareState
  dishId?: string
  dishCount?: number
}

const depsFor = async (mode: QuizMode) => ({
  mode,
  supabase: mode === 'server' ? await getSupabase() : undefined,
  journal: mode === 'local' ? await localJournal() : undefined,
})

const TICK = 60_000

/**
 * One individual's care: read on open, ticking clock for decay and mood,
 * actions idempotent by an operation id kept across a retry after a network
 * error. A reply for another account or individual is dropped.
 */
export function useCare(individual: Individual | null) {
  const account = useAccount()
  const mode = modeFor(account.status)
  const userId = account.user?.id ?? ''
  const key = `${mode}:${userId}:${individual?.id ?? ''}`
  const [loaded, setLoaded] = useState<{
    key: string
    state: CareState | null
    error: Error | null
  }>({ key: '', state: null, error: null })
  const [now, setNow] = useState(() => new Date())
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionCode, setActionCode] = useState<string | null>(null)
  const epoch = useRef(createEpoch())
  const pending = useRef<{ id: string; what: string } | null>(null)
  const inFlight = useRef(false)

  const load = useCallback(() => {
    if (!individual || (mode !== 'server' && mode !== 'local')) return
    const mine = epoch.current.next()
    depsFor(mode)
      .then((deps) => readCare(deps, individual))
      .then(
        (state: CareState) => {
          if (epoch.current.isCurrent(mine))
            setLoaded({ key, state, error: null })
        },
        (error: Error) => {
          if (epoch.current.isCurrent(mine))
            setLoaded({ key, state: null, error })
        }
      )
    // key carries mode, account and individual
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    pending.current = null
    setActionError(null)
    setActionCode(null)
    load()
    const onStorage = (event: StorageEvent) => {
      if (mode === 'local' && (event.key === CARE_KEY || event.key === null))
        load()
    }
    window.addEventListener('storage', onStorage)
    const current = epoch.current
    return () => {
      current.next()
      window.removeEventListener('storage', onStorage)
    }
  }, [load, mode])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), TICK)
    return () => window.clearInterval(timer)
  }, [])

  const act = useCallback(
    async (action: CareAction, dishId?: string) => {
      if (!individual || inFlight.current) return null
      const what = `${key}:${action}:${dishId ?? ''}`
      // a retry after a network error resends the same operation
      if (pending.current?.what !== what)
        pending.current = { id: randomId(), what }
      const { id } = pending.current
      const mine = epoch.current.next()
      inFlight.current = true
      setBusy(true)
      setActionError(null)
      setActionCode(null)
      try {
        const receipt = (await sendCare(
          await depsFor(mode),
          id,
          action,
          individual,
          dishId
        )) as CareReceipt
        pending.current = null
        if (epoch.current.isCurrent(mine)) {
          setLoaded({ key, state: receipt.care, error: null })
          setNow(new Date())
        }
        return receipt
      } catch (error: any) {
        if (error?.code !== 'network') pending.current = null
        if (epoch.current.isCurrent(mine)) {
          setActionError(error?.message ?? CARE_ERRORS.network)
          setActionCode(error?.code ?? 'network')
        }
        return null
      } finally {
        inFlight.current = false
        setBusy(false)
      }
    },
    [individual, key, mode]
  )

  const mine = loaded.key === key
  return {
    state: mine ? loaded.state : null,
    error: mine ? loaded.error : null,
    retry: load,
    now,
    busy,
    actionError,
    actionCode,
    act,
  }
}
