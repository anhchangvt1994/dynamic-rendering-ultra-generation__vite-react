import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount } from 'app/supabase/account'
import { getSupabase } from 'app/supabase/client'
import { modeFor, type QuizMode } from 'pages/QuizPage/engine/mode'
import { createEpoch } from 'pages/BagPage/shards.mjs'
import {
  MINIGAME_ERRORS,
  finishRound,
  flipCard,
  readCares,
  readStatus,
  setAvatar,
  setTeam,
  startRound,
} from './client.mjs'
import { createPractice } from './practice.mjs'

export type FlipResult = {
  face: number
  open: number | null
  match: boolean | null
  with: number | null
  matched: number[]
  flips: number
  done: boolean
}
export type RoundView = {
  cols: number
  cards: number
  matched: number[]
  open: number | null
  faces: Record<string, number>
}
export type Receipt = {
  round: string
  status: 'won' | 'lost' | 'expired'
  difficulty: number
  exp: number
  gifts: string[]
  cost: { hunger: number; clean: number; fun: number }
  xp: number
  level: number
  levelUp: boolean
  badges: string[]
  needs: { hunger: number; clean: number; fun: number } | null
  flips: number
}
export type MiniGameStatus = {
  trainer: {
    xp: number
    level: number
    avatar: string
    team: string[]
    slots: number
    owned: number
    badges: { id: string; at: string }[]
  }
  games: Record<string, { left: number; resetAt: string | null; wins: number }>
  open: {
    round: string
    game: string
    individualId: string | null
    difficulty: number
    startedAt: string
    deadline: string
    view: RoundView
  } | null
  now: string
}

const depsFor = async (mode: QuizMode) => ({
  mode,
  supabase: mode === 'server' ? await getSupabase() : undefined,
})

/**
 * The trainer's mini game state. Server mode talks to the account; a guest
 * or the local mode only practices. A late reply for another account is
 * dropped; `serverOffsetMs` turns the device clock into the server's.
 */
export function useMiniGame() {
  const account = useAccount()
  const mode = modeFor(account.status)
  const key = `${mode}:${account.user?.id ?? ''}`
  const [loaded, setLoaded] = useState<{
    key: string
    status: MiniGameStatus | null
    error: Error | null
    offset: number
  }>({ key: '', status: null, error: null, offset: 0 })
  const epoch = useRef(createEpoch())

  const refresh = useCallback(async () => {
    if (mode !== 'server') return null
    const mine = epoch.current.next()
    try {
      const sent = Date.now()
      const status = (await readStatus(await depsFor(mode))) as MiniGameStatus
      const offset = new Date(status.now).getTime() - (sent + Date.now()) / 2
      if (epoch.current.isCurrent(mine))
        setLoaded({ key, status, error: null, offset })
      return status
    } catch (error: any) {
      if (epoch.current.isCurrent(mine))
        setLoaded({ key, status: null, error, offset: 0 })
      return null
    }
    // key carries mode and account
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    refresh()
    const current = epoch.current
    return () => {
      current.next()
    }
  }, [refresh])

  // every action throws an Error with a code; the caller shows its message
  const run = useCallback(
    async <T,>(fn: (deps: Awaited<ReturnType<typeof depsFor>>) => Promise<T>) =>
      fn(await depsFor(mode)),
    [mode]
  )

  const start = useCallback(
    (args: { game: string; individualId: string; difficulty: number }) =>
      run((deps) => startRound(deps, args)),
    [run]
  )
  // a flip never refetches: the reply carries everything the board needs
  const flip = useCallback(
    (args: { round: string; index: number }): Promise<FlipResult> =>
      run((deps) => flipCard(deps, args)),
    [run]
  )
  const finish = useCallback(
    async (args: { round: string }): Promise<Receipt> => {
      const receipt = await run((deps) => finishRound(deps, args))
      await refresh()
      return receipt
    },
    [run, refresh]
  )
  const chooseAvatar = useCallback(
    async (avatar: string) => {
      await run((deps) => setAvatar(deps, avatar))
      await refresh()
    },
    [run, refresh]
  )
  const chooseTeam = useCallback(
    async (ids: string[]) => {
      await run((deps) => setTeam(deps, ids))
      await refresh()
    },
    [run, refresh]
  )
  const cares = useCallback(() => run((deps) => readCares(deps)), [run])
  const practice = useCallback(
    (difficulty: number) => createPractice({ difficulty }),
    []
  )

  const mine = loaded.key === key
  return {
    mode,
    status: mine ? loaded.status : null,
    loading: mode === 'checking' || (mode === 'server' && !mine),
    error: mine ? loaded.error : null,
    serverOffsetMs: mine ? loaded.offset : 0,
    refresh,
    start,
    flip,
    finish,
    setAvatar: chooseAvatar,
    setTeam: chooseTeam,
    practice,
    cares,
    errors: MINIGAME_ERRORS,
  }
}
