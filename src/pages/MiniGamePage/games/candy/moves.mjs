// The moves of the open Candy Rush round survive a reload (sessionStorage);
// the server replays them again when the round is finished.
export const movesKey = (roundId) => `mg-candy-moves:${roundId}`

const valid = (list) =>
  Array.isArray(list) &&
  list.every((m) => Array.isArray(m) && m.length === 2 && m.every(Number.isInteger))

export const loadMoves = (storage, roundId) => {
  if (!roundId) return []
  try {
    const list = JSON.parse(storage?.getItem(movesKey(roundId)) ?? 'null')
    return valid(list) ? list : []
  } catch {
    return []
  }
}

export const saveMoves = (storage, roundId, moves) => {
  if (!roundId) return
  try {
    storage?.setItem(movesKey(roundId), JSON.stringify(moves))
  } catch {
    /* storage unavailable: the round still plays */
  }
}
