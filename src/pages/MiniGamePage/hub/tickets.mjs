/** Per-turn ticket state: the first `left` stubs are ready, the rest torn. */
export function ticketStates(left, total) {
  const n = Number.isFinite(left) ? Math.max(0, Math.min(total, Math.floor(left))) : 0
  return Array.from({ length: total }, (_, i) => (i < n ? 'ready' : 'torn'))
}
