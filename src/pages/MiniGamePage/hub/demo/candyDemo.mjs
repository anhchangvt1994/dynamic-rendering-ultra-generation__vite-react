// The cabinet's attract run: a fixed list of moves replayed through the real engine.
// Frame 0 is the start board; frame i is the board after move i (settled, after the cascade).
import { trySwap } from '../../games/candy/engine.mjs'

/** @returns {{ board: number[]; swap: [number, number] | null; score: number }[]} */
export function candyFrames({ board, tape, pos, moves, kinds = 4 }) {
  let state = { board: board.slice(), pos, score: 0 }
  const frames = [{ board: state.board.slice(), swap: null, score: 0 }]
  for (const [a, b] of moves) {
    const r = trySwap(state, tape, kinds, a, b)
    if (!r) throw new Error(`illegal demo move ${a},${b}`)
    state = r.state
    frames.push({ board: state.board.slice(), swap: [a, b], score: state.score })
  }
  return frames
}
