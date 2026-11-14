import { SPIN, spinStep, outcomeFor } from '../../games/lucky-spin/rules.mjs'

// three scripted spins: a miss, a 4-run, then a 5-run + two 3-runs (sweep) on a x1.5 streak
export const SPIN_DEMO = [
  [0, 1, 2, 3, 4, 1, 2, 3, 4, 0, 2, 3, 4, 0, 1],
  [0, 2, 3, 4, 1, 1, 1, 1, 1, 3, 3, 4, 0, 2, 4],
  [2, 2, 2, 2, 2, 4, 4, 4, 0, 1, 0, 1, 3, 3, 3],
]

/** Frames: per spin, all reels roll, the first three stop, then all land with the real score. */
export function spinFrames(grids = SPIN_DEMO) {
  const frames = [{ grid: grids[0].map((_, i) => (i + 1) % SPIN.SPECIES.length), stopped: 0, used: 0, streak: 0, total: 0, lines: [] }]
  let state = { streak: 0, total: 0 }
  grids.forEach((grid, s) => {
    const prev = frames.at(-1)
    frames.push({ ...prev, stopped: 0, used: s })
    frames.push({ ...prev, grid, stopped: 3, used: s })
    state = spinStep(state, grid)
    frames.push({ grid, stopped: SPIN.COLS, used: s + 1, streak: state.streak, total: state.total, lines: state.lines, swept: state.swept, score: state.score })
  })
  return frames
}
export { outcomeFor }
