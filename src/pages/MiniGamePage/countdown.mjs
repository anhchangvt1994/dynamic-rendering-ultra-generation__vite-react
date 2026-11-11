// The 5-minute clock runs on the server's time: offsetMs = server - device.
export const remainingMs = ({ deadline, now, offsetMs }) =>
  Math.max(0, new Date(deadline).getTime() - (now + offsetMs))

/** 1 at the start of the round, 0 at its end. */
export const ringProgress = (remaining, total) =>
  Math.min(1, Math.max(0, remaining / total))

/** Every card is matched: the round can be claimed even if its last flip reply was lost. */
export const boardComplete = (view) => view.cards > 0 && view.matched.length === view.cards
