import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import { getPokemonAltImage, getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import type { SilhouetteView } from '../../useMiniGame'
import { TRAY, TURN, apply, initialState, isLocked, isSolved, lockedCount } from './engine.mjs'
import { cellAt, tileStyle } from './board-model.mjs'
import { loadLog, saveLog } from './moves.mjs'

type Props = { view: SilhouetteView; roundId?: string | null; name: string; disabled: boolean; onLog: (log: number[][]) => void; onEnd: (moves: number, log: number[][]) => void; onError: (error: Error) => void }
type State = { rot: number[]; at: number[] }
type Drag = { i: number; x: number; y: number; started: boolean }

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const storage = () => { try { return window.sessionStorage } catch { return undefined } }
const MOVE_PX = 8

/** Ghép mảnh Pokémon: drag pieces from the tray into the frame, tap a piece to turn it. Every action is replayed by the server. */
export default function Board({ view, roundId, name, disabled, onLog, onEnd }: Props) {
  const total = view.cols * view.rows
  const state = useRef<State>(initialState(view.rot))
  const angle = useRef<number[]>(view.rot.map((r) => r * 90))
  const moves = useRef<number[][]>([])
  const started = useRef(performance.now() - view.elapsedMs)
  const ended = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const drag = useRef<Drag | null>(null)
  const frame = useRef<HTMLDivElement>(null)
  const ghost = useRef<HTMLDivElement>(null)
  const restored = useRef(false)
  const [, paint] = useState(0)
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [snapped, setSnapped] = useState<number | null>(null)
  const [hint, setHint] = useState(false)
  const [artIndex, setArtIndex] = useState(0)
  const [artReady, setArtReady] = useState(false)
  const [artError, setArtError] = useState(false)
  const [showSolved, setShowSolved] = useState(false)
  const img = artIndex ? getPokemonAltImage(view.artSpeciesId) : getPokemonImage(view.artSpeciesId)
  const live = useRef({ disabled, onLog, onEnd })
  live.current = { disabled, onLog, onEnd }
  const redraw = useCallback(() => paint((n) => n + 1), [])

  const act = useCallback((i: number, code: number) => {
    if (live.current.disabled || ended.current) return
    const next = apply(state.current, i, code)
    if (!next) return
    const wasLocked = lockedCount(state.current)
    if (code === TURN) angle.current[i] += 90
    state.current = next
    const t = Math.max(0, Math.floor(performance.now() - started.current), moves.current.at(-1)?.[0] ?? 0)
    moves.current = [...moves.current, [t, i, code]]
    saveLog(storage(), roundId, moves.current)
    live.current.onLog(moves.current)
    if (lockedCount(next) > wasLocked && !isSolved(next)) {
      setSnapped(i)
      window.setTimeout(() => setSnapped((s) => (s === i ? null : s)), 700)
      navigator.vibrate?.(12)
    }
    redraw()
    if (isSolved(next)) {
      ended.current = true
      setShowSolved(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => live.current.onEnd(moves.current.length, moves.current), reduced() ? 250 : 1500)
    }
  }, [roundId, redraw])

  useEffect(() => {
    if (restored.current) return
    restored.current = true
    for (const [t, i, code] of loadLog(storage(), roundId)) {
      if (isSolved(state.current)) break
      const next = apply(state.current, i, code)
      if (!next) break
      if (code === TURN) angle.current[i] += 90
      state.current = next
      moves.current.push([t, i, code])
    }
    live.current.onLog(moves.current)
    if (isSolved(state.current)) {
      ended.current = true
      setShowSolved(true)
      timer.current = window.setTimeout(() => live.current.onEnd(moves.current.length, moves.current), 250)
    }
    redraw()
    return () => window.clearTimeout(timer.current)
  }, [roundId, redraw])

  const place = (x: number, y: number, size: number) => {
    const g = ghost.current
    if (!g) return
    g.style.width = g.style.height = `${size}px`
    g.style.transform = `translate(${x}px, ${y}px)`
  }
  const down = (i: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || ended.current || isLocked(state.current, i)) return
    e.preventDefault()
    drag.current = { i, x: e.clientX, y: e.clientY, started: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    if (!d.started) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < MOVE_PX) return
      d.started = true
      setDragging(d.i)
    }
    const rect = frame.current?.getBoundingClientRect()
    if (!rect) return
    const size = rect.width / view.cols
    place(e.clientX - size / 2, e.clientY - size / 2, size)
    const cell = cellAt(e.clientX, e.clientY, rect, view.cols, view.rows)
    setOver((o) => (o === cell ? o : cell))
  }
  const up = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    drag.current = null
    setDragging(null)
    setOver(null)
    if (!d) return
    if (!d.started) return act(d.i, TURN)
    const rect = frame.current?.getBoundingClientRect()
    const cell = rect ? cellAt(e.clientX, e.clientY, rect, view.cols, view.rows) : null
    if (cell !== null) act(d.i, cell)
    else if (state.current.at[d.i] >= 0) act(d.i, TRAY)
  }
  const cancel = () => {
    drag.current = null
    setDragging(null)
    setOver(null)
  }

  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.code === 'Space' && !(e.target as HTMLElement | null)?.closest('button,input')) { e.preventDefault(); setHint(true) } }
    const off = (e: KeyboardEvent) => { if (e.code === 'Space') setHint(false) }
    const blur = () => setHint(false)
    window.addEventListener('keydown', on)
    window.addEventListener('keyup', off)
    window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', on); window.removeEventListener('keyup', off); window.removeEventListener('blur', blur) }
  }, [])

  const s = state.current
  const solved = showSolved || isSolved(s)
  const locked = lockedCount(s)
  const art = (i: number, turn = angle.current[i]) => ({ backgroundImage: `url(${img})`, ...tileStyle(i, view.cols, view.rows), transform: `rotate(${turn}deg)` })
  const trayPieces = Array.from({ length: total }, (_, i) => i).filter((i) => s.at[i] < 0)
  const pieceFor = (cell: number) => s.at.indexOf(cell)
  const piece = (i: number, where: 'tray' | 'cell') => {
    const lock = isLocked(s, i)
    return (
      <button
        key={i}
        type="button"
        className="jig-piece"
        data-where={where}
        data-locked={lock || undefined}
        data-snap={snapped === i || undefined}
        data-drag={dragging === i || undefined}
        aria-label={`Mảnh ${i + 1}${lock ? ', đã vào đúng chỗ' : `, đang xoay ${(angle.current[i] % 360 + 360) % 360}°. Chạm để xoay, kéo để đặt`}`}
        disabled={disabled || lock || solved}
        onPointerDown={down(i)}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onDragStart={(e) => e.preventDefault()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); act(i, TURN) } }}
      >
        <span className="jig-art" style={art(i)} />
      </button>
    )
  }

  return (
    <section className="silhouette-jigsaw" data-solved={solved || undefined} style={{ ['--cols' as string]: view.cols, ['--rows' as string]: view.rows }}>
      <div className="jig-topline">
        <b>{locked}/{total} mảnh</b>
        <button type="button" className="jig-preview" disabled={disabled || solved} onPointerDown={(e) => { e.preventDefault(); setHint(true) }} onPointerUp={() => setHint(false)} onPointerCancel={() => setHint(false)} onPointerLeave={() => setHint(false)}>Giữ để xem mẫu</button>
      </div>
      <div ref={frame} className="jig-frame" data-loading={!artReady || undefined} role="group" aria-label={`Khung tranh ${view.cols} nhân ${view.rows}, đã đúng ${locked} trên ${total} mảnh`}>
        {Array.from({ length: total }, (_, cell) => {
          const i = pieceFor(cell)
          return (
            <div key={cell} className="jig-slot" data-over={over === cell || undefined} data-home={i === cell && s.rot[i] === 0 || undefined}>
              {i >= 0 && piece(i, 'cell')}
            </div>
          )
        })}
        {solved && <div className="jig-solved" role="status"><b>{name}</b><span>Đã ghép hoàn chỉnh!</span><i>{Array.from({ length: 12 }, (_, k) => <em key={k} style={{ ['--p' as string]: `${k * 29}deg` }} />)}</i></div>}
        {hint && <div className="jig-hint" aria-hidden="true" style={{ backgroundImage: `url(${img})`, backgroundSize: `${Math.max(view.cols, view.rows) * 100 / view.cols}% ${Math.max(view.cols, view.rows) * 100 / view.rows}%` }} />}
      </div>
      <div className="jig-tray" data-empty={trayPieces.length === 0 || undefined} aria-label="Khay mảnh ghép">
        {trayPieces.map((i) => piece(i, 'tray'))}
        {trayPieces.length === 0 && !solved && <span className="jig-tip">Kéo mảnh ra khỏi khung để xếp lại</span>}
      </div>
      {!artReady && <span className="jig-loading" role="status">Đang tải tranh Pokémon…</span>}
      {artError && <span className="jig-error" role="alert">Không tải được tranh Pokémon. Hãy tải lại trang.</span>}
      <p className="jig-help">Kéo mảnh vào khung, chạm mảnh để xoay. Đúng chỗ và thẳng hướng thì mảnh tự khóa.</p>
      <div ref={ghost} className="jig-ghost" data-on={dragging !== null || undefined} aria-hidden="true" style={{ position: 'fixed', left: 0, top: 0, pointerEvents: 'none', zIndex: 60, display: dragging === null ? 'none' : 'block' }}>
        {dragging !== null && <span className="jig-art" style={art(dragging)} />}
      </div>
      <img className="jig-preload" src={img} alt="" onLoad={() => { setArtReady(true); setArtError(false) }} onError={() => { if (!artIndex) setArtIndex(1); else setArtError(true) }} />
    </section>
  )
}
