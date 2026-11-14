import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount } from 'app/supabase/account'
import { getSupabase } from 'app/supabase/client'
import { setTrainerAvatar } from 'app/supabase/trainerAvatar'
import { modeFor, type QuizMode } from 'pages/QuizPage/engine/mode'
import { createEpoch } from 'pages/BagPage/shards.mjs'
import {
  MINIGAME_ERRORS,
  claimQuest,
  finishRound,
  flipCard,
  removeTilePair,
  shuffleTiles,
  spinLucky,
  readCares,
  readStatus,
  readAvatarImage,
  readTeams,
  saveTeams,
  switchTeam,
  setAvatar,
  setTeam,
  uploadAvatar,
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
export type MemoryView = {
  kind: 'memory'
  cols: number
  cards: number
  matched: number[]
  open: number | null
  faces: Record<string, number>
}
export type CandyView = {
  kind: 'candy'
  cols: number
  rows: number
  kinds: number
  movesMax: number
  target: number
  board: number[]
  tape: number[]
  pos: number
}
export type TileSafariView = { kind: 'tile-safari'; rows: number; cols: number; tiles: number[]; removed: number[]; shuffles: number }
export type BlockLabView = { kind: 'block-lab'; difficulty: number; width: number; height: number; queue: number[]; speciesId: number; goal: number; elapsedMs: number; durationMs: number }
export type SilhouetteView = { kind: 'silhouette-atelier'; difficulty: number; cols: number; rows: number; rot: number[]; artSpeciesId: number; elapsedMs: number; durationMs: number }
export type SpinStep = {
  grid: number[]
  lines: { row: number; start: number; len: number; sym: number; pts: number }[]
  swept: boolean
  pts: number
  streak: number
  mult10: number
  score: number
  total: number
}
export type SpinResult = {
  spin: SpinStep
  spins: number
  total: number
  done: boolean
  outcome?: string | null
  rewards?: { xp: number; items: string[] } | null
  receipt?: Receipt
}
export type LuckySpinView = { kind: 'lucky-spin'; difficulty: number; spun: boolean; spins?: SpinStep[]; total?: number; streak?: number }
export type RoundView = MemoryView | CandyView | TileSafariView | BlockLabView | SilhouetteView | LuckySpinView
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
  comboLen: number
  combo: number
  needs: { hunger: number; clean: number; fun: number } | null
  flips?: number | null
  score?: number | null
  moves?: number | null
  spinOutcome?: string | null
  spinRewards?: { xp: number; items: string[] } | null
  reward?: string
}
export type QuestItem = {
  slot: number
  kind: string
  goal: number
  progress: number
  xp: number
  claimed: boolean
  gift: { items: string[]; streakGift: string[] | null } | null
}
export type ClaimReceipt = {
  slot: number
  xp: number
  gift: string[]
  streak: number
  streakGift: string[] | null
  level: number
  levelUp: boolean
}
export type OpenRound = {
  round: string
  game: string
  individualId: string | null
  difficulty: number
  startedAt: string
  deadline: string
  view: RoundView
}
export type MiniGameStatus = {
  trainer: {
    xp: number
    level: number
    avatar: string
    team: string[]
    slots: number
    owned: number
  }
  quests: {
    day: string
    streak: number
    streakDay: string | null
    items: QuestItem[]
  }
  games: Record<string, { left: number; resetAt: string | null; wins: number }>
  open: OpenRound | null
  opens?: Record<string, OpenRound>
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

  const trainerAvatar = loaded.status?.trainer?.avatar
  const userId = account.user?.id
  useEffect(() => {
    if (userId && trainerAvatar) setTrainerAvatar(userId, trainerAvatar)
  }, [userId, trainerAvatar])

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
  const removePair = useCallback((args: { round: string; a: number; b: number }) => run((deps) => removeTilePair(deps,args)), [run])
  const shuffle = useCallback((args: { round: string }) => run((deps) => shuffleTiles(deps, args)), [run])
  const spin = useCallback((args: { round: string }) => run((deps) => spinLucky(deps,args)), [run])
  const finish = useCallback(
    async (args: { round: string; moves?: number[][] }): Promise<Receipt> => {
      const receipt = await run((deps) => finishRound(deps, args))
      await refresh()
      return receipt
    },
    [run, refresh]
  )
  const claim = useCallback(
    async (slot: number): Promise<ClaimReceipt> => {
      const receipt = await run((deps) => claimQuest(deps, { slot }))
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
  const sendAvatar = useCallback(
    async (image: string) => {
      await run((deps) => uploadAvatar(deps, image))
      if (account.user?.id) setTrainerAvatar(account.user.id, 'custom', image)
      await refresh()
    },
    [run, refresh, account.user?.id]
  )
  const avatarImage = useCallback(() => run((deps) => readAvatarImage(deps)), [run])
  const teamsRead = useCallback(() => run((deps) => readTeams(deps)), [run])
  const teamsSave = useCallback(
    async (teams: { slot: number; name: string; members: string[] }[], active: number) => {
      await run((deps) => saveTeams(deps, teams, active))
      await refresh()
    },
    [run, refresh]
  )
  const teamSwitch = useCallback(
    async (slot: number) => {
      await run((deps) => switchTeam(deps, slot))
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
    (game: string, difficulty: number) => createPractice({ game, difficulty }),
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
    removePair,
    shuffle,
    spin,
    finish,
    claim,
    setAvatar: chooseAvatar,
    uploadAvatar: sendAvatar,
    avatarImage,
    setTeam: chooseTeam,
    readTeams: teamsRead,
    saveTeams: teamsSave,
    switchTeam: teamSwitch,
    practice,
    cares,
    errors: MINIGAME_ERRORS,
  }
}
