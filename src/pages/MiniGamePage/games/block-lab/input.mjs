const MODIFIERS = ['altKey', 'ctrlKey', 'metaKey']

/** Maps one keyboard key to Block Lab's actions; false when the key is not ours. */
export function createBlockInput(actions) {
  return (key, modifiers = {}) => {
    if (MODIFIERS.some((modifier) => modifiers[modifier])) return false
    const k = key.length === 1 ? key.toLowerCase() : key
    if (k === 'ArrowLeft') actions.move(-1)
    else if (k === 'ArrowRight') actions.move(1)
    else if (k === 'ArrowUp' || k === 'x') actions.rotate(1)
    else if (k === 'z') actions.rotate(-1)
    else if (k === 'ArrowDown' || k === ' ') actions.hard()
    else return false
    return true
  }
}

/** How many repeats a held touch button owes after `heldMs`. */
export const holdTicks = (heldMs, delay = 160, rate = 50) => (heldMs < delay ? 0 : 1 + Math.floor((heldMs - delay) / rate))
