import { TIME_CHARGES } from './engine/rules.mjs'

/**
 * Dialga's watch: its chest diamond for a face, one lit tick on the rim per
 * charge. The Roar of Time stops a round's clock for 15 s (key T); with no
 * charge left the watch counts down to its refill.
 */
export default function Watch({
  left,
  size = 28,
}: {
  left: number
  size?: number
}) {
  return (
    <svg
      className="watch"
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dialga-gem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9fbff" />
          <stop offset="0.45" stopColor="#7fd3ff" />
          <stop offset="1" stopColor="#2a64c9" />
        </linearGradient>
      </defs>
      <circle
        cx="20"
        cy="22"
        r="16"
        fill="#18304f"
        stroke="#c9d6e6"
        strokeWidth="2.5"
      />
      <rect x="17" y="1.5" width="6" height="4" rx="1.5" fill="#c9d6e6" />
      {Array.from({ length: TIME_CHARGES }, (_, i) => {
        const a = ((-90 + i * (360 / TIME_CHARGES)) * Math.PI) / 180
        return (
          <line
            key={i}
            className="tick"
            data-lit={i < left || undefined}
            x1={20 + Math.cos(a) * 11.5}
            y1={22 + Math.sin(a) * 11.5}
            x2={20 + Math.cos(a) * 14.5}
            y2={22 + Math.sin(a) * 14.5}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        )
      })}
      <path
        className="gem"
        d="M20 13.5l5.5 8.5-5.5 8.5-5.5-8.5z"
        fill="url(#dialga-gem)"
      />
      <line
        className="hand"
        x1="20"
        y1="22"
        x2="20"
        y2="15"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
