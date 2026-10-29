import { useEffect, useRef } from 'react'

// The element focused before the current one. A dialog's autoFocus input
// takes focus before effects run, so "what was focused at open" would be
// the input itself; this keeps the real opener.
let previousFocus: HTMLElement | null = null
let currentFocus: HTMLElement | null = null
if (typeof document !== 'undefined') {
  document.addEventListener(
    'focusin',
    (event) => {
      previousFocus = currentFocus
      currentFocus = event.target as HTMLElement
    },
    true
  )
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal behaviour for the menu and search overlays: Escape closes, focus
 * moves into the dialog and Tab stays inside it, and closing hands focus
 * back to whatever opened it (the header button).
 */
export default function useDialog<T extends HTMLElement>(
  isOpen: boolean,
  onClose: () => void
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!isOpen) return
    const dialog = ref.current
    const active = document.activeElement as HTMLElement | null
    const opener = dialog?.contains(active) ? previousFocus : active
    const items = () =>
      dialog
        ? [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
            // tabIndex -1 controls (e.g. combobox options) never take Tab
            (el) => el.tabIndex >= 0 && el.offsetParent !== null
          )
        : []

    // Autofocus inputs handle themselves; otherwise take the first control.
    // An overlay that fades in is not focusable for its first frames, so
    // retry each frame (~300ms max) until focus is inside.
    let frame = 0
    let tries = 0
    const focusInside = () => {
      if (!dialog || dialog.contains(document.activeElement)) return
      items()[0]?.focus()
      if (!dialog.contains(document.activeElement) && ++tries < 20)
        frame = requestAnimationFrame(focusInside)
    }
    frame = requestAnimationFrame(focusInside)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const list = items()
      if (!list.length) return
      const first = list[0]
      const last = list[list.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      if (opener?.isConnected) opener.focus()
    }
  }, [isOpen, onClose])

  return ref
}
