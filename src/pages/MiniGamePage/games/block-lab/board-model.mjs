import { shapeCells } from './engine.mjs'

const fits = (cells, type, rot, x, y) =>
  shapeCells(type, rot).every(([cx, cy]) => {
    const col = x + cx
    const row = y + cy
    return col >= 0 && col < 10 && row < 20 && (row < 0 || cells[row * 10 + col] === 0)
  })

/** The row the active piece would lock at (its box origin). */
export function ghostRow(state) {
  const { type, rot, x } = state.active
  let y = state.active.y
  while (fits(state.cells, type, rot, x, y + 1)) y += 1
  return y
}

/** Cells to paint: settled ({i,type}), the active piece and its ghost (field squares only). */
export function viewCells(state) {
  const settled = []
  state.cells.forEach((v, i) => v && settled.push({ i, type: v - 1 }))
  const place = (y) =>
    shapeCells(state.active.type, state.active.rot)
      .map(([cx, cy]) => ({ row: y + cy, col: state.active.x + cx }))
      .filter(({ row }) => row >= 0)
      .map(({ row, col }) => ({ i: row * 10 + col, type: state.active.type }))
  return { settled, active: place(state.active.y), ghost: place(ghostRow(state)) }
}

/** Rows that are full once `landing` ({i}) cells are added to `cells`. */
export function clearedRows(cells, landing) {
  const all = cells.slice()
  for (const { i } of landing) all[i] = 1
  const rows = []
  for (let r = 0; r < 20; r += 1) if (all.slice(r * 10, r * 10 + 10).every(Boolean)) rows.push(r)
  return rows
}

/** Carries each cell's Pokémon: the landing piece gets `species`, cleared rows drop out. */
export function trackSkins(skins, old, next, landing, species) {
  if (next.pieces === old.pieces) return skins
  const grid = skins.slice()
  for (const { i } of landing) grid[i] = species
  const all = old.cells.slice()
  for (const { i } of landing) all[i] = 1
  const keep = []
  for (let r = 0; r < 20; r += 1) if (!all.slice(r * 10, r * 10 + 10).every(Boolean)) keep.push(r)
  const out = Array(200).fill(0)
  keep.forEach((r, k) => {
    const to = k + (20 - keep.length)
    for (let c = 0; c < 10; c += 1) out[to * 10 + c] = grid[r * 10 + c]
  })
  return out
}
