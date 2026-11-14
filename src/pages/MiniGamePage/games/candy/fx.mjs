// Pure helpers behind Candy Rush's visual layer (no rules here: the engine decides every match).

/** Runs of 3+ inside a set of cleared cells, their longest, a crossing cell (L/T/+), and how many separate blobs. */
export function analyze(cells, cols, rows, board) {
  const set = new Set(cells)
  const same = (a, b) => !board || board[a] === board[b]
  const runs = []
  const scan = (dir, outer, inner, at) => {
    for (let o = 0; o < outer; o += 1) {
      let run = []
      for (let i = 0; i <= inner; i += 1) {
        const cell = i < inner ? at(o, i) : -1
        if (cell >= 0 && set.has(cell) && (!run.length || same(run[run.length - 1], cell))) run.push(cell)
        else {
          if (run.length >= 3) runs.push({ dir, cells: run })
          run = cell >= 0 && set.has(cell) ? [cell] : []
        }
      }
    }
  }
  scan('row', rows, cols, (r, c) => r * cols + c)
  scan('col', cols, rows, (c, r) => r * cols + c)
  let cross = null
  const rowCells = new Set(runs.filter((r) => r.dir === 'row').flatMap((r) => r.cells))
  for (const r of runs) if (r.dir === 'col') for (const c of r.cells) if (cross === null && rowCells.has(c)) cross = c
  const seen = new Set()
  let groups = 0
  for (const start of cells) {
    if (seen.has(start)) continue
    groups += 1
    const stack = [start]
    seen.add(start)
    while (stack.length) {
      const c = stack.pop()
      const r = Math.floor(c / cols)
      const x = c % cols
      for (const [dr, dx] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = r + dr
        const nx = x + dx
        if (nr < 0 || nr >= rows || nx < 0 || nx >= cols) continue
        const n = nr * cols + nx
        if (set.has(n) && !seen.has(n) && same(c, n)) {
          seen.add(n)
          stack.push(n)
        }
      }
    }
  }
  return { runs, cross, groups, longest: Math.max(0, ...runs.map((r) => r.cells.length)) }
}

const WORDS = ['', 'Ngọt lịm!', 'Ngon tuyệt!', 'Thần sầu!', 'HUYỀN THOẠI!']

/** The banner for one cascade step: tier 0 (none) to 4, its word, and the chain label from ×2. */
export function calloutFor(depth, a) {
  const byDepth = depth >= 6 ? 4 : depth >= 4 ? 3 : depth === 3 ? 2 : depth === 2 ? 1 : 0
  const byShape = a.longest >= 5 || a.cross !== null ? 2 : a.longest === 4 ? 1 : 0
  const tier = Math.max(byDepth, byShape)
  return { tier, text: WORDS[tier], chain: depth > 1 ? `Chuỗi ×${depth}` : null }
}

/** Mean [row, col] of a set of cells. */
export function centroid(cells, cols) {
  const n = cells.length || 1
  return [cells.reduce((s, c) => s + Math.floor(c / cols), 0) / n, cells.reduce((s, c) => s + (c % cols), 0) / n]
}

/** Per final cell: how many rows it falls once `cleared` is removed (spawned cells fall by the count cleared in their column). */
export function fallRows(cleared, cols, rows) {
  const out = new Array(cols * rows).fill(0)
  const gone = new Set(cleared)
  for (let c = 0; c < cols; c += 1) {
    let k = 0
    for (let r = rows - 1; r >= 0; r -= 1) {
      if (gone.has(r * cols + c)) {
        k += 1
        continue
      }
      out[(r + k) * cols + c] = k
    }
    for (let r = 0; r < k; r += 1) out[r * cols + c] = k
  }
  return out
}

const hasLine = (b, cols, rows) => {
  for (let r = 0; r < rows; r += 1)
    for (let c = 0; c < cols; c += 1) {
      const v = b[r * cols + c]
      if (c + 2 < cols && b[r * cols + c + 1] === v && b[r * cols + c + 2] === v) return true
      if (r + 2 < rows && b[(r + 1) * cols + c] === v && b[(r + 2) * cols + c] === v) return true
    }
  return false
}

/** A swap of two neighbours that lines up 3+, or null. */
export function hintMove(board, cols, rows) {
  const n = cols * rows
  for (let i = 0; i < n; i += 1)
    for (const j of [i % cols < cols - 1 ? i + 1 : -1, i + cols < n ? i + cols : -1]) {
      if (j < 0) continue
      const b = board.slice()
      ;[b[i], b[j]] = [b[j], b[i]]
      if (hasLine(b, cols, rows)) return [i, j]
    }
  return null
}
