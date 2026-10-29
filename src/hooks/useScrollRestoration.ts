import { useEffect, useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useLocation, useNavigationType } from 'react-router'

// The app scrolls inside a container, not the window, so neither the browser
// nor the router restores its position. This does it per history entry:
//  - a new page (link, search result) starts at the top;
//  - Back/Forward returns to where the reader left that entry;
//  - URL-only updates inside a page (state.keepPage, the Pokémon carousel)
//    keep the current position.
const positions = new Map<string, number>()

export default function useScrollRestoration(
  scrollerRef: RefObject<HTMLElement | null>
) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const keyRef = useRef(location.key)

  // remember the position of the entry being shown
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        positions.set(keyRef.current, scroller.scrollTop)
      })
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      scroller.removeEventListener('scroll', onScroll)
    }
  }, [scrollerRef])

  useLayoutEffect(() => {
    keyRef.current = location.key
    const scroller = scrollerRef.current
    if (!scroller || location.state?.keepPage) return

    const target = navigationType === 'POP' ? positions.get(location.key) : 0
    if (!target) {
      scroller.scrollTop = 0
      return
    }
    // The previous page re-renders (and may load more rows) after mount:
    // keep trying until it is tall enough, for at most ~1.5s.
    const started = performance.now()
    let frame = 0
    const restore = () => {
      scroller.scrollTop = target
      const reached = Math.abs(scroller.scrollTop - target) < 2
      if (!reached && performance.now() - started < 1500) {
        frame = requestAnimationFrame(restore)
      }
    }
    // the reader takes over: stop fighting them
    const stop = () => cancelAnimationFrame(frame)
    const events = ['wheel', 'touchstart', 'keydown'] as const
    events.forEach((name) =>
      scroller.addEventListener(name, stop, { passive: true, once: true })
    )
    restore()
    return () => {
      stop()
      events.forEach((name) => scroller.removeEventListener(name, stop))
    }
  }, [location.key, location.state, navigationType, scrollerRef])
}
