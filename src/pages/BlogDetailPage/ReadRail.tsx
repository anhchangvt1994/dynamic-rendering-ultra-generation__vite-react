import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
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
 * At the end of the article the ball catches it: flash, drawn into the ball,
 * three shakes, a click and a burst of stars. Reading back up lets it out.
 * The page scrolls inside the app's body, so the scroller is found from the
 * rail. The roll is written as CSS variables and the catch is a data-state
 * (roll / caught / release) the CSS animates: no re-render while scrolling.
 */
// the ball reaches the Pokémon at this share of the article; it is caught from
// CATCH on and let out again below FREE (a gap, so the edge does not flicker)
const CATCH = 0.92
const FREE = 0.9
// the silhouette shows its colours from here
const REVEAL = 0.6
const TRIES = 4

const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315]

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
    const update = () => {
      frame = 0
      const room = scroller.scrollHeight - scroller.clientHeight
      const progress =
        room > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / room)) : 0
      const travel = Math.min(1, progress / CATCH)
      root.style.setProperty('--p', String(travel))
      root.style.setProperty('--r', `${travel * 1080}deg`)
      const reveal = progress >= REVEAL ? '1' : '0'
      if (root.dataset.reveal !== reveal) root.dataset.reveal = reveal
      if (!caught && progress >= CATCH) {
        caught = true
        root.dataset.state = 'caught'
      } else if (caught && progress < FREE) {
        caught = false
        root.dataset.state = 'release'
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
          <span className="trail-fill" />
          <div
            className="trail-mon"
            data-ready={!!size}
            data-pixel={mon?.pixel}
          >
            <span className="mon-shadow" />
            <span className="mon-body">
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
                        mon.pixel
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
          </div>
          <div className="ball-rig">
            <span className="fx-flash" />
            <span className="fx-ring" />
            <svg className="read-ball" viewBox="0 0 100 100">
              <defs>
                <radialGradient id="rr-top" cx="38%" cy="28%" r="80%">
                  <stop offset="0" stopColor="#ff7a5c" />
                  <stop offset="0.55" stopColor="#e3350d" />
                  <stop offset="1" stopColor="#a81f05" />
                </radialGradient>
                <radialGradient id="rr-bottom" cx="40%" cy="70%" r="80%">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="0.6" stopColor="#eef1f5" />
                  <stop offset="1" stopColor="#b9c3cf" />
                </radialGradient>
              </defs>
              <circle cx="50" cy="50" r="46" fill="url(#rr-bottom)" />
              <path d="M4 50a46 46 0 0 1 92 0z" fill="url(#rr-top)" />
              <path d="M4 50h92" stroke="#172d45" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="#172d45"
                strokeWidth="7"
              />
              <circle
                cx="50"
                cy="50"
                r="14"
                fill="#f4f6f8"
                stroke="#172d45"
                strokeWidth="7"
              />
              <circle className="ball-led" cx="50" cy="50" r="7" fill="#fff" />
              <ellipse
                cx="31"
                cy="27"
                rx="11"
                ry="6.5"
                fill="#fff"
                opacity="0.55"
                transform="rotate(-35 31 27)"
              />
            </svg>
            <span className="sparks">
              {SPARKS.map((angle, i) => (
                <i
                  key={angle}
                  style={
                    {
                      '--a': `${angle}deg`,
                      '--d': `${i % 2 ? 26 : 38}px`,
                    } as CSSProperties
                  }
                />
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
