import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { confettiPieces } from './confetti.mjs'

const reduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** A one-off confetti fall over its parent; removes itself after the longest piece. */
export default function Confetti({ seed, count = 36 }: { seed: number; count?: number }) {
  const [done, setDone] = useState(false)
  const pieces = useMemo(() => confettiPieces(seed, count), [seed, count])
  useEffect(() => {
    const life = pieces.reduce((m, p) => Math.max(m, p.delay + p.dur), 0)
    const t = window.setTimeout(() => setDone(true), life + 50)
    return () => window.clearTimeout(t)
  }, [pieces])
  if (done || reduced() || pieces.length === 0) return null
  return (
    <span className="mg-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={
            {
              left: `${p.x}%`,
              width: p.size,
              height: p.size * 0.5,
              background: `hsl(${p.hue} 90% 62%)`,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.dur}ms`,
              '--rot': `${p.rot}deg`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  )
}
