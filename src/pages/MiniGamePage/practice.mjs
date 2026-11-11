// A practice game for a guest or the local mode: the same rules as the
// database's, run in the browser. No reward, no turn used, no network.
import { MINIGAME } from './minigame.mjs'
import { applyFlip } from './games/memory/rules.mjs'
import { initialBoard, newTape } from './games/candy/engine.mjs'

const SPECIES = 1025

function candyPractice({ difficulty, random }) {
  const { COLS, ROWS, KINDS, MOVES, TARGET } = MINIGAME.CANDY
  const kinds = KINDS[difficulty - 1]
  const tape = newTape(random, kinds)
  const { board, pos } = initialBoard(tape, kinds)
  return {
    view: {
      kind: 'candy',
      cols: COLS,
      rows: ROWS,
      kinds,
      movesMax: MOVES[difficulty - 1],
      target: TARGET[difficulty - 1],
      board,
      tape,
      pos,
    },
    deadline: Date.now() + MINIGAME.DURATION_S * 1000,
    flip: undefined,
  }
}

export function createPractice({ game = 'memory', difficulty, random = Math.random }) {
  if (game === 'candy') return candyPractice({ difficulty, random })
  const grid = MINIGAME.GRID[difficulty - 1]
  const pool = Array.from({ length: SPECIES }, (_, i) => i + 1)
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const cards = pool.slice(0, grid.pairs).flatMap((id) => [id, id])
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  let state = { open: null, matched: [], flips: 0 }
  return {
    view: {
      cols: grid.cols,
      cards: cards.length,
      matched: [],
      open: null,
      faces: {},
    },
    deadline: Date.now() + MINIGAME.DURATION_S * 1000,
    async flip(index) {
      const next = applyFlip(state, cards, index)
      state = next.state
      return next.result
    },
  }
}
