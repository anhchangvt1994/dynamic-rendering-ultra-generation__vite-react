const fail = (code) => {
  throw new Error(code)
}

export function createBoard(tiles, layers = tiles.map(() => 0)) {
  if (!Array.isArray(tiles) || !tiles.length || tiles.length !== layers.length)
    fail('bad_board')
  return { tiles: [...tiles], layers: [...layers], removed: [] }
}

export function exposed(state) {
  return state.tiles.flatMap((_, i) => {
    if (state.removed.includes(i)) return []
    const above = state.layers[i] > 0 && state.layers.some((layer, j) =>
      j !== i && layer > state.layers[i] && !state.removed.includes(j),
    )
    const col = i % 4
    const leftBlocked = col > 0 && !state.removed.includes(i - 1)
    const rightBlocked = col < 3 && !state.removed.includes(i + 1)
    return !above && (!leftBlocked || !rightBlocked) ? [i] : []
  })
}

export function removePair(state, a, b) {
  if (a === b || !exposed(state).includes(a) || !exposed(state).includes(b))
    fail('blocked_tile')
  if (state.tiles[a] !== state.tiles[b]) fail('not_a_pair')
  return { ...state, removed: [...state.removed, a, b].sort((x, y) => x - y) }
}

export const isComplete = (state) => state.removed.length === state.tiles.length
