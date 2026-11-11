import { Children, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { activeIndex } from './carouselMath.mjs'

/**
 * The cabinets: a plain grid from md up, a scroll-snap row below it (next one peeks) with dots.
 * No layout measurement; the dots only read the scroll position.
 */
export default function Carousel({ children, skeleton }: { children: ReactNode; skeleton?: boolean }) {
  const count = Children.count(children)
  const row = useRef<HTMLDivElement>(null)
  const raf = useRef(0)
  const [at, setAt] = useState(0)

  const read = useCallback(() => {
    const el = row.current
    if (!el || el.children.length < 2) return
    const a = el.children[0] as HTMLElement
    const b = el.children[1] as HTMLElement
    setAt(activeIndex(el.scrollLeft, b.offsetLeft - a.offsetLeft, count))
  }, [count])
  const onScroll = () => {
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(read)
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const go = (i: number) => {
    const el = row.current
    const item = el?.children[Math.max(0, Math.min(count - 1, i))] as HTMLElement | undefined
    if (!el || !item) return
    const instant = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: item.offsetLeft - (el.children[0] as HTMLElement).offsetLeft, behavior: instant ? 'auto' : 'smooth' })
  }
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(at + 1)
    else if (e.key === 'ArrowLeft') go(at - 1)
    else return
    e.preventDefault()
  }

  return (
    <div className="hub-carousel" onKeyDown={skeleton ? undefined : key}>
      <div className="hub-booths" ref={row} onScroll={skeleton ? undefined : onScroll}>
        {children}
      </div>
      <div className="hub-dots" aria-hidden={skeleton || undefined}>
        {Array.from({ length: count }, (_, i) =>
          skeleton ? (
            <i key={i} className="hub-dot" data-on={i === 0 || undefined} />
          ) : (
            <button
              key={i}
              type="button"
              className="hub-dot"
              data-on={i === at || undefined}
              aria-label={`Máy ${i + 1}/${count}`}
              aria-current={i === at ? 'true' : undefined}
              onClick={() => go(i)}
            />
          ),
        )}
      </div>
    </div>
  )
}
