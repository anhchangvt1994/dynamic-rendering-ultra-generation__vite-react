import { Pokeball } from 'components/common/FieldIcon'
import type { CSSProperties } from 'react'

// A burst of stars leaving the ball: angle (0° = right, 90° = down),
// distance, size, delay. None flies right: the hero's edge is 2px away.
const SPARKS = [
  { glyph: '✦', a: -95, d: 30, s: 1.15, t: 0, c: '#ffda55' },
  { glyph: '✧', a: -140, d: 27, s: 0.85, t: 60, c: '#fff' },
  { glyph: '★', a: 180, d: 31, s: 0.75, t: 30, c: '#ff9ad8' },
  { glyph: '✦', a: 145, d: 26, s: 0.9, t: 90, c: '#ffda55' },
  { glyph: '✧', a: 100, d: 24, s: 0.7, t: 120, c: '#fff' },
  { glyph: '✦', a: -60, d: 22, s: 0.6, t: 150, c: '#ff9ad8' },
]

/**
 * The reroll badge's art: a refresh arrow circling a Poké Ball, and the
 * star burst. `roll` keys the animated parts so every tap replays them;
 * 0 means at rest (the skeleton shows it that way).
 */
export default function RerollArt({ roll = 0 }: { roll?: number }) {
  const rolling = roll ? 'is-rolling' : ''
  return (
    <>
      <svg
        key={`arrow-${roll}`}
        className={`reroll-arrow ${rolling}`}
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        {/* a 320° arc, clockwise, its head pointing back into the gap */}
        <path className="reroll-arc" d="M30.8 5.2A20 20 0 1 1 17.2 5.2" />
        <path className="reroll-head" d="M24.4 2.6 18.7 9.9 15.3 0.5Z" />
      </svg>
      <span className="reroll-ball">
        <Pokeball key={`ball-${roll}`} className={rolling} />
      </span>
      {roll > 0 && (
        <span
          key={`sparks-${roll}`}
          className="reroll-sparks"
          aria-hidden="true"
        >
          {SPARKS.map((spark, index) => (
            <i
              key={index}
              style={
                {
                  '--a': `${spark.a}deg`,
                  '--d': `${spark.d}px`,
                  '--s': spark.s,
                  '--t': `${spark.t}ms`,
                  color: spark.c,
                } as CSSProperties
              }
            >
              {spark.glyph}
            </i>
          ))}
        </span>
      )}
    </>
  )
}
