import type { CSSProperties } from 'react'

const DIGITS = [...'0123456789']
// seconds per full 0-9 turn: thousands stay 0 (the Pokédex ends at 1025),
// then each place turns ten times slower than the one to its right
const ROLL = [0, 6, 1.8, 0.9]

/**
 * "#0000": the Pokédex number of a Pokémon not known yet. Rolling, its
 * digits turn like an odometer (still under reduced motion).
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
          <span key={index} className="dex-digit">
            <span style={{ '--roll': `${seconds}s` } as CSSProperties}>
              {DIGITS.map((digit) => (
                <span key={digit}>{digit}</span>
              ))}
            </span>
          </span>
        ) : (
          // a window too, so still and rolling digits share one baseline
          <span key={index} className="dex-digit">
            <span>
              <span>0</span>
            </span>
          </span>
        )
      )}
    </span>
  )
}
