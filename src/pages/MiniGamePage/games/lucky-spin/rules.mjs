// Lucky Spin: 3 rows x 5 reels, 3 spins per round, one reward at the end.
// Port to SQL: supabase/migrations/20261123000500_minigame_lucky_grid.sql (keep in step).
export const SPIN = {
  COLS: 5,
  ROWS: 3,
  SPINS: 3,
  SPECIES: [25, 133, 448, 6, 150],
  WEIGHTS_CUM: [34, 60, 80, 93, 100],
  SYMBOL_PTS: [1, 2, 3, 5, 8],
  RUN_MULT: [0, 0, 0, 1, 3, 8],
  SWEEP_MULT: 2,
  STREAK10: [10, 15, 20],
  TIERS: { uncommon: 4, rare: 12 },
  XP_STEP: 3,
  XP_MAX: 5,
  ITEM_STEP: 2,
  ITEM_MAX: 5,
}

const fail = (code) => {
  throw new Error(code)
}

export function drawGrid(random) {
  const size = SPIN.COLS * SPIN.ROWS
  return Array.from({ length: size }, () => {
    const value = random()
    if (!Number.isFinite(value) || value < 0 || value >= 1) fail('bad_random')
    const n = Math.floor(value * 100)
    return SPIN.WEIGHTS_CUM.findIndex((cum) => n < cum)
  })
}

/** Runs of 3+ equal symbols along each row; three paying rows sweep for double. */
export function scoreGrid(grid) {
  const { COLS, ROWS, SYMBOL_PTS, RUN_MULT, SWEEP_MULT } = SPIN
  const lines = []
  for (let row = 0; row < ROWS; row += 1) {
    let c = 0
    while (c < COLS) {
      const sym = grid[row * COLS + c]
      let len = 1
      while (c + len < COLS && grid[row * COLS + c + len] === sym) len += 1
      if (len >= 3) lines.push({ row, start: c, len, sym, pts: SYMBOL_PTS[sym] * RUN_MULT[len] })
      c += len
    }
  }
  const swept = lines.length === ROWS
  const base = lines.reduce((n, l) => n + l.pts, 0)
  return { lines, pts: swept ? base * SWEEP_MULT : base, swept }
}

/** One spin on top of the run so far: consecutive wins raise the multiplier (x1, x1.5, x2). */
export function spinStep({ streak, total }, grid) {
  const scored = scoreGrid(grid)
  const next = scored.pts > 0 ? streak + 1 : 0
  const mult10 = scored.pts > 0 ? SPIN.STREAK10[Math.min(next, SPIN.STREAK10.length) - 1] : 10
  const score = Math.floor((scored.pts * mult10) / 10)
  return { grid, ...scored, streak: next, mult10, score, total: total + score }
}

export const outcomeFor = (total) =>
  total >= SPIN.TIERS.rare ? 'rare' : total >= SPIN.TIERS.uncommon ? 'uncommon' : 'common'

export const rewardFor = (total) => ({
  xp: 1 + Math.min(SPIN.XP_MAX - 1, Math.floor(total / SPIN.XP_STEP)),
  items: Array(Math.min(SPIN.ITEM_MAX, Math.floor(total / SPIN.ITEM_STEP))).fill('oran-berry'),
})

export function playSpins(random) {
  const spins = []
  let state = { streak: 0, total: 0 }
  for (let i = 0; i < SPIN.SPINS; i += 1) {
    const step = spinStep(state, drawGrid(random))
    spins.push(step)
    state = step
  }
  return { spins, total: state.total, outcome: outcomeFor(state.total), rewards: rewardFor(state.total) }
}
