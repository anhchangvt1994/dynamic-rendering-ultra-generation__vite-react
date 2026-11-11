import { type CSSProperties, type ReactNode, useEffect, useRef } from 'react'
import { sheetDragClose } from 'pages/MyPokemonPage/room/dockGesture.mjs'
import { SheetStyle } from './styles'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  tone?: { hue: number; accent: string; deep: string; glow: string }
  children: ReactNode
}

/**
 * The shared bottom sheet of the mini game: Esc, the backdrop, the ✕ and a
 * down-drag from the top of its content all ask to close. The caller decides
 * what closing means (the host asks first in the middle of a round).
 */
export default function GameSheet({ open, onClose, title, tone, children }: Props) {
  const body = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; y: number; top: number } | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null
  const vars = tone
    ? ({
        '--hue': tone.hue,
        '--accent': tone.accent,
        '--deep': tone.deep,
        '--glow': tone.glow,
      } as CSSProperties)
    : undefined
  return (
    <SheetStyle style={vars}>
      <div className="mg-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="mg-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Mini game'}
        onTouchStart={(event) => {
          const touch = event.touches[0]
          start.current = {
            x: touch.clientX,
            y: touch.clientY,
            top: body.current?.scrollTop ?? 0,
          }
        }}
        onTouchEnd={(event) => {
          const from = start.current
          start.current = null
          if (!from) return
          const touch = event.changedTouches[0]
          if (sheetDragClose(from.top, touch.clientX - from.x, touch.clientY - from.y))
            onClose()
        }}
      >
        <span className="mg-grab" aria-hidden="true" />
        <span className="mg-bulbs" aria-hidden="true" />
        <div className="mg-head">
          <h2>{title ?? 'Mini game'}</h2>
          <button type="button" className="mg-x" aria-label="Đóng" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mg-body" ref={body}>
          {children}
        </div>
      </div>
    </SheetStyle>
  )
}
