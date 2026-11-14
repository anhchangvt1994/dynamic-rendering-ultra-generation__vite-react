import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { SPIN, rewardFor } from './rules.mjs'
import type { LuckySpinView, SpinResult, SpinStep } from '../../useMiniGame'

type Props = {
  view: LuckySpinView
  disabled: boolean
  spin: () => Promise<SpinResult>
  onDone: (result: SpinResult) => void
  onError: (error: Error) => void
  practice?: boolean
}

const { COLS, ROWS, SPINS, SPECIES, SYMBOL_PTS, RUN_MULT, STREAK10, TIERS, SWEEP_MULT } = SPIN
const FIRST: number[][] = Array.from({ length: COLS }, (_, c) => Array.from({ length: ROWS }, (_, r) => (r + c) % SPECIES.length))
const STEP_MS = 820
const STAGGER_MS = 240
const HOLD_MS = 1700
const COMBO_LABEL = STREAK10.map((m) => (m % 10 ? (m / 10).toFixed(1) : String(m / 10)))
const columnsOf = (grid: number[]) =>
  Array.from({ length: COLS }, (_, c) => Array.from({ length: ROWS }, (_, r) => grid[r * COLS + c]))
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function useTally(value: number) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const a = from.current
    if (a === value) return
    const t0 = performance.now()
    const span = Math.min(700, 220 + Math.abs(value - a) * 40)
    let raf = 0
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / span)
      from.current = Math.round(a + (value - a) * k)
      setShown(from.current)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return shown
}

type Reel = { strip: number[]; drop: number }

/**
 * Máy quay Pokémon: 5 reels x 3 rows, 3 spins, one reward at the end. The server draws every
 * grid and prices it (rules.mjs is the same maths); the reels only dress what came back.
 * Reels drop with transform animations, so a spin costs no layout and no JS per frame.
 */
export default function Board({ view, disabled, spin, onDone, onError, practice = false }: Props) {
  const start = view.spins ?? []
  const [cols, setCols] = useState<number[][]>(() => (start.length ? columnsOf(start[start.length - 1].grid) : FIRST))
  const [spins, setSpins] = useState<SpinStep[]>(start)
  const [reels, setReels] = useState<Reel[] | null>(null)
  const [last, setLast] = useState<SpinStep | null>(null)
  const [busy, setBusy] = useState(false)
  const [wrap, setWrap] = useState(false)
  const alive = useRef(true)
  const timers = useRef<number[]>([])
  const landing = useRef<(() => void) | null>(null)
  const ended = useRef(0)

  useEffect(() => {
    alive.current = true
    SPECIES.forEach((id: number) => {
      const img = new Image()
      img.src = getPokemonImage(id)
    })
    return () => {
      alive.current = false
      timers.current.forEach((t) => window.clearTimeout(t))
    }
  }, [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(() => alive.current && fn(), ms))
  }

  const total = spins.length ? spins[spins.length - 1].total : view.total ?? 0
  const streak = spins.length ? spins[spins.length - 1].streak : view.streak ?? 0
  const shown = useTally(total)
  const left = SPINS - spins.length
  const reward = rewardFor(total)
  const lit = useMemo(() => {
    const cells = new Map<number, number>()
    last?.lines.forEach((line) => {
      for (let k = 0; k < line.len; k += 1) cells.set(line.row * COLS + line.start + k, line.start + k)
    })
    return cells
  }, [last])

  const play = async () => {
    if (busy || disabled || left <= 0) return
    setBusy(true)
    setLast(null)
    setWrap(false)
    let result: SpinResult
    try {
      result = await spin()
    } catch (error) {
      setBusy(false)
      onError(error as Error)
      return
    }
    if (!alive.current) return
    const next = columnsOf(result.spin.grid)
    let landed = false
    const land = () => {
      if (landed || !alive.current) return
      landed = true
      landing.current = null
      setCols(next)
      setReels(null)
      setSpins((all) => [...all, result.spin])
      setLast(result.spin)
      setWrap(true)
      if (result.done) later(() => onDone(result), HOLD_MS)
      else setBusy(false)
    }
    if (reduced()) return land()
    ended.current = 0
    landing.current = land
    setReels(
      next.map((col, c) => {
        const filler = Array.from({ length: 9 + c * 3 }, () => Math.floor(Math.random() * SPECIES.length))
        return { strip: [Math.floor(Math.random() * SPECIES.length), ...col, ...filler, ...cols[c]], drop: 13 + c * 3 }
      })
    )
    later(land, STEP_MS + STAGGER_MS * (COLS - 1) + 400)
  }

  const reelEnd = () => {
    ended.current += 1
    if (ended.current >= COLS) landing.current?.()
  }

  const hot = last && last.pts > 0
  const note = !last
    ? left === SPINS
      ? `${SPINS} lượt quay, nhận thưởng một lần ở cuối.`
      : `Còn ${left} lượt.`
    : hot
      ? `Lượt ${spins.length}: ${last.lines.length} hàng thắng, +${last.score} điểm.`
      : `Lượt ${spins.length}: chưa có hàng nào, combo về ×1.`

  return (
    <section className="sp" data-busy={busy || undefined} data-hot={hot || undefined} data-swept={last?.swept || undefined} data-done={left <= 0 || undefined}>
      <div className="sp-lights" aria-hidden="true" />
      <header className="sp-head">
        <span className="sp-mark" aria-hidden="true">✦</span>
        <h3>Vòng quay may mắn</h3>
        <div className="sp-pips" aria-label={`Còn ${left} lượt quay`}>
          {Array.from({ length: SPINS }, (_, i) => (
            <i key={i} data-used={i < spins.length || undefined} />
          ))}
        </div>
      </header>

      <div className="sp-cab">
        <div className="sp-win" role="img" aria-label={`Máy quay ${ROWS} hàng ${COLS} ô`}>
          {cols.map((col, c) => {
            const reel = reels?.[c]
            const symbols = reel ? reel.strip : col
            return (
              <div className="sp-reel" key={c}>
                <div
                  className="sp-strip"
                  data-roll={reel ? '' : undefined}
                  style={reel ? ({ '--n': reel.drop, '--ms': `${STEP_MS + c * STAGGER_MS}ms` } as CSSProperties) : undefined}
                  onAnimationEnd={reel ? reelEnd : undefined}
                >
                  {symbols.map((sym, i) => {
                    const row = reel ? i - 1 : i
                    const key = row * COLS + c
                    const on = !reel && lit.has(key)
                    return (
                      <span className="sp-cell" key={i} data-win={on || undefined} style={on ? ({ '--d': `${c * 70}ms` } as CSSProperties) : undefined}>
                        <img src={getPokemonImage(SPECIES[sym])} alt="" draggable={false} />
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {!reels &&
            last?.lines.map((line) => (
              <i
                className="sp-line"
                key={`${spins.length}-${line.row}`}
                style={{ '--row': line.row, '--from': line.start, '--len': line.len } as CSSProperties}
              />
            ))}
          {hot && (
            <div className="sp-burst" key={spins.length} aria-hidden="true">
              {Array.from({ length: last.swept ? 18 : 10 }, (_, i) => (
                <i key={i} style={{ '--a': `${(360 / (last.swept ? 18 : 10)) * i}deg`, '--k': 1 + (i % 3) * 0.35 } as CSSProperties} />
              ))}
            </div>
          )}
          {hot && wrap && (
            <div className="sp-banner" key={`b${spins.length}`} aria-hidden="true">
              {last.swept ? <b>Quét sạch ×{SWEEP_MULT}</b> : <b>+{last.score}</b>}
              {last.streak > 1 && <span>Combo ×{COMBO_LABEL[Math.min(last.streak, STREAK10.length) - 1]}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="sp-hud">
        <div className="sp-combo" aria-label="Combo liên tiếp">
          {COMBO_LABEL.map((label, i) => (
            <span key={label} data-on={streak >= i + 1 || undefined} data-now={streak === i + 1 || undefined}>
              ×{label}
            </span>
          ))}
        </div>
        <div className="sp-score">
          <small>Điểm</small>
          <b>{shown}</b>
        </div>
        <div className="sp-gift" aria-label="Quà đang có">
          <small>Quả Oran</small>
          <b>×{reward.items.length}</b>
        </div>
      </div>

      <div className="sp-meter" aria-hidden="true">
        <i style={{ '--p': Math.min(1, total / TIERS.rare) } as CSSProperties} />
        <s style={{ left: `${(TIERS.uncommon / TIERS.rare) * 100}%` }} data-on={total >= TIERS.uncommon || undefined} />
        <s style={{ left: '100%' }} data-on={total >= TIERS.rare || undefined} />
      </div>

      <p className="sp-note" role="status" aria-live="polite">
        {note}
      </p>

      <button type="button" className="mg-cta sp-go" disabled={disabled || busy || left <= 0} onClick={() => void play()}>
        {left <= 0 ? 'Đang mở quà…' : busy ? 'Đang quay…' : spins.length ? `Quay tiếp · còn ${left}` : `Quay · ${SPINS} lượt`}
      </button>

      <details className="sp-pay">
        <summary>Bảng thưởng</summary>
        <ul>
          {SPECIES.map((id: number, i: number) => (
            <li key={id}>
              <img src={getPokemonImage(id)} alt="" draggable={false} />
              <b>{SYMBOL_PTS[i]}</b>
            </li>
          ))}
        </ul>
        <p>
          3 ô liền ×{RUN_MULT[3]} · 4 ô ×{RUN_MULT[4]} · 5 ô ×{RUN_MULT[5]} (tính từng hàng). Thắng liên tiếp nhân combo; cả {ROWS} hàng thắng nhân {SWEEP_MULT}.
          {practice ? ' Chơi thử: không nhận quà.' : ''}
        </p>
      </details>
    </section>
  )
}
