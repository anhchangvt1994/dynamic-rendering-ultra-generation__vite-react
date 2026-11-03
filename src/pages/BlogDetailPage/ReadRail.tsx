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
 * Poké Ball rolls from the start to the end flag as the article is read. The
 * page scrolls inside the app's body, so the scroller is found from the rail.
 * It writes CSS variables, no re-render.
 */
export default function ReadRail({ onBack }: { onBack: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current
    const scroller = scrollerOf(root)
    if (!root || !scroller) return
    let frame = 0
    const update = () => {
      frame = 0
      const room = scroller.scrollHeight - scroller.clientHeight
      const progress =
        room > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / room)) : 0
      root.style.setProperty('--p', String(progress))
      root.style.setProperty('--r', `${progress * 1080}deg`)
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
    <div className="read-rail" ref={ref}>
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
          <span className="trail-flag" />
        </div>
      </div>
    </div>
  )
}
