// Ghép mảnh Pokémon (jigsaw): drag pieces into the frame and tap to turn them a quarter.
// Pure rules, integer math. The database ports them (supabase/migrations/20261123000600_minigame_jigsaw.sql);
// vectors.json keeps both in step. Piece id = home cell index; a piece is done when it sits in its home
// cell upright (rot 0) — done pieces are locked.
export const GRIDS = [[2, 3], [3, 3], [3, 4]]
export const MAX_EVENTS = 2000
export const TURN = -2
export const TRAY = -1

export const gridFor = (difficulty) => {
  const [cols, rows] = GRIDS[difficulty - 1] ?? GRIDS[0]
  return { cols, rows }
}

/** Starting turn of every piece: easy none, normal any, hard always crooked. */
export function startTurns(random, count, difficulty) {
  return Array.from({ length: count }, () =>
    difficulty === 1 ? 0 : difficulty === 2 ? Math.floor(random() * 4) : 1 + Math.floor(random() * 3))
}

export const initialState = (rot) => ({ rot: rot.slice(), at: rot.map(() => -1) })
export const isLocked = (s, i) => s.at[i] === i && s.rot[i] === 0
export const isSolved = (s) => s.at.every((cell, i) => cell === i) && s.rot.every((r) => r === 0)
export const lockedCount = (s) => s.at.filter((cell, i) => cell === i && s.rot[i] === 0).length

/** One action on piece `i`: TURN (-2) a quarter clockwise, TRAY (-1) back to the tray, or a cell index to drop into. Null if illegal. */
export function apply(s, i, code) {
  const n = s.at.length
  if (!Number.isInteger(i) || !Number.isInteger(code) || i < 0 || i >= n || isLocked(s, i)) return null
  const next = { rot: s.rot.slice(), at: s.at.slice() }
  if (code === TURN) {
    next.rot[i] = (s.rot[i] + 1) % 4
    return next
  }
  if (code === TRAY) {
    if (s.at[i] < 0) return null
    next.at[i] = -1
    return next
  }
  if (code < 0 || code >= n) return null
  const other = s.at.indexOf(code)
  if (other === i) return null
  if (other >= 0) {
    if (isLocked(s, other)) return null
    next.at[other] = -1
  }
  next.at[i] = code
  return next
}

/** Plays a log of [t_ms, piece, code] against the layout `{ rot }`. */
export function replay(layout, log, endMs) {
  let state = initialState(layout.rot)
  const bad = (moves) => ({ ok: false, moves, solved: false, state })
  if (!Array.isArray(log) || log.length > MAX_EVENTS || !Number.isInteger(endMs)) return bad(0)
  let last = 0
  let moves = 0
  for (const event of log) {
    if (!Array.isArray(event) || event.length !== 3 || !event.every(Number.isInteger)) return bad(moves)
    if (event[0] < last || event[0] > endMs || isSolved(state)) return bad(moves)
    const next = apply(state, event[1], event[2])
    if (!next) return bad(moves)
    state = next
    last = event[0]
    moves += 1
  }
  return { ok: true, moves, solved: isSolved(state), state }
}
