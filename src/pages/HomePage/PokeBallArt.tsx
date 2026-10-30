import { useId } from 'react'

/**
 * A drawn Poké Ball: three-tone cap, gloss and a glint, shaded base, a
 * slim band and a layered centre button. `part` draws only the cap half
 * or the base half (the thrown ball opens along the band).
 */
export default function PokeBallArt({
  className = '',
  part = 'whole',
}: {
  className?: string
  part?: 'whole' | 'cap' | 'base'
}) {
  const id = useId().replace(/:/g, '')
  const cap = part !== 'base'
  const base = part !== 'cap'
  return (
    <svg className={className} viewBox="-32 -32 64 64" aria-hidden="true">
      <defs>
        <linearGradient
          id={`${id}cap`}
          x1="0"
          y1="-28"
          x2="0"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ff8f7a" />
          <stop offset="0.55" stopColor="#f0412a" />
          <stop offset="1" stopColor="#c4260e" />
        </linearGradient>
        <linearGradient
          id={`${id}base`}
          x1="0"
          y1="0"
          x2="0"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d8e0ea" />
        </linearGradient>
        <radialGradient
          id={`${id}knob`}
          cx="-2"
          cy="-2"
          r="8"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe6ee" />
        </radialGradient>
        <clipPath id={`${id}ball`}>
          <circle r="28" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}ball)`}>
        {cap && (
          <>
            <rect
              x="-30"
              y="-30"
              width="60"
              height="30"
              fill={`url(#${id}cap)`}
            />
            {/* gloss and glint */}
            <ellipse
              cx="-9"
              cy="-16"
              rx="10"
              ry="5"
              transform="rotate(-28 -9 -16)"
              fill="#fff"
              opacity="0.7"
            />
            <circle cx="-18.5" cy="-7.5" r="2" fill="#fff" opacity="0.85" />
            <rect x="-30" y="-3.4" width="60" height="3.4" fill="#1d1f24" />
          </>
        )}
        {base && (
          <>
            <rect
              x="-30"
              y="0"
              width="60"
              height="30"
              fill={`url(#${id}base)`}
            />
            <ellipse
              cx="0"
              cy="22"
              rx="24"
              ry="8"
              fill="#172d45"
              opacity="0.08"
            />
            <rect x="-30" y="0" width="60" height="3.4" fill="#1d1f24" />
          </>
        )}
      </g>
      <path
        d={
          part === 'cap'
            ? 'M-28 0A28 28 0 0 1 28 0'
            : part === 'base'
              ? 'M28 0A28 28 0 0 1 -28 0'
              : 'M-28 0A28 28 0 1 1 28 0A28 28 0 1 1 -28 0'
        }
        fill="none"
        stroke="#1d1f24"
        strokeWidth="3"
      />
      {base && (
        <>
          <circle r="9.6" fill="#1d1f24" />
          <circle r="6.6" fill={`url(#${id}knob)`} />
          <circle r="3.4" fill="none" stroke="#c3ccd7" strokeWidth="1.3" />
        </>
      )}
    </svg>
  )
}
