import type { PlayRound, QuizEngine, Status, Verdict } from './types'

// the RPCs of supabase/migrations/20261101000000_quiz_game.sql
type Rpc = (
  name: string,
  args?: Record<string, unknown>
) => PromiseLike<{ data: any; error: { message: string } | null }>
type Client = { rpc: Rpc }

const toRound = (round: any): PlayRound => ({
  id: round.id,
  // none for a typed round: the name is typed, not picked
  options: round.options ?? [],
  veil: round.veil,
  hard: round.hard,
  gifts: round.gifts,
  bonus: round.bonus,
  durationMs: round.duration_ms,
  // the server's own clock: started_at against its now, not this device's
  elapsedMs: Math.max(0, Date.parse(round.now) - Date.parse(round.started_at)),
})

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
  pending: data.pending ? toRound(data.pending) : null,
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
        chests: data.chests ?? [],
        status: toStatus({ ...data, pending: null }),
      }
    },
    art: (round) => `/api/quiz-art/${round.id}`,
    cry: (round) => `/api/quiz-cry/${round.id}`,
  }
}
