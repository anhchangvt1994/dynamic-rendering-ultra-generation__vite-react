// A queue of evolution requests shared by every page (like the welcome dialog).
// Pure: each call returns a new array.
export const enqueueEvolution = (queue, request) =>
  queue.some((r) => r.id === request.id) ? queue : [...queue, request]

export const dismissEvolution = (queue) => queue.slice(1)

/** "Để sau" holds until the set of ready branches changes. */
export const snoozeKey = (individualId, options) =>
  `${individualId}:${(options?.branches ?? [])
    .filter((b) => b.alts.some((a) => a.ok && a.kind !== 'item'))
    .map((b) => b.to)
    .sort((a, b) => a - b)
    .join(',')}`
