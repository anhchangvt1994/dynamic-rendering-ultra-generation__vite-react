import type { CSSProperties } from 'react'
import { STATS } from 'pages/KitchenPage/kitchen.mjs'
import { STAT_KEYS } from '../care/care.mjs'

const R = 62
const point = (i: number, r: number) => {
  const a = (Math.PI * 2 * i) / STAT_KEYS.length - Math.PI / 2
  return [Math.cos(a) * r, Math.sin(a) * r]
}
const ring = (r: number) =>
  STAT_KEYS.map((_, i) =>
    point(i, r)
      .map((n) => n.toFixed(1))
      .join(',')
  ).join(' ')

/** The six growth stats on six axes, each against its cap; pending holds
 * the same box while they load, the values not shown. */
export default function StatRadar({
  stats,
  cap,
  pending = false,
}: {
  stats: Record<string, number>
  cap: number
  pending?: boolean
}) {
  const shape = STAT_KEYS.map((key, i) =>
    point(i, (R * Math.min(cap, stats[key] ?? 0)) / cap)
      .map((n) => n.toFixed(1))
      .join(',')
  ).join(' ')
  return (
    <figure
      className="rm-radar"
      data-pending={pending || undefined}
      aria-busy={pending || undefined}
    >
      <svg viewBox="-124 -92 248 184" aria-hidden="true" focusable="false">
        <g className="rm-radar-grid">
          <polygon points={ring(R)} />
          <polygon points={ring(R / 2)} />
          {STAT_KEYS.map((key, i) => {
            const [x, y] = point(i, R)
            return <line key={key} x1="0" y1="0" x2={x} y2={y} />
          })}
        </g>
        <polygon className="rm-radar-shape" points={shape} />
        {STAT_KEYS.map((key, i) => {
          const [x, y] = point(i, R + 14)
          const value = stats[key] ?? 0
          return (
            <text
              key={key}
              x={x}
              y={y}
              textAnchor={Math.abs(x) < 4 ? 'middle' : x > 0 ? 'start' : 'end'}
              dominantBaseline="middle"
            >
              {STATS[key as keyof typeof STATS].label}
              {!pending && (
                <tspan className="rm-radar-n" x={x} dy="12">
                  {value}
                </tspan>
              )}
            </text>
          )
        })}
      </svg>
      {!pending && STAT_KEYS.every((key) => !stats[key]) && (
        <p className="rm-radar-hint">Chăm sóc để lớn lên</p>
      )}
      <figcaption className="rm-sr">
        <ul className="rm-stat-list">
          {STAT_KEYS.map((key) => {
            const stat = STATS[key as keyof typeof STATS]
            const value = stats[key] ?? 0
            return (
              <li
                key={key}
                style={
                  {
                    '--c': stat.color,
                    '--v': `${Math.min(100, (value / cap) * 100)}%`,
                  } as CSSProperties
                }
              >
                <span>{stat.label}</span>
                <b>
                  {value}
                  <small>/{cap}</small>
                </b>
                <i aria-hidden="true" />
              </li>
            )
          })}
        </ul>
      </figcaption>
    </figure>
  )
}
