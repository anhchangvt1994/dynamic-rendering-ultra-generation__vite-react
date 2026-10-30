import type { RefObject } from 'react'

// how far a finger travels before a touch counts as a drag, not a tap
const DRAG_THRESHOLD_PX = 10

/**
 * Dragging inside `container` (a search sheet) hides the on-screen
 * keyboard, as native lists do: the input loses focus, the results get the
 * room back. Only a finger drag counts: a tap still picks a result, and
 * scrolling done by the app (arrow keys moving through results) keeps the
 * keyboard. Touches on the input itself are left alone.
 */
export default function useDismissKeyboardOnDrag(
  container: RefObject<HTMLElement | null>,
  input: RefObject<HTMLInputElement | null>,
  active = true
) {
  useEffect(() => {
    const element = container.current
    if (!active || !element) return

    let startY = 0
    let dismissed = false
    const onTouchStart = (event: TouchEvent) => {
      startY = event.touches[0]?.clientY ?? 0
      dismissed = event.target === input.current
    }
    const onTouchMove = (event: TouchEvent) => {
      if (dismissed) return
      const y = event.touches[0]?.clientY ?? startY
      if (Math.abs(y - startY) < DRAG_THRESHOLD_PX) return
      dismissed = true
      if (document.activeElement === input.current) input.current?.blur()
    }

    element.addEventListener('touchstart', onTouchStart, { passive: true })
    element.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
    }
  }, [container, input, active])
}
