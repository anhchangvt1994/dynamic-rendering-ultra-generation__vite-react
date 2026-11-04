// The game's rules shared by the browser engines, the same as the database's
// (supabase/migrations/20261101000000_quiz_game.sql): keep the two in step.
import { SLOT_AT, roundGifts } from '../items.mjs'
import { pickVeil } from '../quiz.mjs'
import { ANSWER_MEMORY, pickAnswer } from './collection.mjs'
import { LETTERS } from './letters.mjs'

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
 * A new round in the Pokédex range: the answer by the collection's rule
 * (collection.mjs), three other options none of which is among the last
 * ANSWER_MEMORY answers (an answer is not drawn again that soon, so one of
 * those could be crossed off) when the range has enough others, the options in a random order; a veil unlike the last, the
 * gifts.
 */
export function drawRound(
  random,
  { from, to, hard, recent = [], lastVeil, collection = [] }
) {
  const ids = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const lately = recent.slice(0, ANSWER_MEMORY)
  const answerId = pickAnswer(random, { from, to, collection, recent: lately })
  const others = ids.filter((id) => id !== answerId)
  const fresh = others.filter((id) => !lately.includes(id))
  const options = [answerId]
  for (const pool of [fresh, others]) {
    const left = pool.filter((id) => !options.includes(id))
    while (options.length < 4 && left.length)
      options.push(left.splice(Math.floor(random() * left.length), 1)[0])
  }
  // the answer's place among the four is the last draw of the shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
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
 * clock ran meanwhile), less what of it time was stopped (`stop`, page times).
 */
export function veilElapsed(round, receivedAt, loadedAt, stop = null) {
  return (
    round.elapsedMs +
    Math.max(0, loadedAt - receivedAt) -
    stopped(stop, receivedAt, loadedAt)
  )
}

/** How much of `from`..`to` time was stopped (`stop`: {at, until}). */
export function stopped(stop, from, to) {
  if (!stop) return 0
  return Math.max(0, Math.min(to, stop.until) - Math.max(from, stop.at))
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

// NOTE - The Roar of Time (supabase/migrations/20261102000000_quiz_time.sql):
// a charge stops a round's clock for 30 s, so its gift holds and its end
// moves; 10 charges, full again 1 hour after the first use
export const FREEZE_MS = 30000
export const TIME_CHARGES = 10
export const TIME_WINDOW_MS = 60 * 60 * 1000
// NOTE - What is left of the veil once time is stopped, and how fast it
// gets there. The veils distort in proportion: half of one still hides the
// shape, a fifth leaves it readable (a 22 px ripple, pieces turned 24° at
// most, a beam over the whole Pokémon)
export const VEIL_AFTER_STOP = 0.2
// the silhouette lit up meanwhile: its colours show through the black
export const SILHOUETTE_LIT = 0.35
const VEIL_STOP_MS = 1000

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const ease = (t) => t * t * (3 - 2 * t)

/** The round's clock: the time since it started, less its stop. */
export function roundClock(elapsedMs, frozenAtMs) {
  if (frozenAtMs == null) return elapsedMs
  return elapsedMs - clamp(elapsedMs - frozenAtMs, 0, FREEZE_MS)
}

/** How much of the stop is still to run. */
export function freezeLeft(elapsedMs, frozenAtMs) {
  if (frozenAtMs == null) return 0
  return clamp(frozenAtMs + FREEZE_MS - elapsedMs, 0, FREEZE_MS)
}

// how far the stop's change has gone, `stoppedForMs` after it (0 → 1)
const stopEase = (stoppedForMs) =>
  stoppedForMs == null ? 0 : ease(clamp(stoppedForMs / VEIL_STOP_MS, 0, 1))

/** The share of the veil shown, `stoppedForMs` after time was stopped. */
export function veilScale(stoppedForMs) {
  return VEIL_AFTER_STOP + (1 - VEIL_AFTER_STOP) * (1 - stopEase(stoppedForMs))
}

/** How lit the silhouette is, `stoppedForMs` after time was stopped. */
export function silhouetteLit(stoppedForMs) {
  return SILHOUETTE_LIT * stopEase(stoppedForMs)
}

/** The charges at `now`: full again once their window is over. */
export function timeState(stored, now) {
  const start = stored?.start ?? 0
  if (!start || now >= start + TIME_WINDOW_MS) return { start: 0, used: 0 }
  return { start, used: stored.used ?? 0 }
}

export const timeLeft = (state) => Math.max(0, TIME_CHARGES - state.used)
export const timeRefillAt = (state) =>
  state.start ? state.start + TIME_WINDOW_MS : 0
export const spendTime = (state, now) => ({
  start: state.start || now,
  used: state.used + 1,
})

// NOTE - Palkia's help (20261103000000_quiz_palkia.sql), drawn with each
// stop: half of them take 2 wrong options away (typed rounds have none),
// and on a draw of their own 1 in 5 tell the name's first letter
export const PALKIA_ODDS = 0.5
export const HINT_ODDS = 0.2

/** The 2 wrong options Palkia takes away, or none. */
export function palkiaRemoves(random, round) {
  if (round.hard || random() >= PALKIA_ODDS) return []
  const wrong = round.options.filter((id) => id !== round.answerId)
  const first = wrong.splice(Math.floor(random() * wrong.length), 1)[0]
  return [first, wrong[Math.floor(random() * wrong.length)]]
}

/** The first letter of the answer's name, or null. */
export function palkiaHint(random, round) {
  return random() < HINT_ODDS ? LETTERS[round.answerId - 1] : null
}
