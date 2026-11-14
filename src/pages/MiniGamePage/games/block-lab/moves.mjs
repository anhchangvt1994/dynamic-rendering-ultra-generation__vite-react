// The timed inputs of the open Block Lab round survive a reload (sessionStorage);
// the server replays them when the round is finished.
export const movesKey = (roundId) => `mg-block-moves:${roundId}`

const valid = (list) =>
  Array.isArray(list) && list.every((e) => Array.isArray(e) && e.length === 2 && e.every(Number.isInteger))

export const loadLog = (storage, roundId) => {
  if (!roundId) return []
  try {
    const list = JSON.parse(storage?.getItem(movesKey(roundId)) ?? 'null')
    return valid(list) ? list : []
  } catch {
    return []
  }
}

export const saveLog = (storage, roundId, log) => {
  if (!roundId) return
  try {
    storage?.setItem(movesKey(roundId), JSON.stringify(log))
  } catch {
    /* storage unavailable: the round still plays */
  }
}
