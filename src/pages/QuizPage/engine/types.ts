import type { VeilKind } from '../Veil'
import type { Chest } from '../ChestDialog'

/** A round as the page plays it; answerId only when the engine knows it. */
export type PlayRound = {
  id: string
  options: number[]
  veil: VeilKind
  hard: boolean
  gifts: string[]
  /** the gift that also gives a turn back (-1: none) */
  bonus: number
  durationMs: number
  /** how long the veil has been wearing off when the round reaches the page */
  elapsedMs: number
  answerId?: number
}

export type Status = {
  left: number
  /** when the turns come back (ms since epoch), 0 before the first round */
  refillAt: number
  streak: number
  records: number
  recordsTotal: number
  wins: number
  used: number
  bonus: number
  windowGifts: string[]
  rerollsLeft: number
  pending: PlayRound | null
}

export type Verdict = {
  outcome: 'right' | 'wrong' | 'time'
  answerId: number
  slot: number | null
  gift: string | null
  lucky: boolean
  missed: string | null
  chests: Chest[]
  status: Status
}

export type StartOptions = { from: number; to: number; hard: boolean }

/** The game behind the page: in this browser, on the account, or as a guest. */
export interface QuizEngine {
  kind: 'local' | 'server' | 'guest'
  /** guests play without turns, gifts, streak or bag */
  rewards: boolean
  status(): Promise<Status>
  start(options: StartOptions): Promise<PlayRound>
  answer(round: PlayRound, choice: number): Promise<Verdict>
  reroll(round: PlayRound): Promise<PlayRound>
  art(round: PlayRound): string
  cry(round: PlayRound): string
}
