import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../room/useMedia'
import EvoArt from './EvoArt'
import { EvolveFxStyle } from './styles'
import { fxLayout, HERO } from './layout.mjs'
import { frameAt, TOTAL } from './timeline.mjs'

const RAYS = 8
const SHARDS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2
  const d = 130 + (i % 3) * 45
  return { x: Math.cos(a) * d, y: Math.sin(a) * d }
})
const WAVES = 4
// the new form takes the place of the old one from here (timeline: w = 5.3)
const SWAPPED_AT = 8.3
// stat rows of the ticket: HP, Attack, Speed
const ROWS = [
  ['HP', 0],
  ['Tấn công', 1],
  ['Tốc độ', 5],
] as const

type Props = {
  fromId: number
  toId: number
  fromName: string
  toName: string
  /** per-stat change from the receipt build (HP, Atk, Def, SpA, SpD, Spe) */
  stats: number[] | null
  first: boolean
  onDone: () => void
}

/**
 * Light flicker, hologram scan, water warp, burst, the new form, then the
 * "phiếu ghi nhận" ticket. The scene is laid out in px from the stage size
 * (fxLayout), so it fits any screen; styles are written per frame from frameAt.
 * Esc and "Bỏ qua" only work once the new form has appeared.
 */
export default function EvolveFx({
  fromId,
  toId,
  fromName,
  toName,
  stats,
  first,
  onDone,
}: Props) {
  const reduced = useReducedMotion()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const dialog = useRef<HTMLDialogElement>(null)
  const el = useRef<Record<string, HTMLElement | null>>({})
  const noise = useRef<SVGFETurbulenceElement>(null)
  const disp = useRef<SVGFEDisplacementMapElement>(null)
  const swapped = useRef(false)
  const geo = useRef(fxLayout(320, 480))
  const [canSkip, setCanSkip] = useState(false)
  const done = useRef(onDone)
  done.current = onDone
  const reg = (name: string) => (node: HTMLElement | null) => {
    el.current[name] = node
  }

  // open before the first paint: the prompt hands over with no empty frame
  useLayoutEffect(() => {
    const d = dialog.current
    if (!d) return
    if (!d.open) d.showModal?.()
    // Esc closes only after the swap
    const onCancel = (event: Event) => {
      if (swapped.current) done.current()
      else event.preventDefault()
    }
    d.addEventListener('cancel', onCancel)
    return () => d.removeEventListener('cancel', onCancel)
  }, [])

  useEffect(() => {
    const e = el.current
    const set = (name: string, style: Partial<CSSStyleDeclaration>) => {
      const node = e[name]
      if (node) Object.assign(node.style, style)
    }
    const list = (name: string) =>
      Array.from(e[name]?.children ?? []) as HTMLElement[]
    let raf = 0
    const fit = () => {
      const stage = e.stage
      if (!stage) return
      const g = fxLayout(stage.clientWidth, stage.clientHeight)
      geo.current = g
      const t = e.ticket
      if (t) {
        t.style.left = `${g.ticket.x}px`
        t.style.top = `${g.ticket.y}px`
        t.style.width = `${g.ticket.w}px`
        t.style.height = `${g.ticket.h}px`
      }
    }
    fit()
    window.addEventListener('resize', fit)
    const start = performance.now()
    const tick = (now: number) => {
      const u = Math.min(TOTAL, (now - start) / 1000)
      const f = frameAt(u, { reduced })
      const warp = `url(#${uid}w) brightness(${1 + 7 * f.glow}) drop-shadow(0 0 ${28 * f.glow}px rgba(255,255,255,${f.glow}))`
      disp.current?.setAttribute('scale', f.displaceScale.toFixed(1))
      if (!reduced)
        noise.current?.setAttribute(
          'baseFrequency',
          `${(0.012 + 0.004 * Math.sin(now / 650)).toFixed(4)} ${(0.03 + 0.008 * Math.cos(now / 800)).toFixed(4)}`
        )
      set('stage', { opacity: String(f.scrim) })
      set('old', {
        opacity: String(f.oldOpacity),
        filter: warp,
        transform: `scale(${f.oldScale})`,
      })
      set('new', {
        opacity: String(f.newOpacity),
        filter: warp,
        transform: `scale(${f.newScale})`,
      })
      const g = geo.current
      const cx = g.start.x + (g.end.x - g.start.x) * f.lift
      const cy = g.start.y + (g.end.y - g.start.y) * f.lift
      const sc = 1 + (g.k - 1) * f.lift
      set('box', {
        transform: `translate(${cx - HERO / 2}px,${cy - HERO / 2}px) scale(${sc})`,
      })
      set('ring', {
        opacity: String(f.ringOpacity),
        transform: `rotate(${f.ringRotate}deg) scale(${f.ringScale})`,
      })
      e.ring?.style.setProperty('--ring', f.glow > 0.6 ? '#fff' : '#ffd23f')
      set('ring2', {
        opacity: String(f.ring2Opacity),
        transform: `scale(${f.ring2Scale})`,
      })
      set('scan', { opacity: String(f.scanOn), top: `${f.scanTop}%` })
      list('waves').forEach((w, i) => {
        const p = (now / 1500 + i / WAVES) % 1
        w.style.opacity = String(f.waves * (1 - p) * 0.9)
        w.style.transform = `scale(${0.7 + p * 2.6})`
      })
      set('orb', {
        opacity: String(f.orb),
        transform: `scale(${f.orbScale})`,
      })
      list('rays').forEach((r, i) => {
        r.style.opacity = String(f.rays)
        r.style.transform = `rotate(${i * (360 / RAYS)}deg) scaleY(${f.raysScale})`
      })
      list('shards').forEach((s, i) => {
        const sh = SHARDS[i]
        const on = f.shards > 0 && f.shards < 1
        s.style.opacity = on ? String(1 - f.shards) : '0'
        s.style.transform = `translate(${sh.x * f.shards}px,${sh.y * f.shards}px) rotate(${f.shards * 360}deg)`
      })
      set('flash', { opacity: String(f.flash) })
      set('stamp', {
        opacity: f.stamp > 0 ? '1' : '0',
        transform: `rotate(-8deg) scale(${1 + 1.4 * (1 - f.stamp)})`,
      })
      set('ticket', {
        opacity: String(f.ticket),
        transform: `translate(${g.from.x * (1 - f.ticket)}px,${g.from.y * (1 - f.ticket)}px)`,
      })
      list('deltas').forEach((d, i) => {
        const v = f.deltas[i]
        const gain = Math.max(0, stats?.[ROWS[i][1]] ?? 0)
        const n = d.querySelector('b')
        if (n) n.textContent = `+${Math.round(gain * v)}`
        const bar = d.querySelector('i') as HTMLElement | null
        if (bar) bar.style.transform = `scaleX(${gain ? v * Math.min(1, 0.25 + gain / 40) : 0})`
        d.style.opacity = String(0.35 + 0.65 * v)
      })
      set('first', {
        opacity: String(f.badge),
        transform: `scale(${0.8 + 0.2 * f.badge})`,
      })
      if (!swapped.current && u >= SWAPPED_AT) {
        swapped.current = true
        setCanSkip(true)
      }
      if (u >= TOTAL) {
        done.current()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', fit)
    }
  }, [reduced, uid, stats])

  return (
    <EvolveFxStyle
      ref={dialog}
      aria-label={`Tiến hoá thành ${toName}`}
      data-dialog="evolve-fx"
    >
      <div className="fx-stage" ref={reg('stage')}>
        <svg
          width="0"
          height="0"
          style={{ position: 'absolute' }}
          aria-hidden="true"
        >
          <filter
            id={`${uid}w`}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              ref={noise}
              type="fractalNoise"
              baseFrequency="0.012 0.03"
              numOctaves={2}
              seed={toId % 97}
              result="n"
            />
            <feDisplacementMap
              ref={disp}
              in="SourceGraphic"
              in2="n"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
        <div className="abs scan" ref={reg('scan')} />
        <div className="fx-box" ref={reg('box')} aria-hidden="true">
          <div className="abs ring" ref={reg('ring')} />
          <div ref={reg('waves')}>
            {Array.from({ length: WAVES }, (_, i) => (
              <div className="abs wv" key={i} />
            ))}
          </div>
          <div className="abs mon" ref={reg('old')}>
            <EvoArt id={fromId} style={{ width: '100%', height: '100%' }} />
          </div>
          <div className="abs mon" ref={reg('new')} style={{ opacity: 0 }}>
            <EvoArt id={toId} style={{ width: '100%', height: '100%' }} />
          </div>
          <div className="abs orb" ref={reg('orb')} />
          <div ref={reg('rays')}>
            {Array.from({ length: RAYS }, (_, i) => (
              <div className="abs ray" key={i} />
            ))}
          </div>
          <div ref={reg('shards')}>
            {SHARDS.map((_, i) => (
              <div className="abs sh" key={i} />
            ))}
          </div>
          <div className="abs ring2" ref={reg('ring2')} />
        </div>
        <div className="tk" ref={reg('ticket')} aria-hidden="true">
          <h4>
            <span>Phiếu ghi nhận</span>
            <span>№&nbsp;{toId}</span>
          </h4>
          <p className="tk-form">
            <span>{fromName}</span>
            <em>→</em>
            <b>{toName}</b>
          </p>
          {stats && (
            <ul ref={reg('deltas')}>
              {ROWS.map(([label]) => (
                <li key={label}>
                  <span>{label}</span>
                  <u>
                    <i />
                  </u>
                  <b>+0</b>
                </li>
              ))}
            </ul>
          )}
          <div className="tk-foot">
            {first ? (
              <p className="tk-first" ref={reg('first')}>
                ★ Lần đầu thành {toName}
              </p>
            ) : (
              <span />
            )}
            <div className="stamp" ref={reg('stamp')}>
              ĐÃ GHI NHẬN
            </div>
          </div>
        </div>
        <div className="flash" ref={reg('flash')} />
        {canSkip && (
          <button
            type="button"
            className="fx-skip"
            data-action="skip"
            onClick={() => done.current()}
          >
            Bỏ qua
          </button>
        )}
        <p className="sr" role="status">
          {canSkip ? `Đã tiến hoá thành ${toName}.` : 'Đang tiến hoá…'}
        </p>
      </div>
    </EvolveFxStyle>
  )
}
