// Chọn cặp, the Pikachu-classic rule: two tiles of one species vanish when a line of at most
// two turns joins them through empty cells (the border ring one cell wide counts as empty).
// supabase/migrations/…_minigame_tile_safari.sql runs the same checks.
const fail = (code) => {
  throw new Error(code)
}

export const SIZES = {
  1: { rows: 6, cols: 6, kinds: 9 },
  2: { rows: 8, cols: 6, kinds: 12 },
  3: { rows: 8, cols: 7, kinds: 14 },
}
export const SHUFFLES = 3

export function createBoard({ rows, cols, tiles, removed = [] }) {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || !Array.isArray(tiles) || tiles.length !== rows * cols)
    fail('bad_board')
  return { rows, cols, tiles: [...tiles], removed: [...removed].sort((x, y) => x - y) }
}

const empty = (s, r, c) => {
  if (r < -1 || r > s.rows || c < -1 || c > s.cols) return false
  if (r < 0 || r >= s.rows || c < 0 || c >= s.cols) return true
  return s.removed.includes(r * s.cols + c)
}

const clear = (s, [r1, c1], [r2, c2]) => {
  if (r1 !== r2 && c1 !== c2) return false
  const dr = Math.sign(r2 - r1)
  const dc = Math.sign(c2 - c1)
  let r = r1 + dr
  let c = c1 + dc
  while (r !== r2 || c !== c2) {
    if (!empty(s, r, c)) return false
    r += dr
    c += dc
  }
  return true
}

const turn = (s, p, q) => {
  for (const k of [[p[0], q[1]], [q[0], p[1]]])
    if (empty(s, k[0], k[1]) && clear(s, p, k) && clear(s, k, q)) return [p, k, q]
  return null
}

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]
const tidy = (path) => path.filter((p, i) => i === 0 || p[0] !== path[i - 1][0] || p[1] !== path[i - 1][1])

/** Cells (row, col) of a path between two tiles, border ring included, or null. */
export function findPath(s, a, b) {
  const A = [Math.floor(a / s.cols), a % s.cols]
  const B = [Math.floor(b / s.cols), b % s.cols]
  if (clear(s, A, B)) return [A, B]
  const one = turn(s, A, B)
  if (one) return tidy(one)
  for (const [dr, dc] of DIRS) {
    let r = A[0] + dr
    let c = A[1] + dc
    while (empty(s, r, c)) {
      const two = turn(s, [r, c], B)
      if (two) return tidy([A, ...two])
      r += dr
      c += dc
    }
  }
  return null
}

export function removePair(s, a, b) {
  const ok =
    Number.isInteger(a) && Number.isInteger(b) && a !== b && a >= 0 && b >= 0 && a < s.tiles.length && b < s.tiles.length &&
    !s.removed.includes(a) && !s.removed.includes(b) && s.tiles[a] === s.tiles[b] && findPath(s, a, b)
  if (!ok) fail('bad_pair')
  return { ...s, removed: [...s.removed, a, b].sort((x, y) => x - y) }
}

/** A pair that can be removed now (for the hint and the stuck check), or null. */
export function hasMove(s) {
  for (let i = 0; i < s.tiles.length - 1; i += 1) {
    if (s.removed.includes(i)) continue
    for (let j = i + 1; j < s.tiles.length; j += 1)
      if (!s.removed.includes(j) && s.tiles[j] === s.tiles[i] && findPath(s, i, j)) return [i, j]
  }
  return null
}

export const isComplete = (s) => s.removed.length === s.tiles.length

/** Deals the tiles still on the board again, on the same cells, until a move exists. */
export function shuffle(s, random = Math.random) {
  const cells = s.tiles.flatMap((_, i) => (s.removed.includes(i) ? [] : [i]))
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const kinds = cells.map((i) => s.tiles[i])
    for (let i = kinds.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1))
      ;[kinds[i], kinds[j]] = [kinds[j], kinds[i]]
    }
    const tiles = [...s.tiles]
    cells.forEach((cell, k) => {
      tiles[cell] = kinds[k]
    })
    const next = { ...s, tiles }
    if (hasMove(next)) return next
  }
  return s
}

/** A fresh board: four copies of `kinds` species dealt until a move exists. */
export function deal(difficulty, species, random = Math.random) {
  const { rows, cols, kinds } = SIZES[difficulty]
  const pool = [...species]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const chosen = pool.slice(0, kinds)
  return shuffle(createBoard({ rows, cols, tiles: [...chosen, ...chosen, ...chosen, ...chosen] }), random)
}
