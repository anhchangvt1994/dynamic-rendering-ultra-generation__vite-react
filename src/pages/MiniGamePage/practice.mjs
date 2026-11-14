// A practice game for a guest or the local mode: the same rules as the
// database's, run in the browser. No reward, no turn used, no network.
import { MINIGAME } from './minigame.mjs'
import { applyFlip } from './games/memory/rules.mjs'
import { initialBoard, newTape } from './games/candy/engine.mjs'
import { createBoard as createTileBoard, deal as dealTiles, shuffle as shuffleTiles, SHUFFLES } from './games/tile-safari/rules.mjs'
import { SPIN, drawGrid, spinStep, outcomeFor, rewardFor } from './games/lucky-spin/rules.mjs'
import { lineGoal, newQueue as newBlockQueue } from './games/block-lab/engine.mjs'
import { gridFor as jigsawGrid, startTurns } from './games/silhouette-atelier/engine.mjs'

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
  if (game === 'block-lab') {
    const speciesId = Math.floor(random() * SPECIES) + 1
    const durationMs = MINIGAME.DURATION_S * 1000
    return { view: { kind: 'block-lab', difficulty, width: 10, height: 20, queue: newBlockQueue(random), speciesId, goal: lineGoal(difficulty), elapsedMs: 0, durationMs }, deadline: Date.now() + durationMs }
  }
  if (game === 'silhouette-atelier') {
    const artSpeciesId = Math.floor(random() * SPECIES) + 1
    const { cols, rows } = jigsawGrid(difficulty)
    const rot = startTurns(random, cols * rows, difficulty)
    const durationMs = MINIGAME.DURATION_S * 1000
    return { view: { kind: 'silhouette-atelier', difficulty, cols, rows, rot, artSpeciesId, elapsedMs: 0, durationMs }, deadline: Date.now() + durationMs }
  }
  if (game === 'lucky-spin') {
    let state = { streak: 0, total: 0 }
    let spins = 0
    return {
      view: { kind: 'lucky-spin', difficulty, spun: false, spins: [], total: 0, streak: 0 },
      deadline: Date.now() + MINIGAME.DURATION_S * 1000,
      async spin() {
        if (spins >= SPIN.SPINS) throw Object.assign(new Error('Đã hết lượt quay'), { code: 'bad_move' })
        state = spinStep(state, drawGrid(random))
        spins += 1
        const done = spins === SPIN.SPINS
        return {
          spin: state,
          spins,
          total: state.total,
          done,
          ...(done ? { outcome: outcomeFor(state.total), rewards: rewardFor(state.total) } : {}),
        }
      },
    }
  }
  if (game === 'tile-safari') {
    const ids = Array.from({ length: SPECIES }, (_, i) => i + 1)
    const board = dealTiles(difficulty, ids, random)
    let shuffles = SHUFFLES
    return {
      view: { kind: 'tile-safari', rows: board.rows, cols: board.cols, tiles: board.tiles, removed: [], shuffles },
      deadline: Date.now() + MINIGAME.DURATION_S * 1000,
      shuffle(state) {
        if (shuffles <= 0) throw Object.assign(new Error('Đã hết lượt xáo bàn'), { code: 'no_shuffles' })
        shuffles -= 1
        return { tiles: shuffleTiles(createTileBoard(state), random).tiles, shuffles }
      },
    }
  }
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
