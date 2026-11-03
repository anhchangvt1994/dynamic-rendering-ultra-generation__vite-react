import { useEffect, useRef } from 'react'

const scrollerOf = (node: HTMLElement | null) => {
  for (let el = node?.parentElement; el; el = el.parentElement) {
    const overflow = getComputedStyle(el).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return el
  }
  return null
}

/**
 * Reading progress: a Poké Ball rolling down the right edge (≥ 900px), a thin
 * bar along the top below that. The page scrolls inside the app's body, so the
 * scroller is found from the ball. It writes CSS variables, no re-render.
 */
export default function ReadBall() {
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
      root.style.setProperty(
        '--y',
        `${progress * Math.max(0, scroller.clientHeight - 96)}px`
      )
      root.style.setProperty('--r', `${progress * 1440}deg`)
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
    <div className="read-progress" ref={ref} aria-hidden="true">
      <span className="read-bar" />
      <svg className="read-ball" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" fill="#f4f4f4" stroke="#172d45" strokeWidth="6" />
        <path d="M4 50a46 46 0 0 1 92 0z" fill="#e3350d" stroke="#172d45" strokeWidth="6" />
        <path d="M4 50h92" stroke="#172d45" strokeWidth="6" />
        <circle cx="50" cy="50" r="13" fill="#f4f4f4" stroke="#172d45" strokeWidth="6" />
      </svg>
    </div>
  )
}
