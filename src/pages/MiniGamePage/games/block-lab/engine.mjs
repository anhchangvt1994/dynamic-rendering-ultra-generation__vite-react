// Block Lab rules: a falling-block game on a 10x20 field, SRS rotation, 7-bag queue.
// Pure and deterministic with integer math only: the database ports it line by line
// (supabase/migrations/20261123000300_minigame_block_guideline.sql) and replays the
// player's timed inputs. Time is in whole milliseconds from the round's start.
export const W = 10
export const H = 20
export const MAX_EVENTS = 6000
/** Milliseconds per cell, one entry per 10 s of the round: round(90 + 710 * (1 - i/31) ** 1.6), so it only ever speeds up. */
export const GRAVITY_MS = [800, 764, 728, 693, 659, 626, 593, 561, 530, 500, 471, 442, 414, 388, 362, 336, 312, 289, 267, 246, 225, 206, 188, 171, 156, 141, 128, 117, 107, 99, 93]
/** A piece resting on something locks this long after it lands (instead of a whole gravity step). */
export const LOCK_MS = 450
/** Each difficulty starts 6 steps (60 s) further along the curve. */
export const TIME_STEP_MS = 10000
export const START_STEPS = [0, 6, 12]
export const LINE_SCORE = [0, 100, 300, 500, 800]
export const LINE_GOALS = [10, 20, 30]

export const intervalAt = (t, difficulty) => GRAVITY_MS[Math.min(GRAVITY_MS.length - 1, Math.floor(t / TIME_STEP_MS) + (START_STEPS[difficulty - 1] ?? 0))]
export const lineGoal = (difficulty) => LINE_GOALS[difficulty - 1] ?? LINE_GOALS[0]

// piece indexes: I O T S Z J L
const BASE = [
  [[0, 1], [1, 1], [2, 1], [3, 1]],
  [[1, 0], [2, 0], [1, 1], [2, 1]],
  [[1, 0], [0, 1], [1, 1], [2, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[2, 0], [0, 1], [1, 1], [2, 1]],
]
const BOX = [4, 4, 3, 3, 3, 3, 3]
const SHAPES = BASE.map((cells, type) => {
  const turns = [cells]
  for (let r = 1; r < 4; r += 1) {
    const prev = turns[r - 1]
    turns.push(type === 1 ? prev : prev.map(([x, y]) => [BOX[type] - 1 - y, x]))
  }
  return turns
})
/** The four cells of a piece in its 3x3 / 4x4 box, y down. */
export const shapeCells = (type, rot) => SHAPES[type][rot]

// SRS wall kicks, "from>to" rotation states (0 spawn, 1 right, 2 flipped, 3 left).
// Offsets are the wiki's (x right, y UP): the engine subtracts y.
export const KICKS_JLSTZ = {
  '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  10: [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  12: [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  21: [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  23: [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  32: [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  30: [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
}
export const KICKS_I = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  10: [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  12: [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  21: [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  23: [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  32: [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  30: [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
}

/** Concatenated shuffled bags of the seven pieces. */
export function newQueue(random, bags = 200) {
  const out = []
  for (let b = 0; b < bags; b += 1) {
    const bag = [0, 1, 2, 3, 4, 5, 6]
    for (let i = 6; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1))
      ;[bag[i], bag[j]] = [bag[j], bag[i]]
    }
    out.push(...bag)
  }
  return out
}

const fits = (cells, type, rot, x, y) =>
  shapeCells(type, rot).every(([cx, cy]) => {
    const col = x + cx
    const row = y + cy
    return col >= 0 && col < W && row < H && (row < 0 || cells[row * W + col] === 0)
  })

const spawn = (queue, idx) => ({ type: queue[idx % queue.length], rot: 0, x: 3, y: -1 })

export function initial(queue, difficulty) {
  const active = spawn(queue, 0)
  return {
    queue,
    difficulty,
    cells: Array(W * H).fill(0),
    active,
    idx: 0,
    score: 0,
    lines: 0,
    level: difficulty,
    pieces: 0,
    over: false,
    won: false,
    t: 0,
    fallAt: intervalAt(0, difficulty),
  }
}

const finished = (s) => s.over || s.won

// the active piece becomes part of the field; rows clear, the next piece spawns
function lock(s, now) {
  const cells = s.cells.slice()
  let above = false
  for (const [cx, cy] of shapeCells(s.active.type, s.active.rot)) {
    const row = s.active.y + cy
    if (row < 0) above = true
    else cells[row * W + s.active.x + cx] = s.active.type + 1
  }
  if (above) return { ...s, cells, over: true, t: now }
  const keep = []
  for (let r = 0; r < H; r += 1) if (cells.slice(r * W, r * W + W).some((v) => v === 0)) keep.push(r)
  const cleared = H - keep.length
  let next = cells
  if (cleared > 0) {
    next = Array(W * H).fill(0)
    keep.forEach((r, i) => {
      const to = i + cleared
      for (let c = 0; c < W; c += 1) next[to * W + c] = cells[r * W + c]
    })
  }
  const lines = s.lines + cleared
  const score = s.score + LINE_SCORE[cleared] * s.level
  const level = s.difficulty + Math.floor(lines / 10)
  const idx = s.idx + 1
  const base = { ...s, cells: next, lines, score, level, pieces: s.pieces + 1, idx, t: now }
  if (lines >= lineGoal(s.difficulty)) return { ...base, won: true }
  const active = spawn(s.queue, idx)
  if (!fits(next, active.type, 0, active.x, active.y)) return { ...base, active, over: true }
  return { ...base, active, fallAt: now + intervalAt(now, s.difficulty) }
}

/** Applies every gravity tick due at or before `t`. */
export function advance(state, t) {
  let s = state
  while (!finished(s) && s.fallAt <= t) {
    const due = s.fallAt
    const a = s.active
    if (!fits(s.cells, a.type, a.rot, a.x, a.y + 1)) {
      s = lock(s, due)
      continue
    }
    const y = a.y + 1
    const grounded = !fits(s.cells, a.type, a.rot, a.x, y + 1)
    s = { ...s, active: { ...a, y }, fallAt: due + (grounded ? LOCK_MS : intervalAt(due, s.difficulty)), t: due }
  }
  return finished(s) ? s : { ...s, t }
}

// after a move the wait to the next gravity step follows the piece's footing:
// resting on something it locks within LOCK_MS, in the air it keeps the normal pace
function settleWait(s, t) {
  const a = s.active
  const grounded = !fits(s.cells, a.type, a.rot, a.x, a.y + 1)
  if (grounded) return { ...s, fallAt: Math.min(s.fallAt, t + LOCK_MS) }
  const pace = intervalAt(t, s.difficulty)
  return s.fallAt - t > pace || s.fallAt - t < pace ? { ...s, fallAt: Math.max(s.fallAt, t + 1) } : s
}

function rotateActive(s, dir) {
  const a = s.active
  if (a.type === 1) return s
  const to = (a.rot + dir + 4) % 4
  const kicks = (a.type === 0 ? KICKS_I : KICKS_JLSTZ)[`${a.rot}${to}`]
  for (const [dx, dy] of kicks) {
    if (fits(s.cells, a.type, to, a.x + dx, a.y - dy)) return { ...s, active: { type: a.type, rot: to, x: a.x + dx, y: a.y - dy } }
  }
  return s
}

/**
 * One input at time `t`: gravity first, then the action. Codes: 0 left, 1 right,
 * 2 rotate clockwise, 3 rotate counter-clockwise, 4 soft drop, 5 hard drop.
 * Returns null for an illegal input.
 */
export function step(state, t, code) {
  if (!Number.isInteger(t) || !Number.isInteger(code) || code < 0 || code > 5 || t < state.t) return null
  if (finished(state)) return state
  let s = advance(state, t)
  if (finished(s)) return s
  const a = s.active
  if (code <= 1) {
    const x = a.x + (code === 0 ? -1 : 1)
    return fits(s.cells, a.type, a.rot, x, a.y) ? settleWait({ ...s, active: { ...a, x } }, t) : s
  }
  if (code <= 3) return settleWait(rotateActive(s, code === 2 ? 1 : -1), t)
  if (code === 4) return fits(s.cells, a.type, a.rot, a.x, a.y + 1) ? settleWait({ ...s, active: { ...a, y: a.y + 1 }, score: s.score + 1 }, t) : s
  let y = a.y
  while (fits(s.cells, a.type, a.rot, a.x, y + 1)) y += 1
  return lock({ ...s, active: { ...a, y }, score: s.score + 2 * (y - a.y) }, t)
}

/** Plays a timed input log against a queue and runs gravity on to `endMs`. */
export function replay(queue, difficulty, log, endMs) {
  const bad = (state) => ({ ok: false, state, won: false, over: false })
  let s = initial(queue, difficulty)
  if (!Array.isArray(log) || log.length > MAX_EVENTS || !Number.isInteger(endMs)) return bad(s)
  for (const event of log) {
    if (!Array.isArray(event) || event.length !== 2 || event[0] > endMs) return bad(s)
    const next = step(s, event[0], event[1])
    if (!next) return bad(s)
    s = next
  }
  s = advance(s, endMs)
  return { ok: true, state: s, won: s.won && !s.over, over: s.over }
}
