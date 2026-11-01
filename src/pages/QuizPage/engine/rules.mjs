// The game's rules shared by the browser engines, the same as the database's
// (supabase/migrations/20261101000000_quiz_game.sql): keep the two in step.
import { SLOT_AT, roundGifts } from '../items.mjs'
import { pickVeil } from '../quiz.mjs'

// the network's share of a server answer's time, granted to every answer
export const GRACE_MS = 400
export const DURATION_MS = { easy: 14000, hard: 22000 }
// the choice the page sends when the veil ran out
export const TIME_UP = -2
// answers not drawn again for this many rounds
export const RECENT = 30
// free swaps of a broken artwork per window
export const MAX_REROLLS = 3

/** The gift slot an answer at `elapsedMs` wins, -1 once the veil is gone. */
export function slotAt(elapsedMs, durationMs) {
  const t = Math.min(1, Math.max(0, elapsedMs - GRACE_MS) / durationMs)
  const k = 1 - t * t * (3 - 2 * t)
  return SLOT_AT.findIndex((at) => k > at)
}

/** Right, wrong or too late; the gift won or missed. */
export function verdictOf(round, choice, elapsedMs) {
  const slot = slotAt(elapsedMs, round.durationMs)
  const outcome =
    // -2: the page saw the veil run out (its clock has no grace)
    choice === TIME_UP || elapsedMs >= round.durationMs + GRACE_MS || slot < 0
      ? 'time'
      : choice === round.answerId
        ? 'right'
        : 'wrong'
  return {
    outcome,
    slot: outcome === 'time' ? null : slot,
    gift: outcome === 'right' ? (round.gifts[slot] ?? null) : null,
    missed: outcome === 'wrong' ? (round.gifts[slot] ?? null) : null,
    lucky: outcome === 'right' && round.bonus === slot,
  }
}

/**
 * A new round in the Pokédex range: four options, none among the recent
 * answers (one of those would give the answer away), one of them the
 * answer; a veil unlike the last, the gifts.
 */
export function drawRound(random, { from, to, hard, recent = [], lastVeil }) {
  const ids = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const pick = (pool) => pool[Math.floor(random() * pool.length)]
  const fresh = ids.filter((id) => !recent.includes(id))
  const pool = fresh.length >= 4 ? fresh : ids
  const options = []
  while (options.length < 4) {
    const id = pick(pool)
    if (!options.includes(id)) options.push(id)
  }
  const answerId = pick(options)
  return {
    answerId,
    options,
    veil: pickVeil(random, lastVeil),
    hard: Boolean(hard),
    durationMs: hard ? DURATION_MS.hard : DURATION_MS.easy,
    ...roundGifts(random, { hard }),
  }
}

/**
 * Where the veil stands when the artwork shows: the round's clock when it
 * reached the page, plus the time the artwork took to load (the server's
 * clock ran meanwhile).
 */
export function veilElapsed(round, receivedAt, loadedAt) {
  return round.elapsedMs + Math.max(0, loadedAt - receivedAt)
}

/** A number for the veil's pattern, from the round's id (FNV-1a). */
export function veilSeed(round) {
  let hash = 2166136261
  for (const char of String(round.id)) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0 || 1
}
