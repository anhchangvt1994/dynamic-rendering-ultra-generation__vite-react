import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import type { BlockLabView } from '../../useMiniGame'
import BlockFx, { type FxHandle } from './BlockFx'
import { clearedRows, ghostRow, trackSkins, viewCells } from './board-model.mjs'
import { advance, initial, shapeCells, step } from './engine.mjs'
import { fireworkPlan } from './fx.mjs'
import { createBlockInput, holdTicks } from './input.mjs'
import { loadLog, saveLog } from './moves.mjs'
import { speciesFor } from './skins.mjs'

type End = { won: boolean; score: number; lines: number; log: number[][] }
type Props = {
  view: BlockLabView
  roundId?: string | null
  disabled: boolean
  onLog?: (log: number[][]) => void
  onEnd: (end: End) => void
  onError?: (error: Error) => void
}

const HUES = [190, 50, 280, 120, 0, 220, 28]
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
const store = () => {
  try {
    return window.sessionStorage
  } catch {
    return undefined
  }
}
const HARD_CODE = 5

/**
 * Xếp khối Pokémon: blocks fall by themselves (engine.mjs); the log of timed inputs is
 * what the server replays to settle the round. Effects only read what the engine decided.
 */
export default function Board({ view, roundId, disabled, onLog, onEnd, onError }: Props) {
  const t0 = useRef(performance.now() - view.elapsedMs)
  const log = useRef<number[][]>([])
  const st = useRef<any>(null)
  const ended = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const endTimer = useRef<number | undefined>(undefined)
  const field = useRef<HTMLDivElement>(null)
  const fx = useRef<FxHandle>(null)
  const hold = useRef<{ code: number; at: number; done: number; id: number } | null>(null)
  const propsRef = useRef({ disabled, onEnd, onLog, onError })
  propsRef.current = { disabled, onEnd, onLog, onError }
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  const [sweeps, setSweeps] = useState<{ key: number; rows: number[]; lines: number }[]>([])
  const [trails, setTrails] = useState<{ key: number; col: number; width: number; from: number; to: number }[]>([])
  const key = useRef(0)
  // the Pokémon wearing each settled cell (0 = empty)
  const skins = useRef<number[]>(Array(200).fill(0))

  const ms = () => Math.floor(performance.now() - t0.current)
  if (!st.current) {
    let s = initial(view.queue, view.difficulty)
    const saved = loadLog(store(), roundId)
    // replaying the log also rebuilds which Pokémon wears each settled cell
    const track = (old: any, now: any, hard: boolean) => {
      if (now.pieces === old.pieces) return
      const landing = hard ? viewCells({ ...old, active: { ...old.active, y: ghostRow(old) } }).active : viewCells(old).active
      skins.current = trackSkins(skins.current, old, now, landing, speciesFor(view.speciesId, old.pieces))
    }
    for (const [t, code] of saved) {
      const mid = advance(s, t)
      track(s, mid, false)
      const next = step(mid, t, code)
      if (!next) break
      track(mid, next, code === HARD_CODE)
      s = next
      log.current.push([t, code])
    }
    const now = advance(s, Math.max(s.t, Math.floor(view.elapsedMs)))
    track(s, now, false)
    st.current = now
  }

  // where a landed piece's cells sit, in px of the field
  const cellAt = (i: number) => {
    const r = field.current?.getBoundingClientRect()
    if (!r) return { x: 0, y: 0 }
    return { x: ((i % 10) + 0.5) * (r.width / 10), y: (Math.floor(i / 10) + 0.5) * (r.height / 20) }
  }

  const lockFx = (old: any, next: any, hard: boolean) => {
    if (next.pieces === old.pieces) return
    const landing = (hard ? viewCells({ ...old, active: { ...old.active, y: ghostRow(old) } }).active : viewCells(old).active)
    skins.current = trackSkins(skins.current, old, next, landing, speciesFor(view.speciesId, old.pieces))
    if (reduced()) return
    const rows = clearedRows(old.cells, landing)
    const fxApi = fx.current
    for (const c of landing) {
      const at = cellAt(c.i)
      fxApi?.emit('shatter', at.x, at.y, { hue: HUES[c.type] })
    }
    if (hard && landing.length) {
      const bottom = cellAt(Math.max(...landing.map((c) => c.i)))
      fxApi?.emit('impact', bottom.x, bottom.y + 6)
      const cols = landing.map((c) => c.i % 10)
      const rowsOf = landing.map((c) => Math.floor(c.i / 10))
      const k = (key.current += 1)
      setTrails((list) => [...list.slice(-3), { key: k, col: Math.min(...cols), width: Math.max(...cols) - Math.min(...cols) + 1, from: Math.max(0, old.active.y), to: Math.max(...rowsOf) }])
      window.setTimeout(() => setTrails((list) => list.filter((e) => e.key !== k)), 420)
    }
    if (rows.length) {
      const k = (key.current += 1)
      setSweeps((list) => [...list.slice(-3), { key: k, rows, lines: rows.length }])
      window.setTimeout(() => setSweeps((list) => list.filter((e) => e.key !== k)), 700)
      for (const b of fireworkPlan(rows.length, rows)) {
        window.setTimeout(() => {
          const cx = (0.15 + Math.random() * 0.7) * 10
          const at = cellAt(b.row * 10 + Math.floor(cx))
          fx.current?.emit('firework', at.x, at.y, { power: b.power, hue: 20 + Math.floor(Math.random() * 300) })
        }, b.delayMs)
      }
      if (rows.length >= 3 && field.current?.animate)
        field.current.animate([{ translate: '0 0' }, { translate: '-4px 3px' }, { translate: '4px -2px' }, { translate: '0 0' }], { duration: 260, easing: 'ease-out' })
    }
  }

  const finish = () => {
    const s = st.current
    if ((!s.over && !s.won) || ended.current) return
    ended.current = true
    window.clearTimeout(timer.current)
    // let the player see why it ended before the result screen takes over
    endTimer.current = window.setTimeout(() => propsRef.current.onEnd({ won: s.won && !s.over, score: s.score, lines: s.lines, log: log.current }), reduced() ? 400 : 1500)
  }

  // run the gravity ticks that are due, one at a time so every lock gets its effects
  const pump = useCallback(() => {
    window.clearTimeout(timer.current)
    const now = ms()
    let guard = 0
    while (!st.current.over && !st.current.won && st.current.fallAt <= now && guard++ < 400) {
      const old = st.current
      st.current = advance(old, old.fallAt)
      lockFx(old, st.current, false)
    }
    redraw()
    finish()
    if (!st.current.over && !st.current.won)
      timer.current = window.setTimeout(pump, Math.max(8, st.current.fallAt - ms()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const act = (code: number) => {
    if (propsRef.current.disabled || ended.current || st.current.over || st.current.won) return
    pump()
    if (st.current.over || st.current.won) return
    const old = st.current
    const t = Math.max(ms(), old.t)
    const next = step(old, t, code)
    if (!next) return
    st.current = next
    log.current = [...log.current, [t, code]]
    saveLog(store(), roundId, log.current)
    propsRef.current.onLog?.(log.current)
    lockFx(old, next, code === HARD_CODE)
    redraw()
    finish()
    window.clearTimeout(timer.current)
    if (!next.over && !next.won) timer.current = window.setTimeout(pump, Math.max(8, next.fallAt - ms()))
  }

  useEffect(() => {
    propsRef.current.onLog?.(log.current)
    pump()
    return () => {
      window.clearTimeout(timer.current)
      window.clearTimeout(endTimer.current)
      fx.current?.clear()
    }
  }, [pump])

  // keyboard: arrows move, up/x rotate, z rotates back, down and space drop at once
  useEffect(() => {
    const input = createBlockInput({
      move: (dx: number) => act(dx < 0 ? 0 : 1),
      rotate: (dir: number) => act(dir > 0 ? 2 : 3),
      hard: () => act(HARD_CODE),
    })
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('button,input,textarea,select,[contenteditable="true"]')) return
      const once = event.key === ' ' || event.key === 'ArrowUp' || event.key.toLowerCase() === 'x' || event.key.toLowerCase() === 'z'
      if (event.repeat && once) {
        if (!event.altKey && !event.ctrlKey && !event.metaKey) event.preventDefault()
        return
      }
      if (input(event.key, event)) event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // touch: a held ◀ ▶ repeats; one interval exists only while a button is down
  const stopHold = useCallback(() => {
    if (hold.current) window.clearInterval(hold.current.id)
    hold.current = null
  }, [])
  useEffect(() => {
    window.addEventListener('blur', stopHold)
    return () => {
      window.removeEventListener('blur', stopHold)
      stopHold()
    }
  }, [stopHold])
  const press = (code: number) => (event: ReactPointerEvent) => {
    event.preventDefault()
    stopHold()
    act(code)
    if (code === 2 || code === 3 || code === HARD_CODE) return
    const at = performance.now()
    const id = window.setInterval(() => {
      const h = hold.current
      if (!h) return
      const due = holdTicks(performance.now() - h.at)
      while (h.done < due) {
        h.done += 1
        act(code)
      }
    }, 50)
    hold.current = { code, at, done: 0, id }
  }
  const release = { onPointerUp: stopHold, onPointerCancel: stopHold, onPointerLeave: stopHold, onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault() }

  const s = st.current
  const cells = viewCells(s)
  const settled = new Map<number, number>(cells.settled.map(({ i, type }: { i: number; type: number }) => [i, type]))
  const active = new Map<number, number>(cells.active.map(({ i, type }: { i: number; type: number }) => [i, type]))
  const ghost = new Set<number>(cells.ghost.map(({ i }: { i: number }) => i))
  const next = view.queue[(s.idx + 1) % view.queue.length]
  const blocked = disabled || s.over || s.won

  return (
    <section className="block-lab" aria-label="Xếp khối Pokémon. Mũi tên trái phải để dịch, lên để xoay, xuống hoặc phím cách để thả ngay.">
      <div className="block-lab-score">
        <img src={getPokemonImage(view.speciesId)} alt="Pokémon đồng hành" />
        <div><small>Điểm</small><b>{s.score}</b></div>
        <div><small>Hàng</small><b>{s.lines}<span>/{view.goal}</span></b></div>
        <div><small>Cấp</small><b>{s.level}</b></div>
      </div>
      <div className="block-lab-playfield">
        <div className="block-lab-field" ref={field} data-end={s.over ? 'over' : s.won ? 'won' : undefined}>
          <div className="block-lab-grid" role="grid" aria-label="Bảng xếp khối Pokémon">
            {Array.from({ length: 200 }, (_, i) => {
              const type = settled.get(i) ?? active.get(i)
              const mon = settled.has(i) ? skins.current[i] : active.has(i) ? speciesFor(view.speciesId, s.pieces) : 0
              return <i key={i} data-t={type} data-live={active.has(i) || undefined} data-ghost={(!active.has(i) && !settled.has(i) && ghost.has(i)) || undefined} style={mon ? { ['--mon' as string]: `url(${getPokemonImage(mon)})` } : undefined} />
            })}
          </div>
          <div className="block-lab-layer" aria-hidden="true">
            {trails.map((t) => (
              <i key={t.key} className="block-lab-trail" style={{ left: `${t.col * 10}%`, width: `${t.width * 10}%`, top: `${(t.from / 20) * 100}%`, height: `${((t.to - t.from + 1) / 20) * 100}%` }} />
            ))}
            {sweeps.map((w) => w.rows.map((row) => (
              <i key={`${w.key}-${row}`} className="block-lab-sweep" data-big={w.lines >= 3 || undefined} style={{ top: `${(row / 20) * 100}%` }} />
            )))}
            {sweeps.slice(-1).map((w) => (
              <b key={`c${w.key}`} className="block-lab-call" data-big={w.lines >= 3 || undefined}>{['', 'Gọn!', 'Đôi!', 'Ba hàng!', 'TETRIS!'][w.lines]}</b>
            ))}
          </div>
          <BlockFx ref={fx} />
          {(s.over || s.won) && (
            <div className="block-lab-over" role="status">
              <b>{s.won ? 'Hoàn thành!' : 'Hết chỗ rồi'}</b>
              <span>{s.won ? `Bạn dọn đủ ${view.goal} hàng.` : 'Khối chạm nóc. Ván này thua.'}</span>
            </div>
          )}
        </div>
        <div className="block-lab-side">
          <div className="block-lab-next" aria-label="Khối kế tiếp">
            <small>Kế tiếp</small>
            <div>
              {shapeCells(next, 0).map(([cx, cy]: number[], i: number) => (
                <i key={i} data-t={next} style={{ left: `${cx * 16}px`, top: `${cy * 16}px` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="block-lab-controls" role="group" aria-label="Điều khiển">
        <button type="button" disabled={blocked} aria-label="Sang trái" onPointerDown={press(0)} {...release}>◀</button>
        <button type="button" disabled={blocked} aria-label="Xoay khối" onPointerDown={press(2)} {...release}>⟳</button>
        <button type="button" disabled={blocked} aria-label="Sang phải" onPointerDown={press(1)} {...release}>▶</button>
        <button type="button" disabled={blocked} aria-label="Thả ngay" onPointerDown={press(HARD_CODE)} {...release}>▼</button>
      </div>
    </section>
  )
}
