// What Who's That Pokémon? remembers between visits: turns, the bag, the streak, the
// records and the round being played. All in this browser's storage.

const store = () => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}
export function readJSON(key, fallback, storage = store()) {
  try {
    const value = JSON.parse(storage?.getItem(key) ?? 'null')
    return value ?? fallback
  } catch {
    return fallback
  }
}
export function saveJSON(key, value, storage = store()) {
  try {
    if (value === null) storage?.removeItem(key)
    else storage?.setItem(key, JSON.stringify(value))
  } catch {
    // private mode / quota: it still counts for this visit
  }
}

export const readCount = (key, storage) =>
  Math.max(0, Math.floor(Number(readJSON(key, 0, storage)) || 0))
export const saveCount = (key, value, storage) =>
  saveJSON(key, Math.max(0, value), storage)

// ── turns: 5 per 3 hours, the 3 hours counted from the first round ──
export const TURNS = 5
export const WINDOW_MS = 3 * 60 * 60 * 1000
// wins and gifts: what this window paid, for the recap when it runs out
const FRESH = { start: 0, used: 0, bonus: 0, wins: 0, gifts: [], rerolls: 0 }

/** The turns as they stand at `now`: a window that ran out starts over. */
export function currentTurns(turns, now) {
  const value = { ...FRESH, ...turns }
  if (!value.start || now >= value.start + WINDOW_MS) return { ...FRESH }
  return value
}
export const turnsLeft = (turns) =>
  Math.max(0, TURNS + turns.bonus - turns.used)
/** When the window ends and all turns come back (0 before the first round). */
export const refillAt = (turns) => (turns.start ? turns.start + WINDOW_MS : 0)

/** A round begins: one turn spent; the first one starts the window. */
export function spendTurn(turns, now) {
  const value = currentTurns(turns, now)
  if (!turnsLeft(value)) return value
  return { ...value, start: value.start || now, used: value.used + 1 }
}

/** A lucky gift: one turn back, never above the full five. */
export function giveTurn(turns) {
  if (turnsLeft(turns) >= TURNS) return turns
  return { ...turns, bonus: turns.bonus + 1 }
}

/** A right answer in this window, and the gift it won. */
export function recordWin(turns, gift) {
  return {
    ...turns,
    wins: (turns.wins ?? 0) + 1,
    gifts: [...(turns.gifts ?? []), gift].slice(-12),
  }
}

// ── the bag: { [item id]: count } ──
export function addToBag(bag, ids) {
  const next = { ...bag }
  for (const id of ids) next[id] = (next[id] ?? 0) + 1
  return next
}
export const bagSize = (bag) =>
  Object.values(bag).reduce((sum, count) => sum + (Number(count) || 0), 0)

/** A count on a small badge: never wider than four characters. */
export const badgeCount = (n) => (n > 999 ? '999+' : String(Math.max(0, n)))
/** A count written out in full, grouped the Vietnamese way (1.234). */
export const fullCount = (n) => Math.max(0, n).toLocaleString('vi-VN')

// ── streaks and records ──
// NOTE - 5 in a row pays a chest (10 at first): more items for the players,
// to raise their Pokémon with later. The database's quiz_answer
// (20261102000000_quiz_time.sql) pays at the same streak
export const COMBO_AT = 5
export const SPECIAL_AT = 10

/**
 * A right answer: the streak grows; at 5 it pays a chest and starts over,
 * and the record it adds may complete the 10 that pay the special chest.
 */
export function addWin({ streak, records }) {
  const next = streak + 1
  if (next < COMBO_AT)
    return { streak: next, records, combo: false, special: false }
  const total = records + 1
  return {
    streak: 0,
    records: total >= SPECIAL_AT ? 0 : total,
    combo: true,
    special: total >= SPECIAL_AT,
  }
}
