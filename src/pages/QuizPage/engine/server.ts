import type { PlayRound, QuizEngine, Status, Verdict } from './types'
import { parseReceipt } from '../shards/receipt.mjs'
import { parseChestReceipt } from '../shards/chestReceipt.mjs'
import { freezeLeft, roundClock } from './rules.mjs'

// the RPCs of supabase/migrations/20261101000000_quiz_game.sql and
// 20261102000000_quiz_time.sql (unopened chests: 20261115000000)
type Rpc = (
  name: string,
  args?: Record<string, unknown>
) => PromiseLike<{ data: any; error: { message: string } | null }>
type Client = { rpc: Rpc }

const toRound = (round: any): PlayRound => {
  // the server's own clock: started_at against its now, not this device's
  const started = Date.parse(round.started_at)
  const real = Date.parse(round.now) - started
  const frozenAtMs = round.frozen_at
    ? Date.parse(round.frozen_at) - started
    : null
  return {
    id: round.id,
    // none for a typed round: the name is typed, not picked
    options: round.options ?? [],
    veil: round.veil,
    hard: round.hard,
    gifts: round.gifts,
    bonus: round.bonus,
    durationMs: round.duration_ms,
    elapsedMs: Math.max(0, roundClock(real, frozenAtMs)),
    frozenAtMs,
    freezeLeftMs: freezeLeft(real, frozenAtMs),
    removed: round.removed ?? [],
    letter: round.letter ?? null,
  }
}

const toStatus = (data: any): Status => ({
  left: data.left,
  refillAt: data.refill_at ? Date.parse(data.refill_at) : 0,
  streak: data.streak,
  records: data.records,
  recordsTotal: data.records_total,
  wins: data.wins,
  used: data.used,
  bonus: data.bonus,
  windowGifts: data.window_gifts ?? [],
  rerollsLeft: data.rerolls_left,
  timeLeft: data.time_left ?? 0,
  timeRefillAt: data.time_refill_at ? Date.parse(data.time_refill_at) : 0,
  pending: data.pending ? toRound(data.pending) : null,
  chests: (data.chests ?? []).map((chest: any) => ({
    kind: chest.kind,
    gifts: chest.gifts,
    round: chest.round,
    roundId: chest.chest_reward_version === 1 ? chest.round : undefined,
  })),
})

/**
 * The account's game: every round made, timed and judged by the database.
 * The answer is never here before the verdict; the artwork and the cry come
 * through the server by the round's id (server/src/api/routes/quiz).
 */
export function createServerEngine(supabase: Client): QuizEngine {
  const call = async (name: string, args?: Record<string, unknown>) => {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw new Error(error.message)
    return data
  }
  return {
    kind: 'server',
    rewards: true,
    async status() {
      return toStatus(await call('quiz_status'))
    },
    async start({ from, to, hard }) {
      return toRound(
        await call('quiz_start', { p_from: from, p_to: to, p_hard: hard })
      )
    },
    async reroll(round) {
      return toRound(await call('quiz_reroll', { p_round: round.id }))
    },
    async timeStop(round) {
      return toRound(await call('quiz_time_stop', { p_round: round.id }))
    },
    async timeRefill() {
      return toStatus(await call('quiz_time_refill'))
    },
    async answer(round, choice): Promise<Verdict> {
      const data = await call('quiz_answer', {
        p_round: round.id,
        p_choice: choice,
      })
      return {
        outcome: data.outcome,
        answerId: data.answer_id,
        slot: data.slot,
        gift: data.gift,
        lucky: data.lucky,
        missed: data.missed,
        chests: (data.chests ?? []).map((chest: any) => ({
          ...chest,
          round: round.id,
          // legacy rounds (before chest shards) have items only
          roundId: data.chest_reward_version === 1 ? round.id : undefined,
        })),
        status: toStatus({ ...data, pending: null, chests: [] }),
      }
    },
    async openChests(round) {
      await call('quiz_open_chests', { p_round: round })
    },
    async claimShard(roundId) {
      return parseReceipt(await call('quiz_claim_shard', { p_round: roundId }))
    },
    async reconcileShards() {
      const data = await call('quiz_reconcile_shards')
      if (!Array.isArray(data)) throw new Error('bad_receipt')
      return data.map(parseReceipt)
    },
    async claimChestShards(roundId, kind) {
      return parseChestReceipt(
        await call('quiz_claim_chest_shards', {
          p_round: roundId,
          p_kind: kind,
        })
      )
    },
    async reconcileChestShards() {
      const rows = await call('quiz_reconcile_chest_shards')
      if (!Array.isArray(rows)) throw new Error('bad_receipt')
      return rows.map(parseChestReceipt)
    },
    art: (round) => `/api/quiz-art/${round.id}`,
    cry: (round) => `/api/quiz-cry/${round.id}`,
  }
}
