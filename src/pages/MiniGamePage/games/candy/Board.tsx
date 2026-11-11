import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { itemSprite } from 'pages/QuizPage/items.mjs'
import type { CandyView } from '../../useMiniGame'
import { trySwap } from './engine.mjs'
import { loadMoves, saveMoves } from './moves.mjs'

export const KIND_ITEMS = ['cheri-berry', 'oran-berry', 'pecha-berry', 'rawst-berry', 'chesto-berry', 'aspear-berry']
const KIND_NAMES = ['Cheri', 'Oran', 'Pecha', 'Rawst', 'Chesto', 'Aspear']

export type MoveEvent = {
  match: boolean
  depth: number
  at: number
  done: boolean
  won: boolean
  score: number
  moves: number[][]
}

type Props = {
  difficulty: 1 | 2 | 3
  view: CandyView
  roundId?: string | null
  disabled: boolean
  tone?: unknown
  onMove?: (event: MoveEvent) => void
  onError?: (error: Error) => void
}

type State = { board: number[]; pos: number; score: number }

const POP_MS = 240
const DROP_MS = 280
const MISS_MS = 380
const SWIPE_PX = 18
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const store = () => {
  try {
    return window.sessionStorage
  } catch {
    return undefined
  }
}

/** Replays the saved moves on the round's layout; a list that does not fit is dropped. */
const restore = (view: CandyView, roundId: string | null | undefined): { state: State; moves: number[][] } => {
  const fresh = { state: { board: view.board, pos: view.pos, score: 0 } as State, moves: [] as number[][] }
  let state = fresh.state
  const moves: number[][] = []
  for (const [a, b] of loadMoves(store(), roundId)) {
    if (moves.length >= view.movesMax || state.score >= view.target) return fresh
    const step = trySwap(state, view.tape, view.kinds, a, b)
    if (!step) return fresh
    state = step.state
    moves.push([a, b])
  }
  return { state, moves }
}

/**
 * Candy Rush: swap two neighbouring berries to line up 3 or more. The rules
 * live in engine.mjs (the server replays the same moves when the round ends).
 */
export default function Board({ view, roundId, disabled, onMove, onError }: Props) {
  const [start] = useState(() => restore(view, roundId))
  const [state, setState] = useState<State>(start.state)
  const [made, setMade] = useState(start.moves.length)
  const [sel, setSel] = useState<number | null>(null)
  const [pop, setPop] = useState<number[]>([])
  const [drop, setDrop] = useState<number[]>([])
  const [miss, setMiss] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const moves = useRef(start.moves)
  const live = useRef(state)
  const alive = useRef(true)
  const emitted = useRef(false)
  const swiped = useRef(false)
  const from = useRef<{ i: number; x: number; y: number } | null>(null)
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  useEffect(() => {
    alive.current = true
    // a round resumed already finished is claimed once
    const done = live.current.score >= view.target || moves.current.length >= view.movesMax
    if (done && !emitted.current) {
      emitted.current = true
      onMoveRef.current?.({
        match: false,
        depth: 0,
        at: -1,
        done: true,
        won: live.current.score >= view.target,
        score: live.current.score,
        moves: moves.current,
      })
    }
    return () => {
      alive.current = false
    }
  }, [view])

  const swap = async (a: number, b: number) => {
    const step = trySwap(live.current, view.tape, view.kinds, a, b)
    if (!step) {
      setMiss([a, b])
      setSel(null)
      window.setTimeout(() => alive.current && setMiss([]), MISS_MS)
      return
    }
    setBusy(true)
    setSel(null)
    live.current = step.state
    moves.current = [...moves.current, [a, b]]
    saveMoves(store(), roundId, moves.current)
    setMade(moves.current.length)
    let shown = swapBoard(state.board, a, b)
    setState((s) => ({ ...s, board: shown }))
    const animate = !reduced()
    let score = state.score
    for (const part of step.steps) {
      score += part.gain
      if (animate) {
        setPop(part.cleared)
        await sleep(POP_MS)
        if (!alive.current) return
      }
      const changed = part.board.flatMap((v: number, i: number) => (v !== shown[i] ? [i] : []))
      shown = part.board
      setPop([])
      setDrop(animate ? changed : [])
      setState({ board: shown, pos: 0, score })
      if (animate) {
        await sleep(DROP_MS)
        if (!alive.current) return
      }
    }
    setDrop([])
    setState(step.state)
    setBusy(false)
    const won = step.state.score >= view.target
    const over = won || moves.current.length >= view.movesMax
    if (over) emitted.current = true
    onMoveRef.current?.({ match: true, depth: step.depth, at: b, done: over, won, score: step.state.score, moves: moves.current })
  }

  const cellOf = (el: EventTarget | null) => {
    const i = (el as HTMLElement | null)?.closest<HTMLElement>('[data-i]')?.dataset.i
    return i === undefined ? null : Number(i)
  }
  const blocked = disabled || busy
  const neighbour = (a: number, b: number) =>
    (Math.abs(a - b) === 1 && Math.floor(a / view.cols) === Math.floor(b / view.cols)) ||
    Math.abs(a - b) === view.cols

  const tap = (i: number) => {
    if (blocked) return
    if (sel === null) return setSel(i)
    if (sel === i) return setSel(null)
    if (neighbour(sel, i)) return void swap(sel, i).catch((e) => onError?.(e))
    setSel(i)
  }

  const release = (e: ReactPointerEvent) => {
    const s = from.current
    from.current = null
    if (!s || blocked) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return
    swiped.current = true
    const horizontal = Math.abs(dx) > Math.abs(dy)
    const to = horizontal ? s.i + Math.sign(dx) : s.i + Math.sign(dy) * view.cols
    const wraps = horizontal && Math.floor(to / view.cols) !== Math.floor(s.i / view.cols)
    if (wraps || to < 0 || to >= view.cols * view.rows) return
    void swap(s.i, to).catch((err) => onError?.(err))
  }

  const pctDone = Math.min(100, Math.round((state.score / view.target) * 100))
  return (
    <div className="mg-candy">
      <div className="mg-candy-head">
        <span>
          Điểm <b>{state.score}</b>/{view.target}
        </span>
        <span>
          Còn <b>{view.movesMax - made}</b> nước
        </span>
      </div>
      <span
        className="mg-candy-bar"
        role="progressbar"
        aria-label="Điểm mục tiêu"
        aria-valuemin={0}
        aria-valuemax={view.target}
        aria-valuenow={Math.min(state.score, view.target)}
      >
        <i style={{ width: `${pctDone}%` }} />
      </span>
      <ul
        className="mg-candy-grid"
        style={{ gridTemplateColumns: `repeat(${view.cols}, minmax(0, 1fr))` }}
        onPointerUp={release}
        onPointerCancel={() => (from.current = null)}
      >
        {state.board.map((kind, i) => (
          <li key={i}>
            <button
              type="button"
              className="mg-candy-cell"
              data-i={i}
              data-sel={sel === i || undefined}
              data-pop={pop.includes(i) || undefined}
              data-drop={drop.includes(i) || undefined}
              data-miss={miss.includes(i) || undefined}
              disabled={blocked}
              aria-pressed={sel === i}
              aria-label={`Ô ${Math.floor(i / view.cols) + 1}, ${(i % view.cols) + 1}: ${KIND_NAMES[kind]}`}
              onPointerDown={(e) => {
                swiped.current = false
                from.current = { i, x: e.clientX, y: e.clientY }
              }}
              onClick={() => {
                if (swiped.current) swiped.current = false
                else tap(i)
              }}
            >
              <img src={itemSprite(KIND_ITEMS[kind])} alt="" draggable={false} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const swapBoard = (board: number[], a: number, b: number) => {
  const next = board.slice()
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}
