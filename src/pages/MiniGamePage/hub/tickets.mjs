/** Per-turn ticket state: the first `left` stubs are ready, the rest torn; unknown `left` -> 'wait'. */
export function ticketStates(left, total) {
  if (left === null || left === undefined) return Array.from({ length: total }, () => 'wait')
  const n = Number.isFinite(left) ? Math.max(0, Math.min(total, Math.floor(left))) : 0
  return Array.from({ length: total }, (_, i) => (i < n ? 'ready' : 'torn'))
}

/** One-line booth text. Unknown turns (status not loaded yet) never pretend to be full. */
export function boothLabel({ server, left, total, resetText }) {
  if (!server) return 'Chơi thử, không mất lượt'
  if (left === null || left === undefined) return 'Đang tải lượt…'
  if (left > 0) return `Còn ${left}/${total} lượt`
  return `Hết lượt${resetText ? `, thêm sau ${resetText}` : ''}`
}

/** A stub tears only when a known count goes down; the first load never does. */
export function shouldTear(prev, next) {
  return typeof prev === 'number' && typeof next === 'number' && next < prev
}
