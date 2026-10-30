import type { CSSProperties } from 'react'

// Stars leaving the opened ball: angle (0° = right, 90° = down), distance,
// size, delay after the flash, colour.
const STARS = [
  { glyph: '✦', a: -90, d: 78, s: 1.4, t: 0, c: '#ffda55' },
  { glyph: '✧', a: -30, d: 70, s: 1, t: 40, c: '#fff' },
  { glyph: '★', a: 20, d: 84, s: 0.95, t: 20, c: '#ff9ad8' },
  { glyph: '✦', a: 75, d: 66, s: 1.1, t: 70, c: '#ffda55' },
  { glyph: '✧', a: 130, d: 80, s: 0.9, t: 30, c: '#fff' },
  { glyph: '★', a: 180, d: 76, s: 1.05, t: 60, c: '#8fd8ff' },
  { glyph: '✦', a: -140, d: 72, s: 0.85, t: 90, c: '#ff9ad8' },
  { glyph: '✧', a: -60, d: 50, s: 0.7, t: 110, c: '#8fd8ff' },
]

/** ms from the throw to the moment the ball opens (the swap happens here) */
export const THROW_OPEN_MS = 430
/** ms the whole throw lasts */
export const THROW_MS = 950

/**
 * A Poké Ball thrown from the reroll badge (`from`: its offset from the
 * art's centre) in an arc to the middle of the art, where it opens with a
 * flash and a burst of stars as the new Pokémon pops out.
 */
export default function EncounterThrow({
  from,
}: {
  from: { x: number; y: number }
}) {
  return (
    <span
      className="throw"
      aria-hidden="true"
      style={
        {
          '--fx': `${from.x}px`,
          '--fy': `${from.y}px`,
          '--open': `${THROW_OPEN_MS}ms`,
          '--throw': `${THROW_MS}ms`,
        } as CSSProperties
      }
    >
      <span className="throw-flash" />
      <span className="throw-ball">
        <span className="throw-half throw-half--top" />
        <span className="throw-half throw-half--bottom" />
      </span>
      <span className="throw-stars">
        {STARS.map((star, index) => (
          <i
            key={index}
            style={
              {
                '--a': `${star.a}deg`,
                '--d': `${star.d}px`,
                '--s': star.s,
                '--t': `${star.t}ms`,
                color: star.c,
              } as CSSProperties
            }
          >
            {star.glyph}
          </i>
        ))}
      </span>
    </span>
  )
}
