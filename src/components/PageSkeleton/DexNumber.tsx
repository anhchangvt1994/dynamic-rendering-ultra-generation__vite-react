import type { CSSProperties } from 'react'

// seconds per full 0-9 turn: thousands stay 0 (the Pokédex ends at 1025),
// then each place turns ten times slower than the one to its right
const ROLL = [0, 6, 1.8, 0.9]

/**
 * "#0000": the Pokédex number of a Pokémon not known yet. Rolling, its
 * digits count like an odometer (still under reduced motion).
 * Every digit is a real glyph in the text (a CSS counter, see boneCss), so
 * the number sets exactly like the real one: same widths and spacing, with
 * or without the display font loaded.
 */
export default function DexNumber({
  className = '',
  rolling = false,
}: {
  className?: string
  rolling?: boolean
}) {
  return (
    <span className={`dex ${className}`} aria-hidden="true">
      #
      {ROLL.map((seconds, index) =>
        rolling && seconds ? (
          <span
            key={index}
            className="dex-digit"
            style={{ '--roll': `${seconds}s` } as CSSProperties}
          />
        ) : (
          '0'
        )
      )}
    </span>
  )
}
