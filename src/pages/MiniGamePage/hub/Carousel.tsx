import { Children, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { activeIndex, offsets } from './carouselMath.mjs'

/**
 * The cabinets: a plain grid from md up, a scroll-snap row below it (next one peeks) with dots.
 * No layout measurement: the scroll position is written to CSS variables (--p on the carousel,
 * --o / --a on each cabinet) so the stage can lean, fade and spin with the finger. No re-render per frame.
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
    // Derive scroll position from the first slide's centered snap point. This
    // stays symmetric even when the last slide has extra trailing scroll space.
    const center = el.scrollLeft + el.clientWidth / 2
    const centers = Array.from(el.children, child => {
      const item = child as HTMLElement
      return item.offsetLeft + item.offsetWidth / 2
    })
    const right = centers.findIndex(value => value >= center)
    const lower = Math.max(0, right - 1)
    const upper = Math.min(count - 1, right < 0 ? count - 1 : right)
    const span = centers[upper] - centers[lower]
    const progress = span > 0 ? (center - centers[lower]) / span : 0
    const virtual = right < 0 ? count - 1 : lower + Math.min(1, Math.max(0, progress))
    const active = activeIndex(virtual, 1, count)
    setAt(active)
    const o = offsets(virtual, 1, count)
    el.parentElement?.style.setProperty('--p', String(Math.round(-o[0] * 1000) / 1000 || 0))
    o.forEach((v, i) => {
      const item = el.children[i] as HTMLElement | undefined
      if (!item) return
      item.style.setProperty('--o', String(v))
      item.style.setProperty('--a', String(i === active ? 0 : 1))
    })
  }, [count])
  const onScroll = () => {
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(read)
  }
  useEffect(() => {
    if (!skeleton) read()
    return () => cancelAnimationFrame(raf.current)
  }, [read, skeleton])

  const go = (i: number) => {
    const el = row.current
    const item = el?.children[Math.max(0, Math.min(count - 1, i))] as HTMLElement | undefined
    if (!el || !item) return
    const instant = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: item.offsetLeft + item.offsetWidth / 2 - el.clientWidth / 2, behavior: instant ? 'auto' : 'smooth' })
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
