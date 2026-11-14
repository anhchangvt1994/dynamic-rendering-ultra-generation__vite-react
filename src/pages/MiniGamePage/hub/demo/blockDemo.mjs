// The cabinet's Xếp khối run: a small bot plays the real engine with a mixed 7-bag queue.
// Frame = what the screen shows: the bottom ROWS rows of the board, one step at a time.
import { clearedRows, ghostRow, trackSkins, viewCells } from '../../games/block-lab/board-model.mjs'
import { initial, newQueue, shapeCells, step } from '../../games/block-lab/engine.mjs'
import { speciesFor } from '../../games/block-lab/skins.mjs'

export const COMPANION = 6
export const ROWS = 11
export const TOP = 20 - ROWS
const PIECES = 30

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const rate = (s) => {
  let holes = 0
  let heights = 0
  let bump = 0
  let prev = 0
  for (let x = 0; x < 10; x += 1) {
    let top = 20
    for (let y = 0; y < 20; y += 1) if (s.cells[y * 10 + x]) { top = y; break }
    for (let y = top; y < 20; y += 1) if (!s.cells[y * 10 + x]) holes += 1
    heights += 20 - top
    bump += Math.abs(20 - top - prev)
    prev = 20 - top
  }
  return s.lines * 120 - holes * 45 - heights * 2 - bump * 3
}

/** The best landing for the active piece: rotation, shift and the state after a drop. */
function plan(s) {
  let best = null
  for (let rot = 0; rot < 4; rot += 1) {
    for (let dx = -5; dx <= 6; dx += 1) {
      let t = s.t + 1
      let c = s
      for (let r = 0; r < rot && c; r += 1) c = step(c, t++, 2)
      const x0 = c?.active.x
      for (let m = 0; m < Math.abs(dx) && c; m += 1) c = step(c, t++, dx < 0 ? 0 : 1)
      if (!c || c.active.x !== x0 + dx) continue
      const after = step(c, t, 5)
      if (!after) continue
      const v = rate(after)
      if (!best || v > best.v) best = { v, ready: c, after, t }
    }
  }
  return best
}

export function blockFrames() {
  const queue = newQueue(rng(21), 6)
  let s = initial(queue, 1)
  let skins = Array(200).fill(0)
  const frames = []
  const settled = (cells, extra = []) => {
    const out = cells.slice()
    for (const i of extra) out[i] = 0
    return out
  }
  for (let n = 0; n < PIECES && !s.over; n += 1) {
    const best = plan(s)
    if (!best) break
    const { ready, after } = best
    const type = s.active.type
    const hover = shapeCells(type, ready.active.rot).map(([cx, cy]) => (TOP + cy) * 10 + ready.active.x + cx)
    frames.push({ cells: settled(s.cells), skins, hover, type, fresh: [], rows: [] })
    const landing = viewCells({ ...ready, active: { ...ready.active, y: ghostRow(ready) } }).active
    const ids = landing.map((c) => c.i)
    const rows = clearedRows(s.cells, landing)
    const withPiece = s.cells.slice()
    for (const i of ids) withPiece[i] = type + 1
    const skin = speciesFor(COMPANION, s.pieces)
    const landed = skins.slice()
    for (const i of ids) landed[i] = skin
    frames.push({ cells: withPiece, skins: landed, hover: [], type, fresh: ids, rows })
    skins = trackSkins(skins, s, after, landing, skin)
    s = after
    if (rows.length) frames.push({ cells: s.cells.slice(), skins, hover: [], type, fresh: [], rows: [] })
    // keep the stack inside the small window: stop before it climbs out of view
    if (s.cells.findIndex((v) => v) < (TOP + 1) * 10) break
  }
  return frames
}
