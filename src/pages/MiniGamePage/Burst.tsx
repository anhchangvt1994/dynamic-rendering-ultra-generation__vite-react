import { type CSSProperties, useEffect, useMemo, useState } from 'react'

const LIFE_MS = 700
const reduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * A short burst of CSS particles around `at` (px inside the stage). A new
 * `seq` plays it again; it removes itself after 700ms. Nothing under
 * reduced motion.
 */
export default function Burst({
  at,
  count,
  seq,
}: {
  at: { x: number; y: number }
  count: 10 | 16
  seq: number
}) {
  const [live, setLive] = useState(seq > 0)
  useEffect(() => {
    if (seq <= 0) return
    setLive(true)
    const timer = window.setTimeout(() => setLive(false), LIFE_MS)
    return () => window.clearTimeout(timer)
  }, [seq])
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (seq % 7) * 0.3
        const far = 34 + ((i * 17) % 22)
        return { dx: Math.round(Math.cos(angle) * far), dy: Math.round(Math.sin(angle) * far) }
      }),
    [count, seq]
  )
  if (!live || seq <= 0 || reduced()) return null
  return (
    <span className="mg-burst" style={{ left: at.x, top: at.y }} aria-hidden="true" key={seq}>
      {parts.map((p, i) => (
        <i key={i} style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px` } as CSSProperties} />
      ))}
    </span>
  )
}
