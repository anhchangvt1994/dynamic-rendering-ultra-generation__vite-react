// A secret's right ingredients found so far (its clue's `kept`) in the pot
// (docs/superpowers/specs/2026-11-03-kitchen-kept-design.md).

/** The pot for a hunt: the kept the bag has first, then what was in it. */
export function potWithKept(kept, pot, bag, size = 4) {
  const left = { ...bag }
  const take = (id) => (left[id] ?? 0) > 0 && (left[id] -= 1) >= 0
  const out = kept.filter(take)
  const owed = {}
  for (const id of out) owed[id] = (owed[id] ?? 0) + 1
  for (const id of pot) {
    if (owed[id] > 0) owed[id] -= 1
    else if (take(id)) out.push(id)
  }
  return out.slice(0, size)
}

/** Which of the pot's slots hold a kept ingredient. */
export function pinnedOf(kept, pot) {
  const left = {}
  for (const id of kept) left[id] = (left[id] ?? 0) + 1
  return pot.map((id) => left[id] > 0 && (left[id] -= 1) >= 0)
}

/** The kept not in the pot. */
export function missingOf(kept, pot) {
  const have = {}
  for (const id of pot) have[id] = (have[id] ?? 0) + 1
  return kept.filter((id) => !(have[id] > 0 && (have[id] -= 1) >= 0))
}
