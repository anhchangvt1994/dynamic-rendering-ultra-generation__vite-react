import { useEffect, useRef, useState } from 'react'
import { itemById, itemSprite } from 'pages/QuizPage/items.mjs'

const AUTO_MS = 1200
const reduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** A closed chest: tap "Mở quà" (or wait 1.2s) and the gifts appear. */
export default function GiftChest({
  items,
  onOpened,
}: {
  items: string[]
  onOpened?: () => void
}) {
  const [open, setOpen] = useState(reduced)
  const done = useRef(false)
  const cb = useRef(onOpened)
  cb.current = onOpened
  const reveal = () => setOpen(true)
  useEffect(() => {
    if (open) return
    const timer = window.setTimeout(reveal, AUTO_MS)
    return () => window.clearTimeout(timer)
  }, [open])
  useEffect(() => {
    if (open && !done.current) {
      done.current = true
      cb.current?.()
    }
  }, [open])
  if (items.length === 0) return null
  return (
    <div className="mg-chest" data-open={open || undefined}>
      {!open ? (
        <button type="button" className="mg-cta" onClick={reveal}>
          <span className="mg-chest-box" aria-hidden="true">🎁</span> Mở quà
        </button>
      ) : (
        <ul className="mg-chips" aria-label="Quà nhận được">
          {items.map((id, i) => (
            <li key={`${id}-${i}`} className="mg-chip mg-fly" style={{ animationDelay: `${i * 90}ms` }}>
              <img src={itemSprite(id)} alt="" />
              {itemById(id)?.name ?? id}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
