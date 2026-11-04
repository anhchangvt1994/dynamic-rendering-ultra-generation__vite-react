// Which Pokémon a round asks about: mostly the player's collection when it is
// big enough to vary, mostly others when it is not. The database's
// quiz_pick_answer (20261109000000_quiz_collection_mix.sql) follows the same
// rule: change both together.

export const FULL_AT = 10
export const IN_SHARE_FULL = 0.7
export const IN_SHARE_SMALL = 0.2
/** the last answers an answer may not repeat */
export const ANSWER_MEMORY = 10

/** The chance that the answer comes from the collection. */
export function inShare(inCount) {
  if (inCount <= 0) return 0
  return inCount >= FULL_AT ? IN_SHARE_FULL : IN_SHARE_SMALL
}

/**
 * The answer of a round: a species of from..to. `collection` may hold
 * anything (species outside the range and repeats are ignored); `recent`
 * has the newest answer first.
 */
export function pickAnswer(random, { from, to, collection, recent }) {
  const owned = new Set([...collection].filter((id) => id >= from && id <= to))
  const share = inShare(owned.size)
  const ids = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const pick = (pool) => pool[Math.floor(random() * pool.length)]
  const groups = (memory) => {
    const spent = new Set(memory)
    return {
      inside: [...owned].filter((id) => !spent.has(id)),
      outside: ids.filter((id) => !owned.has(id) && !spent.has(id)),
    }
  }

  const wantInside = random() < share
  // the memory shrinks from its oldest end only when both groups are spent
  const last = Math.min(1, recent.length)
  for (
    let keep = Math.min(recent.length, ANSWER_MEMORY);
    keep >= last;
    keep--
  ) {
    const { inside, outside } = groups(recent.slice(0, keep))
    const [first, second] = wantInside ? [inside, outside] : [outside, inside]
    if (first.length) return pick(first)
    if (second.length) return pick(second)
  }
  return pick(ids)
}
