import { memo, useId } from 'react'
import type { CSSProperties } from 'react'
import styled from 'styled-components'
import { statLabel } from 'components/pokemon-page/format.mjs'
import { getPokemonPower } from './power.mjs'

// The in-game summary layout: HP on top, then clockwise.
const AXES = [
  'hp',
  'attack',
  'defense',
  'speed',
  'special-defense',
  'special-attack',
]
const CX = 160
const CY = 128
const R = 84
// Values past this sit on the rim; the label still shows the real number.
const CAP = 200

const point = (index: number, ratio: number) => {
  const a = (index * Math.PI) / 3
  return [CX + R * ratio * Math.sin(a), CY - R * ratio * Math.cos(a)]
}
const ring = (ratio: number) =>
  AXES.map((_, i) => point(i, ratio).join(',')).join(' ')

const RadarStyle = styled.section`
  margin-bottom: 16px;
  padding: 8px 8px 4px;
  color: #fff;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}

  svg {
    display: block;
    width: 100%;
    max-width: 360px;
    height: auto;
    margin: 0 auto;
    overflow: visible;
  }
  .radar-shape {
    transform-box: view-box;
    transform-origin: ${CX}px ${CY}px;
    animation: radar-grow 700ms cubic-bezier(0.16, 1, 0.3, 1) 250ms both;
  }
  .radar-beam {
    transform-box: view-box;
    transform-origin: ${CX}px ${CY}px;
    animation: radar-sweep 1.1s ease-in-out both;
  }
  .radar-label {
    font-size: 11px;
    fill: rgba(235, 247, 241, 0.72);
  }
  .radar-value {
    font-size: 16px;
    font-weight: 700;
    fill: #fff;
    font-variant-numeric: tabular-nums;
  }
  .radar-value[data-top='true'] {
    fill: var(--tier-a);
  }

  @keyframes radar-grow {
    from {
      transform: scale(0.85);
      opacity: 0;
    }
    to {
      transform: none;
      opacity: 1;
    }
  }
  @keyframes radar-sweep {
    from {
      transform: rotate(0);
      opacity: 1;
    }
    to {
      transform: rotate(360deg);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .radar-shape,
    .radar-beam {
      animation: none;
    }
    .radar-beam {
      display: none;
    }
  }
`

const PokemonStatRadar = memo(({ stats }: { stats: any[] }) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  if (!stats.length) return null
  const { color, level } = getPokemonPower(stats)
  const ex = level === 9
  const values = AXES.map(
    (name) => Number(stats.find((s) => s?.stat?.name === name)?.base_stat) || 0
  )
  const top = Math.max(...values)
  // highlight the strongest stat only when it stands alone
  const soleTop = values.filter((v) => v === top).length === 1
  const shape = values
    .map((v, i) => point(i, Math.min(v, CAP) / CAP).join(','))
    .join(' ')
  const summary = AXES.map((name, i) => `${statLabel(name)} ${values[i]}`)

  return (
    <RadarStyle
      style={{ '--tier-a': color.a, '--tier-b': color.b } as CSSProperties}
    >
      <svg
        viewBox="0 0 320 256"
        role="img"
        aria-label={`Chỉ số cơ bản: ${summary.join(', ')}`}
      >
        <defs>
          <radialGradient id={`${uid}-fill`}>
            <stop offset="0" stopColor={color.a} stopOpacity="0.25" />
            <stop offset="1" stopColor={color.a} stopOpacity="0.6" />
          </radialGradient>
          <linearGradient id={`${uid}-beam`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor={color.a} stopOpacity="0" />
            <stop offset="1" stopColor={color.a} stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={`${uid}-holo`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff5f6d" />
            <stop offset="0.35" stopColor="#ffd86f" />
            <stop offset="0.65" stopColor="#6bf2ff" />
            <stop offset="1" stopColor="#c77dff" />
          </linearGradient>
          <clipPath id={`${uid}-hex`}>
            <polygon points={ring(1)} />
          </clipPath>
        </defs>

        <g fill="none" stroke="rgba(235, 247, 241, 0.16)">
          {[0.25, 0.5, 0.75].map((r) => (
            <polygon key={r} points={ring(r)} />
          ))}
          <polygon points={ring(1)} stroke="rgba(235, 247, 241, 0.32)" />
          {AXES.map((_, i) => {
            const [x, y] = point(i, 1)
            return <line key={i} x1={CX} y1={CY} x2={x} y2={y} />
          })}
        </g>

        {/* Pokédex scan: one beam sweep as the shape grows */}
        <g clipPath={`url(#${uid}-hex)`}>
          <path
            key={values.join()}
            className="radar-beam"
            d={`M${CX} ${CY}L${CX} ${CY - R}A${R} ${R} 0 0 1 ${point(1, 1).join(' ')}Z`}
            fill={`url(#${uid}-beam)`}
          />
        </g>

        <g key={values.join()} className="radar-shape">
          <polygon
            points={shape}
            fill={ex ? `url(#${uid}-holo)` : `url(#${uid}-fill)`}
            fillOpacity={ex ? 0.35 : 1}
            stroke={ex ? `url(#${uid}-holo)` : color.a}
            strokeWidth={ex ? 2.5 : 2}
            strokeLinejoin="round"
          />
          {values.map((v, i) => {
            const [x, y] = point(i, Math.min(v, CAP) / CAP)
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3.2"
                fill="#fff"
                stroke={color.a}
                strokeWidth="1.5"
              />
            )
          })}
        </g>

        {AXES.map((name, i) => {
          const [x, y] = point(i, 1.24)
          const anchor =
            Math.abs(x - CX) < 4 ? 'middle' : x > CX ? 'start' : 'end'
          const dy = i === 0 ? -12 : i === 3 ? 4 : -6
          return (
            <text key={name} x={x} y={y + dy} textAnchor={anchor}>
              <tspan className="radar-label" x={x}>
                {statLabel(name)}
              </tspan>
              <tspan
                className="radar-value"
                x={x}
                dy="17"
                data-top={soleTop && values[i] === top}
              >
                {values[i]}
              </tspan>
            </text>
          )
        })}
      </svg>
    </RadarStyle>
  )
})

PokemonStatRadar.displayName = 'PokemonStatRadar'
export default PokemonStatRadar
