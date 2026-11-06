import type { CSSProperties } from 'react'

export const RINGS = [
  { key: 'hunger', label: 'No', emoji: '🍖' },
  { key: 'clean', label: 'Sạch', emoji: '🫧' },
  { key: 'fun', label: 'Vui', emoji: '🎈' },
] as const

export const LOW_NEED = 40

/** The three needs as meters, each read out as "No 72%"; the one a care
 * just filled flashes (bump, a new n each time). */
export default function NeedRings({
  needs,
  bump,
}: {
  needs: Record<'hunger' | 'clean' | 'fun', number>
  bump?: { need: 'hunger' | 'clean' | 'fun'; n: number }
}) {
  return (
    <ul className="rm-rings">
      {RINGS.map(({ key, label, emoji }) => {
        const value = Math.round(needs[key])
        return (
          <li
            key={key}
            className="rm-ring"
            role="img"
            aria-label={`${label} ${value}%`}
            data-need={key}
            data-low={value < LOW_NEED || undefined}
            style={{ '--p': `${value}%` } as CSSProperties}
          >
            <span className="rm-ring-icon" aria-hidden="true">
              {emoji}
            </span>
            <span className="rm-ring-text" aria-hidden="true">
              <small>{label}</small>
              <b>{value}</b>
            </span>
            <span className="rm-meter" aria-hidden="true">
              <i />
            </span>
            {bump?.need === key && (
              <span className="rm-ring-flash" key={bump.n} aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ul>
  )
}
