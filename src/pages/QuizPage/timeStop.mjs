// The page's side of the Roar of Time (engine/rules.mjs has the rules)
import { TIME_CHARGES, TIME_WINDOW_MS } from './engine/rules.mjs'

/**
 * Answers come back out of order: a status asked before a verdict can land
 * after it. Each request takes a ticket when it is sent; one older than the
 * last accepted is dropped.
 */
export function createLatest() {
  let issued = 0
  let shown = 0
  return {
    ticket: () => ++issued,
    accept(ticket) {
      if (ticket < shown) return false
      shown = ticket
      return true
    },
  }
}

const REFUSALS = {
  no_time: 'Hết lượt Gầm Thời Gian',
  time_used: 'Vòng này đã được dừng rồi',
  time_over: 'Hết giờ rồi, không dừng kịp',
  answered: 'Vòng này đã kết thúc',
  no_round: 'Vòng này đã kết thúc',
}

/** What the page says when a stop is refused (else the network failed). */
export const refusalNote = (code) =>
  REFUSALS[code] ?? 'Chưa dừng được thời gian, thử lại nhé'

/**
 * A stop granted: one charge fewer on the page, nothing else touched (the
 * engine's next status has the rest). The first of a window starts its hour.
 */
export function spendCharge(status, now) {
  if (!status) return status
  const fresh = !status.timeRefillAt || status.timeRefillAt <= now
  return {
    ...status,
    timeLeft: Math.max(0, (fresh ? TIME_CHARGES : status.timeLeft) - 1),
    timeRefillAt: fresh ? now + TIME_WINDOW_MS : status.timeRefillAt,
  }
}
