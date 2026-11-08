import { useEffect, useId, useRef, useState } from 'react'
import { useReducedMotion } from '../room/useMedia'
import EvoArt from './EvoArt'
import { EvolveFxStyle } from './styles'
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
// stat rows of the Field Notes page: HP, Attack, Speed
const ROWS = [
  ['HP', 0],
  ['Tấn công', 1],
  ['Tốc độ', 5],
] as const

type Props = {
  fromId: number
  toId: number
  toName: string
  /** per-stat change from the receipt build (HP, Atk, Def, SpA, SpD, Spe) */
  stats: number[] | null
  first: boolean
  onDone: () => void
}

/**
 * The approved sequence: light flicker, hologram scan, water warp, burst, the
 * new form, a Field Notes page. Styles are written per frame from frameAt.
 * Esc and "Bỏ qua" only work once the new form has appeared.
 */
export default function EvolveFx({
  fromId,
  toId,
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
  const [canSkip, setCanSkip] = useState(false)
  const done = useRef(onDone)
  done.current = onDone
  const reg = (name: string) => (node: HTMLElement | null) => {
    el.current[name] = node
  }

  useEffect(() => {
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
    let last = ''
    const fit = () => {
      const stage = e.stage
      const box = e.box
      if (!stage || !box) return
      const k = Math.min(1, stage.clientWidth / 480, stage.clientHeight / 420)
      box.style.setProperty('--k', String(k))
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
      set('stage', { opacity: String(Math.min(1, f.scrim * 4)) })
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
      set('shift', { transform: `translateX(${-150 * f.shift}px)` })
      set('page', {
        opacity: f.pageOpen > 0 ? '1' : '0',
        transform: `perspective(700px) rotateY(${88 * (1 - f.pageOpen)}deg)`,
      })
      set('stamp', {
        opacity: f.stamp > 0 ? '1' : '0',
        transform: `rotate(-8deg) scale(${1 + 1.4 * (1 - f.stamp)})`,
      })
      list('deltas').forEach((d, i) => {
        const b = d.querySelector('b') as HTMLElement | null
        if (!b) return
        b.style.opacity = String(f.deltas[i])
        b.style.transform = `translateY(${6 * (1 - f.deltas[i])}px)`
      })
      set('badge', {
        opacity: String(f.badge),
        transform: `translateY(${-10 * (1 - f.badge)}px)`,
      })
      const caption = String(f.caption)
      if (caption !== last) {
        last = caption
        if (e.cap) e.cap.textContent = caption
      }
      set('cap', { opacity: caption ? '1' : '0' })
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
  }, [reduced, uid])

  return (
    <EvolveFxStyle
      ref={dialog}
      aria-label={`Tiến hoá thành ${toName}`}
      data-dialog="evolve-fx"
    >
      <div className="fx-stage" ref={reg('stage')} style={{ opacity: 0 }}>
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
        <div className="fx-box" ref={reg('box')} aria-hidden="true">
          <div className="abs scan" ref={reg('scan')} />
          <div className="fx-shift" ref={reg('shift')}>
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
          <div className="abs page" ref={reg('page')}>
            <h4>Field Notes · №&nbsp;{toId}</h4>
            <EvoArt id={toId} className="pg-art" />
            <ul ref={reg('deltas')}>
              {ROWS.map(([label, index]) => (
                <li key={label}>
                  {label}
                  {stats && <b>+{Math.max(0, stats[index] ?? 0)}</b>}
                </li>
              ))}
            </ul>
            <div className="stamp" ref={reg('stamp')}>
              ĐÃ GHI NHẬN
            </div>
          </div>
          {first && (
            <div className="abs badge" ref={reg('badge')}>
              Lần đầu tiến hoá thành {toName}!
            </div>
          )}
          <div className="abs cap" ref={reg('cap')} />
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
