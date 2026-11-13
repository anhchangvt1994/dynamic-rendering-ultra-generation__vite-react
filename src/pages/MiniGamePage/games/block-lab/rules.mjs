const fail = (code) => {
  throw new Error(code)
}

export function createBoard(width, height, cells = []) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
    fail('bad_board')
  if (cells.some((row) => !Array.isArray(row) || row.length !== width)) fail('bad_board')
  const filled = cells.flatMap((row, y) => row.flatMap((value, x) => value ? [[x, y]] : []))
  return { width, height, cells: filled, score: 0, pieces: 0 }
}

export function place(state, piece) {
  if (!Array.isArray(piece) || !piece.length || piece.some(([x, y]) =>
    !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= state.width || y >= state.height,
  )) fail('bad_piece')
  const cells = [...state.cells.map(([x, y]) => [x, y]), ...piece.map(([x, y]) => [x, y])]
  if (new Set(cells.map(([x, y]) => `${x}:${y}`)).size !== cells.length) fail('occupied')
  const full = Array.from({ length: state.height }, (_, y) => y).filter((y) =>
    Array.from({ length: state.width }, (_, x) => cells.some(([cx, cy]) => cx === x && cy === y)).every(Boolean),
  )
  const remaining = cells.filter(([, y]) => !full.includes(y)).map(([x, y]) => [x, y + full.filter((line) => line > y).length])
  const score = state.score + full.length * 100
  return { ...state, cells: remaining, score, pieces: state.pieces + 1, lines: full.length }
}

export const isComplete = (state, target) => state.score >= target
