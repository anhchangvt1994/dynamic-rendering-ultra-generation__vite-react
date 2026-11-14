import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { itemSprite } from 'pages/QuizPage/items.mjs'
import type { CandyView } from '../../useMiniGame'
import { trySwap } from './engine.mjs'
import { analyze, calloutFor, centroid, fallRows, hintMove } from './fx.mjs'
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

const POP_MS = 380
const SLIDE_MS = 170
const MISS_MS = 420
const SWIPE_PX = 18
const HINT_MS = 7000
const HUES = ['#ff5a5a', '#5d9bff', '#ff9fd0', '#5fe0d0', '#b585ff', '#ffd95a']
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

type Fx = {
  key: number
  tier: number
  text: string
  chain: string | null
  gain: number
  at: [number, number]
  cross: number | null
  runs: { dir: string; cells: number[] }[]
}

/** Counts up to the score so every gain is felt. */
function useCountUp(value: number) {
  const ref = useRef<HTMLElement | null>(null)
  const from = useRef(value)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced() || value === from.current) {
      from.current = value
      el.textContent = String(value)
      return
    }
    const start = from.current
    el.textContent = String(start)
    const t0 = performance.now()
    let raf = 0
    const run = (now: number) => {
      const k = Math.min(1, (now - t0) / 520)
      el.textContent = String(Math.round(start + (value - start) * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(run)
      else from.current = value
    }
    raf = requestAnimationFrame(run)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return ref
}

/**
 * Candy Rush: swap two neighbouring berries to line up 3 or more. The rules
 * live in engine.mjs (the server replays the same moves when the round ends);
 * fx.mjs only reads the result to dress it: slides, bursts, chain banners, quakes.
 */
export default function Board({ view, roundId, disabled, onMove, onError }: Props) {
  const [start] = useState(() => restore(view, roundId))
  const [state, setState] = useState<State>(start.state)
  const [made, setMade] = useState(start.moves.length)
  const [sel, setSel] = useState<number | null>(null)
  const [pop, setPop] = useState<number[]>([])
  const [drop, setDrop] = useState<number[]>([])
  const [fall, setFall] = useState<number[]>([])
  const [miss, setMiss] = useState<number[]>([])
  const [slide, setSlide] = useState<number[]>([])
  const [hint, setHint] = useState<number[] | null>(null)
  const [fx, setFx] = useState<Fx | null>(null)
  const [tier, setTier] = useState(0)
  const [busy, setBusy] = useState(false)
  const moves = useRef(start.moves)
  const live = useRef(state)
  const alive = useRef(true)
  const emitted = useRef(false)
  const swiped = useRef(false)
  const from = useRef<{ i: number; x: number; y: number } | null>(null)
  const field = useRef<HTMLDivElement>(null)
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove
  const { cols, rows } = view
  const scoreRef = useCountUp(state.score)

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

  // a pause shows a possible swap
  useEffect(() => {
    setHint(null)
    if (busy || disabled || sel !== null || reduced()) return
    const t = window.setTimeout(() => setHint(hintMove(state.board, cols, rows)), HINT_MS)
    return () => window.clearTimeout(t)
  }, [busy, disabled, sel, state.board, cols, rows, made])

  const quake = (power: number) => {
    const el = field.current
    if (!el?.animate) return
    const d = 2 + power * 1.5
    el.animate(
      [{ translate: '0 0' }, { translate: `${-d}px ${d / 2}px` }, { translate: `${d}px ${-d / 2}px` }, { translate: '0 0' }],
      { duration: 200 + power * 40, easing: 'ease-out' },
    )
  }

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
    if (animate) {
      setSlide([a, b])
      await sleep(SLIDE_MS)
      if (!alive.current) return
      setSlide([])
    }
    let score = state.score
    let depth = 0
    for (const part of step.steps) {
      depth += 1
      score += part.gain
      if (animate) {
        const a1 = analyze(part.cleared, cols, rows, shown)
        const call = calloutFor(depth, a1)
        const [r, c] = centroid(part.cleared, cols)
        setTier(call.tier)
        setFx({ key: Date.now() + depth, tier: call.tier, text: call.text, chain: call.chain, gain: part.gain, at: [r, c], cross: a1.cross, runs: a1.runs.filter((x) => x.cells.length >= 4) })
        if (call.tier >= 1) quake(call.tier)
        setPop(part.cleared)
        await sleep(POP_MS + call.tier * 40)
        if (!alive.current) return
      }
      const changed = part.board.flatMap((v: number, i: number) => (v !== shown[i] ? [i] : []))
      shown = part.board
      setPop([])
      const falls = fallRows(part.cleared, cols, rows)
      setFall(falls)
      setDrop(animate ? changed : [])
      setState({ board: shown, pos: 0, score })
      if (animate) {
        await sleep(240 + Math.max(0, ...falls) * 55 + cols * 12)
        if (!alive.current) return
      }
    }
    setDrop([])
    setTier(0)
    window.setTimeout(() => alive.current && setFx(null), 600)
    setState(step.state)
    setBusy(false)
    const won = step.state.score >= view.target
    const over = won || moves.current.length >= view.movesMax
    if (over) emitted.current = true
    onMoveRef.current?.({ match: true, depth: step.depth, at: b, done: over, won, score: step.state.score, moves: moves.current })
  }

  const blocked = disabled || busy
  const neighbour = (a: number, b: number) =>
    (Math.abs(a - b) === 1 && Math.floor(a / cols) === Math.floor(b / cols)) ||
    Math.abs(a - b) === cols

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
    const to = horizontal ? s.i + Math.sign(dx) : s.i + Math.sign(dy) * cols
    const wraps = horizontal && Math.floor(to / cols) !== Math.floor(s.i / cols)
    if (wraps || to < 0 || to >= cols * rows) return
    void swap(s.i, to).catch((err) => onError?.(err))
  }

  const pctDone = Math.min(100, Math.round((state.score / view.target) * 100))
  const left = view.movesMax - made
  const popSet = new Set(pop)
  const heavy = (fx?.tier ?? 0) >= 2
  // where a swapped or refused cell comes from / leans toward, in cell units
  const lean = (i: number, other: number) => [(other % cols) - (i % cols), Math.floor(other / cols) - Math.floor(i / cols)]
  const pair = slide.length ? slide : miss
  return (
    <div className="mg-candy" data-tier={tier || undefined}>
      <div className="mg-candy-head">
        <span>
          Điểm <b className="mg-candy-score" key={state.score} ref={scoreRef} data-bump={state.score > 0 || undefined}>{state.score}</b>/{view.target}
        </span>
        <span data-low={left <= 3 || undefined}>
          Còn <b>{left}</b> nước
        </span>
      </div>
      <span
        className="mg-candy-bar"
        role="progressbar"
        aria-label="Điểm mục tiêu"
        aria-valuemin={0}
        aria-valuemax={view.target}
        aria-valuenow={Math.min(state.score, view.target)}
        style={{ ['--p' as string]: `${pctDone}%` }}
      >
        <i style={{ width: `${pctDone}%` }} />
        {[34, 67, 100].map((at) => (
          <em key={at} style={{ left: `${at}%` }} data-on={pctDone >= at || undefined} aria-hidden="true">★</em>
        ))}
      </span>
      <div className="mg-candy-field" ref={field} data-tier={tier || undefined}>
        <ul
          className="mg-candy-grid"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          onPointerUp={release}
          onPointerCancel={() => (from.current = null)}
        >
          {state.board.map((kind, i) => {
            const popping = popSet.has(i)
            const other = pair.includes(i) ? pair.find((x) => x !== i) : undefined
            const [dx, dy] = other === undefined ? [0, 0] : lean(i, other)
            return (
              <li key={i}>
                <button
                  type="button"
                  className="mg-candy-cell"
                  data-i={i}
                  data-sel={sel === i || undefined}
                  data-near={(sel !== null && neighbour(sel, i)) || undefined}
                  data-hint={hint?.includes(i) || undefined}
                  data-pop={popping || undefined}
                  data-drop={drop.includes(i) || undefined}
                  data-miss={miss.includes(i) || undefined}
                  data-slide={slide.includes(i) || undefined}
                  disabled={blocked}
                  aria-pressed={sel === i}
                  aria-label={`Ô ${Math.floor(i / cols) + 1}, ${(i % cols) + 1}: ${KIND_NAMES[kind]}`}
                  style={{ ['--c' as string]: HUES[kind], ['--f' as string]: fall[i] ?? 0, ['--col' as string]: i % cols, ['--i' as string]: i % 7, ['--dx' as string]: dx, ['--dy' as string]: dy }}
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
                  {popping && (
                    <span className="mg-candy-fx" aria-hidden="true" data-big={heavy || undefined}>
                      <u />
                      {Array.from({ length: heavy ? 8 : 6 }, (_, k) => (
                        <b key={k} style={{ ['--a' as string]: `${k * (360 / (heavy ? 8 : 6)) + (i % 5) * 11}deg`, ['--d' as string]: `${26 + ((k * 7 + i) % 5) * 7}px`, ['--s' as string]: `${5 + ((k + i) % 3) * 2}px` }} />
                      ))}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        {fx && (
          <div className="mg-candy-fxlayer" aria-hidden="true" data-tier={fx.tier}>
            {fx.runs.map((run, k) => {
              const rs = run.cells.map((c) => Math.floor(c / cols))
              const cs = run.cells.map((c) => c % cols)
              const horizontal = run.dir === 'row'
              return (
                <i
                  key={`${fx.key}-${k}`}
                  className="mg-candy-beam"
                  data-dir={run.dir}
                  style={{
                    left: `${(Math.min(...cs) / cols) * 100}%`,
                    top: `${(Math.min(...rs) / rows) * 100}%`,
                    width: `${((horizontal ? run.cells.length : 1) / cols) * 100}%`,
                    height: `${((horizontal ? 1 : run.cells.length) / rows) * 100}%`,
                  }}
                />
              )
            })}
            <i key={`w${fx.key}`} className="mg-candy-wave" style={{ left: `${((fx.at[1] + 0.5) / cols) * 100}%`, top: `${((fx.at[0] + 0.5) / rows) * 100}%` }} />
            <span key={`g${fx.key}`} className="mg-candy-gain" style={{ left: `${((fx.at[1] + 0.5) / cols) * 100}%`, top: `${((fx.at[0] + 0.5) / rows) * 100}%` }}>
              +{fx.gain}
            </span>
            {(fx.tier > 0 || fx.chain) && (
              <div key={`c${fx.key}`} className="mg-candy-callout" data-tier={fx.tier} role="status">
                {fx.text && <strong>{fx.text}</strong>}
                {fx.chain && <small>{fx.chain}</small>}
              </div>
            )}
            {fx.tier >= 3 && <i key={`f${fx.key}`} className="mg-candy-flash" />}
          </div>
        )}
      </div>
      {made === 0 && !busy && <p className="mg-candy-hint">Chạm hai ô kề nhau hoặc vuốt để đổi chỗ.</p>}
    </div>
  )
}

const swapBoard = (board: number[], a: number, b: number) => {
  const next = board.slice()
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}
