// The moves of an open jigsaw survive a reload (sessionStorage); the server replays them at finish.
export const movesKey = (roundId) => `mg-jigsaw-moves:${roundId}`
const valid = (list) => Array.isArray(list) && list.every((m) => Array.isArray(m) && m.length === 3 && m.every(Number.isInteger))
export const loadLog = (storage, roundId) => {
  if (!roundId) return []
  try {
    const list = JSON.parse(storage?.getItem(movesKey(roundId)) ?? 'null')
    return valid(list) ? list : []
  } catch { return [] }
}
export const saveLog = (storage, roundId, log) => {
  if (!roundId) return
  try { storage?.setItem(movesKey(roundId), JSON.stringify(log)) } catch { /* storage unavailable; the round still plays */ }
}
