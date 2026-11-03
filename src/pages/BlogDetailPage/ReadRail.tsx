import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import PokeBallArt from 'pages/HomePage/PokeBallArt'
import { fitMon, pickMon } from './mons.mjs'

const scrollerOf = (node: HTMLElement | null) => {
  for (let el = node?.parentElement; el; el = el.parentElement) {
    const overflow = getComputedStyle(el).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return el
  }
  return null
}

/**
 * The reading rail: a slim bar pinned to the top of the page, in the flow (it
 * covers nothing). The way back on the left; a trail on its right where a
 * Poké Ball rolls, as the article is read, towards a random animated Pokémon
 * (a Gen V pixel sprite or a Showdown model) that waits at the end as a dark
 * "Who's that Pokémon?" silhouette and shows its colours as the ball nears.
 * Where it waits the Pokémon turns white, ripples like water and is slowly drawn in,
 * closes, shakes three times, clicks and bursts into stars, then rolls on to
 * the end of the trail. Reading back up lets the Pokémon out again.
 * The page scrolls inside the app's body, so the scroller is found from the
 * rail. The roll is written as CSS variables and the catch is a data-state
 * (roll / caught / release) the CSS animates: no re-render while scrolling.
 */
// the Pokémon stands at the very end of the trail. The ball catches it when
// the article is read to within CATCH px of its end, and lets it out when read
// back past FREE px from the end: any number of times
const CATCH = 16
const FREE = 56
// the silhouette shows its colours from this share of the way
const REVEAL = 0.7
const TRIES = 4
const BOX = 68

// stars thrown from the ball in arcs: kind (star / twinkle), x reach, peak
// (h) and fall (f) in px from the ball, size, delay (ms), spin (deg), colour
const STARS = [
  { k: 'st', x: -96, h: -20, f: 80, s: 1.2, t: 0, r: -300, c: '#ffd23f' },
  { k: 'st', x: 100, h: -18, f: 86, s: 1.1, t: 20, r: 280, c: '#ff6fb5' },
  { k: 'tw', x: -62, h: -22, f: 59, s: 1.3, t: 40, r: 120, c: '#fff7c2' },
  { k: 'tw', x: 66, h: -22, f: 65, s: 1.2, t: 10, r: -140, c: '#5fd0ff' },
  { k: 'st', x: -34, h: -23, f: 101, s: 0.9, t: 60, r: 240, c: '#8cf0b0' },
  { k: 'st', x: 36, h: -23, f: 104, s: 1, t: 50, r: -220, c: '#ff8a3c' },
  { k: 'tw', x: -126, h: -12, f: 53, s: 0.9, t: 80, r: -90, c: '#ffd23f' },
  { k: 'tw', x: 130, h: -10, f: 59, s: 1, t: 70, r: 100, c: '#ff6fb5' },
  { k: 'st', x: -78, h: -14, f: 107, s: 0.8, t: 110, r: 360, c: '#5fd0ff' },
  { k: 'st', x: 82, h: -16, f: 110, s: 0.8, t: 100, r: -360, c: '#ffd23f' },
  { k: 'tw', x: -12, h: -25, f: 44, s: 1.1, t: 130, r: 90, c: '#ff8a3c' },
  { k: 'tw', x: 14, h: -25, f: 47, s: 0.9, t: 120, r: -90, c: '#8cf0b0' },
]

export default function ReadRail({ onBack }: { onBack: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const tries = useRef(0)
  const [mon, setMon] = useState<ReturnType<typeof pickMon> | null>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  )
  // random, so after mount: the server and the first render agree
  useEffect(() => setMon(pickMon()), [])
  useEffect(() => {
    const root = ref.current
    const scroller = scrollerOf(root)
    if (!root || !scroller) return
    let frame = 0
    let caught = false
    // the Pokémon is drawn towards the ball (and let out of it): the way
    const aim = () => {
      const ball = root.querySelector('.ball-roll')?.getBoundingClientRect()
      const body = root.querySelector('.mon-body')?.getBoundingClientRect()
      if (!ball || !body) return
      root.style.setProperty(
        '--dx',
        `${ball.left + ball.width / 2 - (body.left + body.width / 2)}px`
      )
      root.style.setProperty(
        '--dy',
        `${ball.top + ball.height / 2 - (body.top + body.height / 2)}px`
      )
    }
    // the water: the filter's waves run for a moment, in time with the CSS
    const ripple = (at: number) => {
      root
        .querySelectorAll<SVGAnimationElement>('.ripple-anim')
        .forEach((a) => a.beginElementAt?.(at))
    }
    const update = () => {
      frame = 0
      const room = scroller.scrollHeight - scroller.clientHeight
      const progress =
        room > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / room)) : 0
      root.style.setProperty('--p', String(progress))
      root.style.setProperty('--r', `${progress * 1440}deg`)
      const reveal = progress >= REVEAL ? '1' : '0'
      if (root.dataset.reveal !== reveal) root.dataset.reveal = reveal
      const left = room - scroller.scrollTop
      if (!caught && room > 0 && left <= CATCH) {
        caught = true
        aim()
        root.dataset.state = 'caught'
        ripple(0.15)
      } else if (caught && left > FREE) {
        caught = false
        aim()
        root.dataset.state = 'release'
        ripple(0.45)
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    scroller.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      scroller.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])
  return (
    <div className="read-rail" ref={ref} data-state="roll" data-reveal="0">
      <div className="read-inner">
        <button type="button" className="rail-back" onClick={onBack}>
          <span className="chev" aria-hidden="true" />
          Sổ tay
        </button>
        <div className="read-trail" aria-hidden="true">
          <svg width="0" height="0" style={{ position: 'absolute' }}>
            <defs>
              <filter
                id="rr-ripple"
                x="-60%"
                y="-60%"
                width="220%"
                height="220%"
              >
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.01 0.04"
                  numOctaves="1"
                  result="n"
                >
                  <animate
                    className="ripple-anim"
                    attributeName="baseFrequency"
                    values="0.01 0.03;0.016 0.07;0.01 0.03"
                    dur="0.7s"
                    begin="indefinite"
                  />
                </feTurbulence>
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="n"
                  scale="0"
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="d"
                >
                  <animate
                    className="ripple-anim"
                    attributeName="scale"
                    values="0;50;30;46;0"
                    dur="0.7s"
                    begin="indefinite"
                  />
                </feDisplacementMap>
                <feGaussianBlur in="d" stdDeviation="0">
                  <animate
                    className="ripple-anim"
                    attributeName="stdDeviation"
                    values="0;2;1.2;1.8;0"
                    dur="0.7s"
                    begin="indefinite"
                  />
                </feGaussianBlur>
              </filter>
              <symbol id="rr-st" viewBox="0 0 40 40" overflow="visible">
                <path d="M20 3l4.8 10.4 11.4 1.3-8.4 7.8 2.3 11.2L20 28l-10.1 5.7 2.3-11.2-8.4-7.8 11.4-1.3z" />
              </symbol>
              <symbol id="rr-tw" viewBox="0 0 40 40" overflow="visible">
                <path d="M20 1c1.6 10 7.4 16.4 19 19-11.6 2.6-17.4 9-19 19-1.6-10-7.4-16.4-19-19C12.6 17.4 18.4 11 20 1z" />
              </symbol>
            </defs>
          </svg>
          <span className="trail-fill" />
          <div
            className="trail-mon"
            data-ready={!!size}
            data-pixel={mon?.pixel}
          >
            <span className="mon-shadow" />
            <span className="mon-body">
              <span
                className="mon-ripple"
                style={
                  mon
                    ? ({ '--art': `url("${mon.src}")` } as CSSProperties)
                    : undefined
                }
              >
                {mon && (
                  <img
                    key={mon.src}
                    src={mon.src}
                    alt=""
                    decoding="async"
                    style={size ?? undefined}
                    onLoad={(e) =>
                      setSize(
                        fitMon(
                          e.currentTarget.naturalWidth,
                          e.currentTarget.naturalHeight,
                          mon.pixel,
                          BOX
                        )
                      )
                    }
                    onError={() => {
                      // a model that does not exist: another one, a pixel one
                      if (++tries.current >= TRIES) return setMon(null)
                      setMon(pickMon(() => Math.random() * 0.49))
                    }}
                  />
                )}
              </span>
            </span>
          </div>
          <div className="ball-rig">
            <span className="fx fx-rays" />
            <span className="fx fx-flash" />
            <span className="fx fx-ring" />
            <span className="fx fx-ring fx-ring--b" />
            <span className="ball-roll">
              <span className="ball-fx">
                {/* cap under base: the button (on the base) stays whole */}
                <PokeBallArt className="bh bh--cap" part="cap" />
                <PokeBallArt className="bh bh--base" part="base" />
                <i className="ball-led" />
              </span>
            </span>
            <span className="sparks">
              {STARS.map((star, i) => (
                <i
                  key={i}
                  style={
                    {
                      '--x': `${star.x}px`,
                      '--h': `${star.h}px`,
                      '--f': `${star.f}px`,
                      '--s': star.s,
                      '--t': `${star.t}ms`,
                      '--rot': `${star.r}deg`,
                      color: star.c,
                    } as CSSProperties
                  }
                >
                  <svg viewBox="0 0 40 40">
                    <use href={`#rr-${star.k}`} />
                  </svg>
                </i>
              ))}
            </span>
            <svg className="catch-star" viewBox="0 0 40 40">
              <defs>
                <linearGradient id="rr-star" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fff3a8" />
                  <stop offset="1" stopColor="#ffb800" />
                </linearGradient>
              </defs>
              <path
                d="M20 3l4.8 10.4 11.4 1.3-8.4 7.8 2.3 11.2L20 28l-10.1 5.7 2.3-11.2-8.4-7.8 11.4-1.3z"
                fill="url(#rr-star)"
                stroke="#172d45"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
