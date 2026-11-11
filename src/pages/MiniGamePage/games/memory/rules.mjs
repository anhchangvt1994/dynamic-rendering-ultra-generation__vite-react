// The card flip rules. minigame_flip() in the database applies the same
// ones; this copy runs the practice mode.
const fail = (code) => {
  throw new Error(code)
}

/**
 * state: { open: number|null, matched: number[], flips: number }
 * cards: species id per position. Returns the next state and what the flip showed.
 */
export function applyFlip(state, cards, index) {
  if (!Number.isInteger(index) || index < 0 || index >= cards.length) fail('bad_index')
  if (state.matched.includes(index)) fail('bad_index')
  if (state.open === index) fail('already_open')
  const flips = state.flips + 1
  const face = cards[index]
  if (state.open === null) {
    return {
      state: { open: index, matched: state.matched, flips },
      result: { face, open: index, match: null, with: null, matched: state.matched, flips, done: false },
    }
  }
  const match = cards[state.open] === face
  const matched = match ? [...state.matched, state.open, index] : state.matched
  return {
    state: { open: null, matched, flips },
    result: {
      face,
      open: null,
      match,
      with: state.open,
      matched,
      flips,
      done: matched.length === cards.length,
    },
  }
}
