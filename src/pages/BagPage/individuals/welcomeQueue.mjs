// Welcomes wait in a queue of groups: one trade is a group of one, a batch is
// one group of all its receipts, so the player meets them together.

/** The queue with the receipts not already waiting added as one group. */
export function enqueueWelcome(queue, receipts) {
  const seen = new Set(
    queue.flatMap((group) => group.receipts.map((r) => r.operationId))
  )
  const fresh = receipts.filter((r) => !seen.has(r.operationId))
  return fresh.length ? [...queue, { receipts: fresh }] : queue
}
