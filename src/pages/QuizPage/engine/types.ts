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
  /** when time was stopped (the round's real ms since it started), or null */
  frozenAtMs: number | null
  /** how much of the stop was still to run when the round reached the page */
  freezeLeftMs: number
  /** the wrong options Palkia took away when time was stopped (none: []) */
  removed: number[]
  /** the first letter of the name Palkia told, or null */
  letter: string | null
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
  /** charges of the Roar of Time left, and when they are full again (0: unused) */
  timeLeft: number
  timeRefillAt: number
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

export type ShardReceipt = {
  roundId: string
  speciesId: number
  state: 'pending' | 'awarded' | 'not_awarded' | 'ineligible'
  count: number
  required: number | null
  drop: number | null
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
  /** the Roar of Time on a round: its clock stops for 15 s */
  timeStop(round: PlayRound): Promise<PlayRound>
  /** the Roar of Time out of turns: a new window at once */
  timeRefill(): Promise<Status>
  /** settles the shard of an answered round (once; a retry is the same receipt) */
  claimShard(roundId: string): Promise<ShardReceipt>
  /** settles the caller's pending shards (a catalog that came late) */
  reconcileShards(): Promise<ShardReceipt[]>
  art(round: PlayRound): string
  cry(round: PlayRound): string
}
