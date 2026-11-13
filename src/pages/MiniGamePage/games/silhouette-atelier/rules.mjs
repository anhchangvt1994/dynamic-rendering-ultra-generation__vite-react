const fail = (code) => {
  throw new Error(code)
}

export function createPuzzle(speciesId, pieceCount) {
  if (!Number.isInteger(speciesId) || speciesId < 1 || speciesId > 1025 || !Number.isInteger(pieceCount) || pieceCount < 2 || pieceCount > 16)
    fail('bad_puzzle')
  return { speciesId, pieces: Array.from({ length: pieceCount }, (_, i) => i), placed: [], solved: false }
}

export function answer(puzzle, speciesId) {
  return speciesId === puzzle.speciesId
}
