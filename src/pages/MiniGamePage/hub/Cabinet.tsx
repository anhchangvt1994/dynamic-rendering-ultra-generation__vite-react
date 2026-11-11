import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { MINIGAME } from '../minigame.mjs'
import CandyScreen from './demo/CandyScreen'
import MemoryScreen from './demo/MemoryScreen'
import TicketRow from './TicketRow'
import { boothLabel, outOfTurns } from './tickets.mjs'
import { tiltFromPointer } from './tilt.mjs'

type Game = { id: string; title: string; blurb: string }
type Props = {
  game: Game
  index: number
  server: boolean
  left: number | null
  resetText: string
  open: boolean
  hasOpen?: boolean
  onPlay: () => void
}

const HUE: Record<string, string> = { candy: '#ff6b8a', memory: '#5fe3b4' }
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** One arcade cabinet: a screen that plays itself, a deck, a coin slot and the Chơi button. */
export default function Cabinet({ game, index, server, left, resetText, open, hasOpen = false, onPlay }: Props) {
  const total = MINIGAME.TURNS
  const label = boothLabel({ server, left, total, resetText })
  const out = outOfTurns({ server, left, hasOpen })
  const root = useRef<HTMLElement>(null)
  const [seen, setSeen] = useState(false)
  const [visible, setVisible] = useState(true)
  const [phase, setPhase] = useState<'idle' | 'insert' | 'blink'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const frame = useRef(0)

  useEffect(() => {
    const el = root.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    const sync = () => setVisible(!document.hidden)
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      cancelAnimationFrame(frame.current)
    },
    [],
  )

  const move = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return
    const el = root.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const { rx, ry, sx, sy } = tiltFromPointer({ x: e.clientX - r.left, y: e.clientY - r.top, width: r.width, height: r.height }, 10)
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--sx', `${sx}%`)
      el.style.setProperty('--sy', `${sy}%`)
      el.style.setProperty('--jx', `${ry}deg`)
      el.style.setProperty('--jy', `${rx}deg`)
      el.dataset.lit = ''
    })
  }
  const leave = () => {
    cancelAnimationFrame(frame.current)
    const el = root.current
    if (!el) return
    delete el.dataset.lit
    el.style.setProperty('--jx', '0deg')
    el.style.setProperty('--jy', '0deg')
  }

  const press = () => {
    clearTimeout(timer.current)
    if (out) {
      setPhase('blink')
      timer.current = setTimeout(() => setPhase('idle'), 700)
      return
    }
    if (reduced()) return onPlay()
    setPhase('insert')
    timer.current = setTimeout(() => {
      setPhase('idle')
      onPlay()
    }, 460)
  }

  const active = seen && visible && !open && phase === 'idle'
  return (
    <article
      ref={root}
      data-region="booth"
      data-phase={phase}
      data-open={open || undefined}
      style={{ ['--n' as string]: 2 + index, ['--hue' as string]: HUE[game.id] ?? '#ffcf5a' }}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      <div className="cab">
        <div className="cab-cap">
          <h2>{game.title}</h2>
        </div>
        <div className="cab-screen" aria-hidden="true">
          {game.id === 'candy' ? <CandyScreen active={active} /> : <MemoryScreen active={active} />}
          <div className="cab-ready">Sẵn sàng</div>
          <span className="cab-glare" />
        </div>
        <div className="cab-deck" aria-hidden="true">
          <span className="cab-stick" />
          <span className="cab-btn" />
          <span className="cab-btn" />
          <span className="cab-slot">
            <i className="cab-stub" />
          </span>
        </div>
        <p className="cab-rule">{game.blurb}</p>
        <TicketRow left={server ? left : total} total={total} label={label} />
        <button type="button" className="mgp-play hub-booth-btn" onClick={press}>
          {out ? 'Hết lượt' : 'Chơi'}
        </button>
      </div>
    </article>
  )
}
