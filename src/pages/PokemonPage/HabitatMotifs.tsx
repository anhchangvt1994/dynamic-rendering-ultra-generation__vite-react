import type { CSSProperties, ReactNode } from 'react'

export type HabitatColors = {
  light: string
  accent: string
  dark: string
  petal: string
  glow: string
}

// Platform geometry (viewBox 0 0 320 200): the top face is this ellipse.
export const CX = 160
export const CY = 160
export const RX = 118
export const RY = 26

export const rim = (deg: number, scale = 1) => {
  const a = (deg * Math.PI) / 180
  return [CX + RX * scale * Math.cos(a), CY + RY * scale * Math.sin(a)]
}

// Per-element animation offsets, consumed by the CSS in PokemonHabitat.
export const timing = (delay: number, duration?: number, drift?: number) =>
  ({
    '--d': `${delay}s`,
    ...(duration !== undefined && { '--t': `${duration}s` }),
    ...(drift !== undefined && { '--x': `${drift}px` }),
  }) as CSSProperties

// Points on the rim, sorted back-to-front so nearer pieces overlap farther
// ones. `near` runs from -1 (back edge) to 1 (front edge) for perspective.
const around = (count: number, offset = 0, scale = 1) =>
  Array.from({ length: count }, (_, i) => {
    const deg = offset + (360 / count) * i
    const [x, y] = rim(deg, scale)
    return { i, deg, x, y, near: Math.sin((deg * Math.PI) / 180) }
  }).sort((a, b) => a.y - b.y)

// Rune painted on the spinning floor rings, one per type (stroke only).
export const GLYPHS: Record<string, string> = {
  normal: 'M5 0A5 5 0 1 1-5 0A5 5 0 1 1 5 0M1.2 0A1.2 1.2 0 1 1-1.2 0A1.2 1.2 0 1 1 1.2 0',
  fire: 'M0 7C-6 4-5-2 0-8C1-3 5-2 4 3C3 6 1 7 0 7Z',
  water: 'M0-8C3-3 6 0 6 3A6 6 0 0 1-6 3C-6 0-3-3 0-8Z',
  electric: 'M2-9L-5 1H0L-2 9L5-1H0Z',
  grass: 'M-6 7C-6-2 0-7 7-8C7 0 2 6-6 7ZM-6 7L3-3',
  ice: 'M0-8V8M-7-4L7 4M-7 4L7-4M-2-6L0-4L2-6M-2 6L0 4L2 6',
  fighting: 'M-7 0L0-8L7 0L0 8ZM-3 0H3M0-3V3',
  poison: 'M5 1A5 5 0 1 1-5 1A5 5 0 1 1 5 1ZM6-6A2 2 0 1 1 2-6A2 2 0 1 1 6-6Z',
  ground: 'M-8 6L-3-3L1 3L4-1L8 6Z',
  flying: 'M-8 4C-4-6 4-6 8 4M-4 2C-2-2 2-2 4 2',
  psychic: 'M-8 0C-4-6 4-6 8 0C4 6-4 6-8 0ZM2 0A2 2 0 1 1-2 0A2 2 0 1 1 2 0Z',
  bug: 'M0-7L6-3.5V3.5L0 7L-6 3.5V-3.5ZM0-7V7',
  rock: 'M-6 5L-7-2L-2-7L5-5L7 2L2 7ZM-2-7L0 0L7 2M0 0L-6 5',
  ghost: 'M-5 7V-1A5 5 0 0 1 5-1V7L2.5 5L0 7L-2.5 5Z',
  dragon: 'M-6-6L0 8L6-6L0-2Z',
  dark: 'M3-7A7 7 0 1 0 3 7A5.5 5.5 0 1 1 3-7Z',
  steel: 'M-7 0L-3.5-6H3.5L7 0L3.5 6H-3.5ZM2.5 0A2.5 2.5 0 1 1-2.5 0A2.5 2.5 0 1 1 2.5 0',
  fairy: 'M0-8L2-2L8 0L2 2L0 8L-2 2L-8 0L-2-2Z',
}

// Two counter-rotating rings painted on the floor (flattened into the face).
export function RuneRing({
  type,
  colors,
  radius,
  count,
  reverse = false,
}: {
  type: string
  colors: HabitatColors
  radius: number
  count: number
  reverse?: boolean
}) {
  const glyph = GLYPHS[type] || GLYPHS.normal
  return (
    <g className={reverse ? 'hb-spin-rev' : 'hb-spin'}>
      <circle
        r={radius + 12}
        stroke={colors.glow}
        strokeWidth="6"
        opacity="0.18"
      />
      <circle
        r={radius + 12}
        stroke={colors.glow}
        strokeWidth="1.6"
        pathLength="100"
        strokeDasharray={reverse ? '6 3' : '28 3 1 3'}
      />
      <circle r={radius - 12} stroke={colors.light} opacity="0.4" />
      <g stroke={colors.light} strokeWidth="1.5">
        {Array.from({ length: count }, (_, i) => (
          <path
            key={i}
            d={glyph}
            transform={`rotate(${(360 / count) * i}) translate(0 ${-radius}) scale(1.35)`}
          />
        ))}
      </g>
    </g>
  )
}

type Particle = { motion: string; shape: (c: HabitatColors) => ReactNode }

const orb = (r: number) => (c: HabitatColors) => (
  <>
    <circle r={r * 2.4} fill={c.glow} opacity="0.35" />
    <circle r={r} fill={c.light} />
  </>
)

const PARTICLES: Record<string, Particle> = {
  normal: { motion: 'rise', shape: orb(1.4) },
  fire: { motion: 'rise', shape: orb(1.7) },
  water: {
    motion: 'sway',
    shape: (c) => (
      <>
        <circle r="2.8" fill={c.glow} fillOpacity="0.25" stroke={c.light} strokeWidth="0.8" />
        <circle cx="-0.9" cy="-1" r="0.7" fill={c.light} />
      </>
    ),
  },
  electric: {
    motion: 'spark',
    shape: (c) => (
      <path d="M1-4.5L-2.5 0.5H0L-1 4.5L2.5-0.5H0Z" fill={c.light} stroke={c.glow} strokeWidth="0.6" />
    ),
  },
  grass: {
    motion: 'swirl',
    shape: (c) => <path d="M0-4C3-2 3 2 0 4C-3 2-3-2 0-4Z" fill={c.glow} stroke={c.light} strokeWidth="0.4" />,
  },
  ice: {
    motion: 'fall',
    shape: (c) => (
      <path d={GLYPHS.ice} transform="scale(0.45)" stroke={c.light} strokeWidth="2" fill="none" />
    ),
  },
  fighting: {
    motion: 'burst',
    shape: (c) => <path d="M0-6V6" stroke={c.light} strokeWidth="1.6" />,
  },
  poison: {
    motion: 'sway',
    shape: (c) => (
      <>
        <circle r="2.6" fill={c.glow} fillOpacity="0.75" />
        <circle cx="-0.8" cy="-0.9" r="0.7" fill={c.light} />
      </>
    ),
  },
  ground: {
    motion: 'rise',
    shape: (c) => <path d="M-2-1L0-2.5L2.5-1L2 1.5L-1.5 2Z" fill={c.light} />,
  },
  flying: {
    motion: 'swirl',
    shape: (c) => <path d="M-4 3C-2-3 2-4 4-4C2 0-1 2-4 3Z" fill={c.light} />,
  },
  psychic: { motion: 'sway', shape: orb(2) },
  bug: { motion: 'wander', shape: orb(1.3) },
  rock: {
    motion: 'rise',
    shape: (c) => <path d={GLYPHS.rock} transform="scale(0.4)" fill={c.glow} stroke={c.dark} />,
  },
  ghost: {
    motion: 'sway',
    shape: (c) => (
      <>
        <circle r="5" fill={c.glow} opacity="0.3" />
        <path d="M0-5C3-2 3 2 0 4C-2 3-2 0 0-5Z" fill={c.light} opacity="0.85" />
      </>
    ),
  },
  dragon: {
    motion: 'rise',
    shape: (c) => <path d="M0-3.5L2.5 0L0 3.5L-2.5 0Z" fill={c.glow} stroke={c.light} strokeWidth="0.6" />,
  },
  dark: {
    motion: 'smoke',
    shape: (c) => <circle r="4" fill={c.dark} stroke={c.glow} strokeOpacity="0.5" />,
  },
  steel: {
    motion: 'twinkle',
    shape: (c) => <path d="M0-4L.8-.8L4 0L.8.8L0 4L-.8.8L-4 0L-.8-.8Z" fill={c.light} />,
  },
  fairy: {
    motion: 'twinkle',
    shape: (c) => <path d={GLYPHS.fairy} transform="scale(0.5)" fill={c.light} stroke={c.petal} />,
  },
}

// Deterministic scatter so server and client render identical markup.
const seeded = (i: number, n: number) => {
  const s = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453
  return s - Math.floor(s)
}
const SLOTS = Array.from({ length: 16 }, (_, i) => {
  const [x, y] = rim(seeded(i, 1) * 360, 0.2 + seeded(i, 2) * 0.75)
  const t = 2.8 + seeded(i, 3) * 2.4
  return {
    x,
    y,
    t,
    d: -seeded(i, 4) * t,
    drift: (seeded(i, 5) - 0.5) * 40,
    s: 0.75 + seeded(i, 6) * 0.6,
  }
})

// Dual types share the emitter: even slots belong to one type, odd to the other.
export function TypeParticles({
  types,
  count = SLOTS.length,
}: {
  types: { type: string; colors: HabitatColors }[]
  count?: number
}) {
  return (
    <g>
      {SLOTS.slice(0, count).map((slot, i) => {
        const { type, colors } = types[i % types.length]
        const particle = PARTICLES[type] || PARTICLES.normal
        return (
          <g key={i} transform={`translate(${slot.x} ${slot.y}) scale(${slot.s})`}>
            <g
              className={`hb-p hb-p-${particle.motion}`}
              style={timing(slot.d, slot.t, slot.drift)}
            >
              {particle.shape(colors)}
            </g>
          </g>
        )
      })}
    </g>
  )
}

// The signature effect of a single type, built around the platform.
export function TypeAura({
  type,
  colors: c,
  uid,
}: {
  type: string
  colors: HabitatColors
  uid: string
}) {
  const id = `${uid}-${type}`
  switch (type) {
    case 'fire':
      return (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
              <stop stopColor={c.light} />
              <stop offset="0.4" stopColor={c.glow} />
              <stop offset="1" stopColor={c.glow} stopOpacity="0" />
            </linearGradient>
          </defs>
          {around(12, 8, 1.01).map(({ i, x, y, near }) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${0.8 + 0.15 * near})`}>
              <path
                className="hb-flame"
                style={timing(-i * 0.37)}
                d="M0 0C-7-3-7-13 0-28C1-18 7-15 6-6C6-2 3 0 0 0Z"
                fill={`url(#${id})`}
              />
            </g>
          ))}
        </>
      )
    case 'water':
      return (
        <>
          <g fill="none" stroke={c.light}>
            {[0, 1, 2].map((i) => (
              <ellipse
                key={i}
                className="hb-ripple"
                style={timing(-i * 1.1)}
                cx={CX}
                cy={CY}
                rx={RX * 0.86}
                ry={RY * 0.86}
                strokeWidth="1.4"
              />
            ))}
          </g>
          <ellipse
            className="hb-dash"
            style={timing(0, 7)}
            cx={CX}
            cy={CY}
            rx={RX + 5}
            ry={RY + 4}
            fill="none"
            stroke={c.glow}
            strokeWidth="2.6"
            pathLength="100"
            strokeDasharray="14 6 3 6"
          />
        </>
      )
    case 'electric':
      return (
        <>
          <g fill="none" strokeLinejoin="miter">
            {[
              'M64 156L56 130L72 118L58 92L76 64',
              'M256 158L266 132L248 116L262 88L246 58',
              'M112 178L102 152L118 140L108 122',
              'M208 180L218 154L202 140L214 120',
            ].map((d, i) => (
              <g key={i} className="hb-zap" style={timing(-i * 0.9, 2.4 + i * 0.5)}>
                <path d={d} stroke={c.glow} strokeWidth="7" opacity="0.35" />
                <path d={d} stroke={c.light} strokeWidth="1.8" />
              </g>
            ))}
          </g>
          <ellipse
            className="hb-dash"
            style={timing(0, 1.4)}
            cx={CX}
            cy={CY}
            rx={RX + 2}
            ry={RY + 2}
            fill="none"
            stroke={c.light}
            strokeWidth="1.6"
            pathLength="100"
            strokeDasharray="2 7 5 11"
          />
        </>
      )
    case 'grass':
      return (
        <>
          {around(10, 12, 1.02).map(({ i, x, y, near }) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${0.85 + 0.2 * near})`}>
              <g className="hb-sway" style={timing(-i * 0.6)}>
                <path d="M0 0Q-10-6-9-18Q-1-12 0 0Z" fill={c.glow} />
                <path d="M0 0Q7-9 15-9Q11 0 0 0Z" fill={c.light} opacity="0.85" />
                {i % 3 === 0 && (
                  <g transform="translate(-6 -18)" fill={c.petal}>
                    {[0, 72, 144, 216, 288].map((angle) => (
                      <ellipse key={angle} cy="-3" rx="2.2" ry="3.2" transform={`rotate(${angle})`} />
                    ))}
                    <circle r="1.8" fill={c.light} />
                  </g>
                )}
              </g>
            </g>
          ))}
        </>
      )
    case 'ice':
      return (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
              <stop stopColor={c.glow} stopOpacity="0.5" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          {around(11, 0, 1.01).map(({ i, x, y, near }) => {
            const h = 14 + (i % 3) * 8 - near * 4
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                <path
                  className="hb-glint"
                  style={timing(-i * 0.45)}
                  d={`M-4.5 0L-1.5-${h}L0-${h + 5}L1.5-${h}L4.5 0Z`}
                  fill={`url(#${id})`}
                  stroke={c.light}
                  strokeWidth="0.6"
                />
              </g>
            )
          })}
        </>
      )
    case 'fighting':
      return (
        <>
          {[0, 1].map((i) => (
            <ellipse
              key={i}
              className="hb-shock"
              style={timing(-i * 0.9)}
              cx={CX}
              cy={CY}
              rx={RX}
              ry={RY}
              fill="none"
              stroke={c.glow}
              strokeWidth="3"
            />
          ))}
          <g className="hb-pulse" stroke={c.light} strokeWidth="2">
            {around(12, 15).map(({ i, deg }) => {
              const [x1, y1] = rim(deg, 0.6)
              const [x2, y2] = rim(deg, 0.9)
              return <path key={i} d={`M${x1} ${y1}L${x2} ${y2}`} />
            })}
          </g>
        </>
      )
    case 'poison':
      return (
        <>
          {around(7, 15, 0.6).map(({ i, x, y }) => (
            <circle
              key={i}
              className="hb-boil"
              style={timing(-i * 0.55, 2.2 + (i % 3) * 0.5)}
              cx={x}
              cy={y}
              r={3 + (i % 3) * 1.8}
              fill={c.glow}
              fillOpacity="0.6"
              stroke={c.light}
              strokeWidth="0.8"
            />
          ))}
          {around(5, 40, 1)
            .filter(({ near }) => near > 0.3)
            .map(({ i, x, y }) => (
              <path
                key={i}
                className="hb-drip"
                style={timing(-i * 0.8)}
                d={`M${x - 3} ${y + 2}Q${x - 3} ${y + 10} ${x} ${y + 15}Q${x + 3} ${y + 10} ${x + 3} ${y + 2}Z`}
                fill={c.glow}
              />
            ))}
        </>
      )
    case 'ground':
      return (
        <>
          <g className="hb-pulse" fill="none" strokeLinecap="round">
            <path
              d="M160 160L128 152L104 158L78 150M160 160L190 168L214 161L240 170M160 160L148 176L166 184M160 160L174 146L198 142"
              stroke={c.glow}
              strokeWidth="2.6"
            />
            <path
              d="M160 160L128 152L104 158L78 150M160 160L190 168L214 161L240 170M160 160L148 176L166 184M160 160L174 146L198 142"
              stroke={c.light}
              strokeWidth="0.8"
            />
          </g>
          <ellipse
            className="hb-dash"
            style={timing(0, 12)}
            cx={CX}
            cy={CY + 2}
            rx={RX * 1.12}
            ry={RY * 1.3}
            fill="none"
            stroke={c.light}
            strokeWidth="1.4"
            pathLength="100"
            strokeDasharray="0.5 3"
            opacity="0.7"
          />
        </>
      )
    case 'flying':
    case 'dragon': {
      const dragon = type === 'dragon'
      return (
        <>
          {dragon &&
            around(14, 0, 1.03).map(({ i, x, y, near }) => (
              <path
                key={i}
                d={`M${x - 3.5} ${y}L${x} ${y - (12 + (i % 2) * 9 - near * 4)}L${x + 3.5} ${y}Z`}
                fill={c.dark}
                stroke={c.glow}
              />
            ))}
          {[
            [148, 128, 24],
            [124, 112, 19],
            [98, 96, 15],
          ].map(([cy, rx, ry], i) => (
            <ellipse
              key={cy}
              className="hb-dash"
              style={timing(-i * 0.6, dragon ? 1.8 : 2.6 + i * 0.4)}
              cx={CX}
              cy={cy}
              rx={rx}
              ry={ry}
              fill="none"
              stroke={i % 2 ? c.glow : c.light}
              strokeWidth={2.2 - i * 0.4}
              pathLength="100"
              strokeDasharray={dragon ? '18 32' : '26 74'}
            />
          ))}
        </>
      )
    }
    case 'psychic':
      return (
        <g fill="none">
          {[
            [116, 74, 13],
            [82, 50, 9],
          ].map(([cy, rx, ry], i) => (
            <g key={cy} className="hb-bob" style={timing(-i * 1.2)}>
              <ellipse cx={CX} cy={cy} rx={rx} ry={ry} stroke={c.glow} strokeWidth="6" opacity="0.25" />
              <ellipse
                className="hb-dash"
                style={timing(0, 5 + i * 2)}
                cx={CX}
                cy={cy}
                rx={rx}
                ry={ry}
                stroke={c.light}
                strokeWidth="1.6"
                pathLength="100"
                strokeDasharray="22 4 2 4"
              />
            </g>
          ))}
        </g>
      )
    case 'bug':
      return (
        <g transform={`translate(${CX} ${CY}) scale(1 ${RY / RX})`} fill="none" stroke={c.glow} strokeWidth="1.4">
          {[-3, -2, -1, 0, 1, 2, 3].map((row) => (
            <g key={row} className="hb-glint" style={timing(-Math.abs(row) * 0.35, 2.4)}>
              {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((col) => {
                const x = col * 24 + (row % 2 ? 12 : 0)
                const y = row * 21
                if (Math.hypot(x, y) > 92) return null
                return <path key={col} d={`M${x} ${y - 12}l10 6v12l-10 6l-10-6v-12Z`} />
              })}
            </g>
          ))}
        </g>
      )
    case 'rock':
      return (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor={c.light} />
              <stop offset="1" stopColor={c.dark} />
            </linearGradient>
          </defs>
          {around(6, 25, 1.2).map(({ i, x, y, near }) => (
            <g key={i} transform={`translate(${x} ${y - 14}) scale(${1.1 + 0.35 * near})`}>
              <path
                className="hb-hover"
                style={timing(-i * 0.7)}
                d="M-7 2L-5-6L2-8L8-3L6 5L-2 7Z"
                fill={`url(#${id})`}
                stroke={c.glow}
                strokeWidth="0.8"
              />
            </g>
          ))}
        </>
      )
    case 'ghost':
      return (
        <>
          <g transform={`translate(${CX} ${CY}) scale(1 ${RY / RX})`}>
            <g className="hb-spin-rev" style={timing(0, 9)}>
              <path
                d="M0-80A80 80 0 0 1 80 0M0 80A80 80 0 0 1-80 0M0-50A50 50 0 0 1 50 0M0 50A50 50 0 0 1-50 0"
                fill="none"
                stroke={c.glow}
                strokeWidth="3"
                opacity="0.6"
              />
            </g>
          </g>
          {around(7, 10, 0.98).map(({ i, x, y }) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <g className="hb-wisp" style={timing(-i * 0.65)}>
                <path d="M0 0C-7-4-7-13 0-20C-2-13 5-11 4-4C4-2 2 0 0 0Z" fill={c.glow} opacity="0.75" />
                <path d="M0-2C-3-4-3-8 0-11C0-7 2-6 2-3Z" fill={c.light} />
              </g>
            </g>
          ))}
        </>
      )
    case 'dark':
      return (
        <>
          <defs>
            <radialGradient id={id}>
              <stop stopColor="#05030a" stopOpacity="0.95" />
              <stop offset="0.75" stopColor="#05030a" stopOpacity="0.6" />
              <stop offset="1" stopColor="#05030a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx={CX} cy={CY} rx={RX * 0.9} ry={RY * 0.9} fill={`url(#${id})`} />
          <g className="hb-corona">
            <circle cx={CX} cy="74" r="48" fill="#05030a" opacity="0.35" />
            <circle cx={CX} cy="74" r="48" fill="none" stroke={c.glow} strokeWidth="9" opacity="0.25" />
            <circle cx={CX} cy="74" r="48" fill="none" stroke={c.light} strokeWidth="1.4" opacity="0.8" />
          </g>
          <ellipse
            className="hb-corona"
            cx={CX}
            cy={CY}
            rx={RX}
            ry={RY}
            fill="none"
            stroke={c.glow}
            strokeWidth="7"
            opacity="0.4"
          />
        </>
      )
    case 'steel':
      return (
        <>
          <defs>
            <clipPath id={`${id}-face`}>
              <ellipse cx={CX} cy={CY} rx={RX} ry={RY} />
            </clipPath>
            <linearGradient id={id}>
              <stop stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.75" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g transform={`translate(${CX} ${CY}) scale(1 ${RY / RX})`}>
            <g className="hb-spin" style={timing(0, 30)}>
              <circle
                r="124"
                fill="none"
                stroke={c.light}
                strokeWidth="9"
                pathLength="100"
                strokeDasharray="1.4 1.6"
                opacity="0.85"
              />
            </g>
          </g>
          <g clipPath={`url(#${id}-face)`}>
            <rect
              className="hb-sweep"
              x={CX - 14}
              y={CY - RY}
              width="28"
              height={RY * 2}
              fill={`url(#${id})`}
             
            />
          </g>
        </>
      )
    case 'fairy':
      return (
        <>
          {[
            [134, 112, 20],
            [104, 84, 14],
          ].map(([cy, rx, ry], i) => (
            <ellipse
              key={cy}
              className="hb-dash"
              style={timing(0, 6 + i * 2)}
              cx={CX}
              cy={cy}
              rx={rx}
              ry={ry}
              fill="none"
              stroke={i ? c.light : c.petal}
              strokeWidth="2.6"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray="0.1 3.2"
            />
          ))}
          {around(6, 30, 1.12).map(({ i, x, y }) => (
            <g key={i} transform={`translate(${x} ${y - 6})`}>
              <path
                className="hb-twinkle"
                style={timing(-i * 0.5)}
                d={GLYPHS.fairy}
                fill={i % 2 ? c.petal : c.light}
              />
            </g>
          ))}
        </>
      )
    default:
      return (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
              <stop stopColor={c.glow} stopOpacity="0.8" />
              <stop offset="1" stopColor={c.glow} stopOpacity="0" />
            </linearGradient>
          </defs>
          {around(9, 0, 0.9).map(({ i, x, y, near }) => {
            const h = 46 - near * 14
            return (
              <rect
                key={i}
                className="hb-ray"
                style={timing(-i * 0.4)}
                x={x - 1.6}
                y={y - h}
                width="3.2"
                height={h}
                rx="1.6"
                fill={`url(#${id})`}
              />
            )
          })}
        </>
      )
  }
}

// Named pairs get an extra signature on top of both auras.
export function HabitatFusion({
  fusion,
  colors: c,
  secondary: s,
}: {
  fusion: string | null
  colors: HabitatColors
  secondary: HabitatColors | null
}) {
  if (!fusion || !s) return null
  let shapes
  switch (fusion) {
    case 'storm-water':
    case 'thundercloud':
    case 'magnetic-core': {
      const bolt = fusion === 'storm-water' ? c : s
      shapes = [
        'M70 160L96 150L112 166L140 154L160 168L184 152L206 166L228 152L252 162',
        'M86 170L118 158L150 176L178 160L214 174L236 164',
      ].map((d, i) => (
        <g key={i} className="hb-zap" style={timing(-i * 1.3, 2 + i * 0.7)}>
          <path d={d} stroke={bolt.glow} strokeWidth="6" opacity="0.4" />
          <path d={d} stroke={bolt.light} strokeWidth="1.6" />
        </g>
      ))
      break
    }
    case 'frozen-lagoon':
    case 'blizzard':
      shapes = (
        <ellipse
          className="hb-glint"
          cx={CX}
          cy={CY}
          rx={RX * 0.96}
          ry={RY * 0.96}
          stroke={fusion === 'blizzard' ? c.light : s.light}
          strokeWidth="3"
          pathLength="100"
          strokeDasharray="1 2 4 2"
        />
      )
      break
    case 'firestorm':
    case 'soulfire':
      shapes = [0, 1].map((i) => (
        <ellipse
          key={i}
          className="hb-dash"
          style={timing(-i, 1.6)}
          cx={CX}
          cy={136 - i * 30}
          rx={110 - i * 22}
          ry={20 - i * 4}
          stroke={i ? s.glow : c.glow}
          strokeWidth="4"
          pathLength="100"
          strokeDasharray="34 16"
        />
      ))
      break
    case 'eclipse':
      shapes = (
        <g className="hb-corona">
          <circle cx={CX} cy="74" r="58" stroke={s.glow} strokeWidth="2" strokeDasharray="2 6" />
          <circle cx={CX} cy="74" r="66" stroke={c.glow} strokeWidth="1" opacity="0.6" />
        </g>
      )
      break
    case 'toxic-garden':
    case 'toxic-undergrowth':
      // poison sorts last, so it is always the secondary slot
      shapes = [0, 1, 2].map((i) => (
        <ellipse
          key={i}
          className="hb-mist"
          style={timing(-i * 2)}
          cx={110 + i * 50}
          cy={150 + (i % 2) * 8}
          rx="36"
          ry="10"
          fill={s.glow}
          opacity="0.35"
        />
      ))
      break
    case 'tidal-shore':
    case 'canyon':
      shapes = (
        <g className="hb-pulse">
          <path d="M70 162L104 154L128 166L162 156L190 170L236 160" stroke={c.dark} strokeWidth="5" />
          <path d="M70 162L104 154L128 166L162 156L190 170L236 160" stroke={s.glow} strokeWidth="1.6" />
        </g>
      )
      break
    case 'sky-ruins':
      shapes = around(5, 20, 1.25).map(({ i, x, y }) => (
        <g key={i} transform={`translate(${x} ${y - 30})`}>
          <path
            className="hb-hover"
            style={timing(-i * 0.8)}
            d="M-4-6L4-4L5 4L-3 6Z"
            fill={c.dark}
            stroke={c.glow}
          />
        </g>
      ))
      break
    case 'enchanted-garden':
      shapes = (
        <ellipse
          className="hb-dash"
          style={timing(0, 4)}
          cx={CX}
          cy="118"
          rx="96"
          ry="17"
          stroke={c.petal}
          strokeWidth="4"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="0.1 6"
        />
      )
      break
    default:
      return null
  }
  return (
    <g data-fusion={fusion} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {shapes}
    </g>
  )
}
