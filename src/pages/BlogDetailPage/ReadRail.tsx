import { useEffect, useRef } from 'react'

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
 * Poké Ball rolls, as the article is read, to a Pikachu waiting at the end.
 * At the end of the article the ball catches it: the Pikachu is drawn in, the
 * ball shakes, a star jumps out. Reading back up lets it out again.
 * The page scrolls inside the app's body, so the scroller is found from the
 * rail. The roll is written as CSS variables and the catch is a data-state
 * (roll / caught / release) the CSS animates: no re-render.
 */
// the ball reaches the Pikachu at this share of the article; it is caught from
// CATCH on and let out again below FREE (a gap, so the edge does not flicker)
const CATCH = 0.92
const FREE = 0.9

export default function ReadRail({ onBack }: { onBack: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
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
    <div className="read-rail" ref={ref} data-state="roll">
      <div className="read-inner">
        <button type="button" className="rail-back" onClick={onBack}>
          <span className="chev" aria-hidden="true" />
          Sổ tay
        </button>
        <div className="read-trail" aria-hidden="true">
          <span className="trail-fill" />
          <svg className="read-ball" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="#f4f4f4"
              stroke="#172d45"
              strokeWidth="8"
            />
            <path
              d="M4 50a46 46 0 0 1 92 0z"
              fill="#e3350d"
              stroke="#172d45"
              strokeWidth="8"
            />
            <path d="M4 50h92" stroke="#172d45" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="13"
              fill="#f4f4f4"
              stroke="#172d45"
              strokeWidth="8"
            />
          </svg>
          <svg className="trail-mon" viewBox="0 0 48 48">
            <path
              className="mon-tail"
              d="M36 40l6-5-3-4 8-7-1 9-4 1 2 6z"
              fill="#f5b800"
              stroke="#172d45"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M12 20L8 3l14 9z"
              fill="#ffd23f"
              stroke="#172d45"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M36 20l5-16-15 8z"
              fill="#ffd23f"
              stroke="#172d45"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path d="M8 3l1.7 7 4.6-2.2z M41 4l-2 7.4-5.2-2.6z" fill="#172d45" />
            <ellipse
              cx="24"
              cy="31"
              rx="17"
              ry="14.5"
              fill="#ffd23f"
              stroke="#172d45"
              strokeWidth="2.5"
            />
            <circle cx="16.5" cy="28" r="2.8" fill="#172d45" />
            <circle cx="31.5" cy="28" r="2.8" fill="#172d45" />
            <circle cx="17.3" cy="27" r="0.9" fill="#fff" />
            <circle cx="32.3" cy="27" r="0.9" fill="#fff" />
            <circle cx="10.5" cy="34" r="3.6" fill="#e3350d" />
            <circle cx="37.5" cy="34" r="3.6" fill="#e3350d" />
            <path
              d="M20.5 34c1.2 2.6 5.8 2.6 7 0"
              fill="none"
              stroke="#172d45"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <svg className="catch-star" viewBox="0 0 40 40">
            <path
              d="M20 3l4.8 10.4 11.4 1.3-8.4 7.8 2.3 11.2L20 28l-10.1 5.7 2.3-11.2-8.4-7.8 11.4-1.3z"
              fill="#ffd23f"
              stroke="#172d45"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
