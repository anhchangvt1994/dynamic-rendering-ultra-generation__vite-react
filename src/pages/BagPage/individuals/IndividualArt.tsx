import { useEffect, useId, useState } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import type { Traits } from './client'
import { markSpots, tintFilter } from './display.mjs'

const COLORS: Record<string, string> = {
  freckle: '#7a4a2a',
  stripe: '#2b2118',
  patch: '#f4e3c1',
  scar: '#f2c7c0',
  star: '#ffd447',
}

const star = (r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const d = i % 2 ? r * 0.45 : r
    return `${(Math.cos(a) * d).toFixed(2)},${(Math.sin(a) * d).toFixed(2)}`
  }).join(' ')

type Spot = ReturnType<typeof markSpots>[number]
const Shape = ({ s }: { s: Spot }) => {
  const fill = COLORS[s.kind] ?? '#7a4a2a'
  const place = `translate(${s.cx} ${s.cy}) rotate(${s.rot})`
  if (s.kind === 'stripe')
    return (
      <rect
        transform={place}
        x={-s.r * 1.2}
        y={-s.r * 0.3}
        width={s.r * 2.4}
        height={s.r * 0.6}
        rx={s.r * 0.3}
        fill={fill}
      />
    )
  if (s.kind === 'scar')
    return (
      <rect
        transform={place}
        x={-s.r}
        y={-s.r * 0.12}
        width={s.r * 2}
        height={s.r * 0.24}
        rx={s.r * 0.12}
        fill={fill}
      />
    )
  if (s.kind === 'patch')
    return (
      <ellipse
        transform={place}
        rx={s.r * 1.2}
        ry={s.r * 0.8}
        fill={fill}
        opacity="0.9"
      />
    )
  if (s.kind === 'star')
    return <polygon transform={place} points={star(s.r)} fill={fill} />
  return <circle cx={s.cx} cy={s.cy} r={s.r * 0.5} fill={fill} />
}

type Props = {
  speciesId: number
  name: string
  appearance: Traits['appearance']
  size?: number
}

/**
 * One individual: the species artwork with its tint, and its mark drawn as
 * spots inside a mask made from the same artwork, so none lands outside the
 * body. A failed picture shows the species' first letter and no mark; the
 * parent always names the mark in text. Decorative: the parent has the text.
 */
export default function IndividualArt({
  speciesId,
  name,
  appearance,
  size = 140,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const href = getPokemonImage(speciesId)
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [href])
  const spots = markSpots(appearance.mark)
  return (
    <span
      className="ind-art"
      data-failed={failed || undefined}
      data-mark={appearance.mark?.kind}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {failed ? (
        <span className="ind-letter">{name.charAt(0).toUpperCase()}</span>
      ) : (
        <>
          <img
            src={href}
            alt=""
            width={size}
            height={size}
            style={{ filter: tintFilter(appearance) }}
            onError={() => setFailed(true)}
          />
          {spots.length > 0 && (
            <svg viewBox="0 0 100 100" focusable="false">
              <defs>
                <mask id={`${uid}-m`} style={{ maskType: 'alpha' }}>
                  <image
                    href={href}
                    width="100"
                    height="100"
                    preserveAspectRatio="xMidYMid meet"
                  />
                </mask>
              </defs>
              <g mask={`url(#${uid}-m)`}>
                {spots.map((s, i) => (
                  <Shape key={i} s={s} />
                ))}
              </g>
            </svg>
          )}
        </>
      )}
    </span>
  )
}
