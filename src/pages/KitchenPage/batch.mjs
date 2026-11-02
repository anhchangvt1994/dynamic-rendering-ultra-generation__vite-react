// Batch cooking (docs/superpowers/specs/2026-11-02-kitchen-batch-cook-design.md):
// a menu dish cooks 1 to MAX_BATCH portions at once, as the database allows.

export const MAX_BATCH = 99

/** How many portions of a recipe the bag can make (0 when it can't). */
export function batchMax(ingredients, bag) {
  const need = {}
  for (const id of ingredients ?? []) need[id] = (need[id] ?? 0) + 1
  const ids = Object.keys(need)
  if (!ids.length) return 0
  return Math.min(
    MAX_BATCH,
    ...ids.map((id) => Math.floor((bag[id] ?? 0) / need[id]))
  )
}

/** What n portions give: each portion gives what one gives. */
export const scaleStats = (stats, n) =>
  Object.fromEntries(
    Object.entries(stats ?? {}).map(([stat, points]) => [stat, points * n])
  )
