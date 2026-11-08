import {
  memo,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { AmberStyle } from './amberStyles'
import { visiblePieces } from './fracture.mjs'
import { amberGeometry } from './amberGeometry.mjs'

type Props = {
  speciesId: number
  name: string
  count: number
  required: number
  complete?: boolean
  celebrating?: boolean
  /** a freshly finished stone: it lands with a burst */
  arrive?: boolean
  /** the newest owned shard has just fallen into place */
  fresh?: boolean
}
const path = (points: number[][]) =>
  `M${points.map(([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`).join('L')}Z`

const line = (points: number[][]) =>
  `M${points.map(([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`).join('L')}`

const curved = (points: number[][], edges: { c1: number[]; c2: number[] }[]) =>
  `M${points[0].map((v) => v.toFixed(3)).join(' ')}${points
    .map((_, i) => {
      const next = points[(i + 1) % points.length]
      const e = edges[i]
      return `C${e.c1.map((v) => v.toFixed(3)).join(' ')} ${e.c2.map((v) => v.toFixed(3)).join(' ')} ${next.map((v) => v.toFixed(3)).join(' ')}`
    })
    .join('')}Z`

/** Refracted artwork suspended below a faceted, translucent resin surface. */
export default memo(function AmberCard({
  speciesId,
  name,
  count,
  required,
  complete = false,
  celebrating = false,
  arrive = false,
  fresh = false,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [failed, setFailed] = useState(false)
  const layout = useMemo(
    () => amberGeometry(speciesId, required),
    [speciesId, required]
  )
  const open = visiblePieces(count, required)
  const joined = complete || celebrating
  // partial: dim and waiting · ready: every piece is here and yearns to join ·
  // whole: one finished stone
  const state = joined ? 'whole' : count >= required ? 'ready' : 'partial'
  // every piece present = one seamless stone (ready only adds a glow)
  const assembled = joined || count >= required
  const bursting = celebrating || arrive
  const href = getPokemonImage(speciesId)
  const fill = (name: string) => `url(#${uid}-${name})`
  useEffect(() => {
    setFailed(false)
    const probe = new Image()
    probe.onerror = () => setFailed(true)
    probe.src = href
    return () => {
      probe.onerror = null
    }
  }, [href])

  const body = (d: string, clip: string, p: any, whole: boolean) => {
    const thick = whole ? 0.5 : p.thickness
    const lens = whole
      ? undefined
      : `translate(${p.lens.x} ${p.lens.y}) translate(50 50) scale(${p.lens.scale}) translate(-50 -50)`
    return (
      <>
        {!whole && (
          <>
            <path
              className="amber-depth"
              d={d}
              transform="translate(0.8 3.2)"
            />
            <path
              className="amber-depth"
              d={d}
              transform="translate(0.4 1.6)"
              style={{ opacity: 0.6, fill: '#c46a10' }}
            />
          </>
        )}
        <path d={d} fill={fill('resin')} />
        <g clipPath={fill(clip)}>
          {whole ? (
            <g filter={fill('soft')}>
              {layout.stone.bands.map((b: any, i: number) => (
                <rect
                  key={i}
                  x="-20"
                  y={b.at * 100 - b.w * 50}
                  width="140"
                  height={b.w * 100}
                  fill={b.tone > 0 ? '#ffe27a' : '#7a2a03'}
                  opacity={0.18 + Math.abs(b.tone) * 0.34}
                  transform={`rotate(${layout.stone.tilt} 50 50)`}
                />
              ))}
            </g>
          ) : (
            <use href={`#${uid}-bands`} />
          )}
          <use
            href={`#${uid}-inclusion`}
            transform={lens}
            filter={fill('halo')}
          />
          <path d={d} fill="#e48a14" opacity={0.03 + thick * 0.1} />
          <path d={d} fill="#7a2f02" opacity={0.05 + p.depth * 0.2} />
          <use
            href={`#${uid}-inclusion`}
            transform={lens}
            filter={fill('buried')}
            className="amber-art"
          />
          <use href={`#${uid}-sediment`} />
          {!whole && <path d={d} fill={fill('skin')} />}
          {!whole && <path d={d} fill={fill('dome')} />}
          {whole && (
            <g filter={fill('soften')}>
              {layout.stone.facets.map((q: any, i: number) => (
                <path
                  key={`f${i}`}
                  d={path(q.points)}
                  fill={q.tone > 0 ? '#fff1b5' : '#5a2402'}
                  fillOpacity={Math.abs(q.tone) * (q.tone > 0 ? 0.55 : 0.48)}
                />
              ))}
            </g>
          )}
          {whole && <path d={d} fill={fill('bulge')} opacity=".6" />}
          <rect
            width="100"
            height="100"
            fill="#000"
            filter={fill(whole ? 'grain' : 'lit')}
            opacity={whole ? 0.08 : 0.18 + thick * 0.15}
          />
          {!whole && (
            <path
              d={d}
              fill="none"
              stroke="#9ff0cf"
              strokeWidth="2.4"
              opacity=".08"
              filter={fill('soft')}
            />
          )}
          {!whole && (
            <path
              d={`M${p.inner.map((q: number[]) => q.join(' ')).join('L')}Z`}
              fill="none"
              stroke="#fff2b0"
              strokeWidth=".3"
              opacity=".14"
              filter={fill('soft')}
            />
          )}
          <g className="amber-facets">
            {p.planes.map((q: any, i: number) => (
              <path
                key={i}
                d={path(q.points)}
                fill={q.tone > 0 ? '#fff0b0' : '#6e2b02'}
                fillOpacity={
                  Math.abs(q.tone) * (whole ? 0.17 : q.tone > 0 ? 0.22 : 0.24)
                }
                stroke={whole ? (q.tone > 0 ? '#fff3b8' : '#4a1c01') : 'none'}
                strokeOpacity={whole ? 0.08 : 0.28}
                strokeWidth=".35"
                strokeLinejoin="bevel"
              />
            ))}
            {whole &&
              p.planesB.map((q: any, i: number) => (
                <path
                  key={`b${i}`}
                  d={path(q.points)}
                  fill={q.tone > 0 ? '#ffeaa0' : '#5c2302'}
                  fillOpacity={Math.abs(q.tone) * 0.12}
                  stroke={q.tone > 0 ? '#fff3b8' : '#4a1c01'}
                  strokeOpacity={0.22}
                  strokeWidth=".3"
                  strokeLinejoin="bevel"
                />
              ))}
          </g>
          <g className="amber-ripples" filter={fill('soft')}>
            {p.ripples.map((r: number[][], i: number) => (
              <path
                key={i}
                d={`M${r[0].join(' ')}Q${r[1].join(' ')} ${r[2].join(' ')}`}
                fill="none"
                stroke={i % 2 ? '#fff4c0' : '#c8710f'}
                strokeWidth={0.5 - i * 0.08}
                opacity={0.32}
              />
            ))}
          </g>
          {!joined && (
            <ellipse
              cx={p.spangle.x}
              cy={p.spangle.y}
              rx={p.spangle.r * 1.7}
              ry={p.spangle.r * 0.55}
              transform={`rotate(${p.spangle.rot} ${p.spangle.x} ${p.spangle.y})`}
              fill="#fff3bd"
              fillOpacity=".18"
              stroke="#fffbe0"
              strokeOpacity=".7"
              strokeWidth=".15"
            />
          )}
          {!whole && (
            <rect
              className="amber-sweep"
              x="-45"
              y="0"
              width="60"
              height="110"
              fill={fill('shine')}
              transform="rotate(22 50 50)"
            />
          )}
        </g>
        {whole && (
          <path
            d={d}
            fill="none"
            stroke="#3a1500"
            strokeOpacity=".35"
            strokeWidth=".6"
            strokeLinejoin="bevel"
          />
        )}
        <path className="amber-edge" d={d} stroke={fill('edge')} />
        <path
          className="amber-hairline"
          d={`M${p.inner[0].join(' ')}L${p.inner[1].join(' ')}`}
        />
        {p.sparks.map((k: any, i: number) => (
          <path
            key={i}
            className="amber-spark"
            d="M-1 0Q0 0 0 -1.6Q0 0 1 0Q0 0 0 1.6Q0 0-1 0"
            transform={`translate(${k.x} ${k.y}) scale(${k.r})`}
            style={
              {
                '--t': `${(p.rank * 370 + i * 1130) % 3600}ms`,
              } as CSSProperties
            }
          />
        ))}
        <g
          className="amber-glint"
          transform={`translate(${p.glint[0]} ${p.glint[1]})`}
        >
          <path d="M-2.8 0Q-.3-.3 0-3.8Q.3-.3 2.8 0Q.3.3 0 3.8Q-.3.3-2.8 0" />
          <circle r=".5" />
        </g>
      </>
    )
  }
  // a finished stone is one seamless body: no cracks, no gaps
  const wholeBody = useMemo(() => {
    const st = layout.stone
    const d = `M${st.outline.map(([x, y]: number[]) => `${x.toFixed(3)} ${y.toFixed(3)}`).join('L')}Z`
    const inner = st.outline.map(([x, y]: number[]) => [
      50 + (x - 50) * 0.8,
      50 + (y - 50) * 0.8,
    ])
    return {
      d,
      piece: {
        inner,
        depth: 0.55,
        thickness: 0.5,
        planes: [],
        planesB: [],
        ripples: [],
        spangle: { x: 40, y: 38, r: 2, rot: 28 },
        sparks: [
          { x: 34, y: 30, r: 1.4 },
          { x: 66, y: 44, r: 1.1 },
          { x: 50, y: 70, r: 1.6 },
        ],
        glint: [36, 28],
      },
    }
  }, [layout])

  return (
    <AmberStyle
      aria-hidden="true"
      data-complete={joined || undefined}
      data-state={state}
      data-arrive={arrive || undefined}
    >
      <span className="amber-aura" />
      {state === 'whole' &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className="amber-orbit"
            style={{ '--o': i } as CSSProperties}
          />
        ))}
      <svg viewBox="0 0 100 100" focusable="false">
        <defs>
          <radialGradient
            id={`${uid}-resin`}
            gradientUnits="userSpaceOnUse"
            cx="38"
            cy="30"
            r="78"
          >
            <stop stopColor="#ffeaa8" stopOpacity=".9" />
            <stop offset=".35" stopColor="#fbc84f" stopOpacity=".88" />
            <stop offset=".7" stopColor="#ec9a1e" stopOpacity=".92" />
            <stop offset="1" stopColor="#c8700f" stopOpacity=".95" />
          </radialGradient>
          <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2=".7" y2="1">
            <stop stopColor="#fffbe0" stopOpacity=".5" />
            <stop offset=".35" stopColor="#ffe08a" stopOpacity=".04" />
            <stop offset="1" stopColor="#d77a12" stopOpacity=".22" />
          </linearGradient>
          <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fffbe3" />
            <stop offset=".5" stopColor="#ffd466" />
            <stop offset="1" stopColor="#f0a53a" />
          </linearGradient>
          <linearGradient id={`${uid}-shine`}>
            <stop stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff6cb" stopOpacity=".16" />
            <stop offset=".56" stopColor="#fffbe6" stopOpacity=".3" />
            <stop offset=".64" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter
            id={`${uid}-buried`}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation=".3" />
            <feColorMatrix
              type="matrix"
              values=".50 .22 .04 0 .02  .24 .26 .04 0 .01  .05 .08 .05 0 0  0 0 0 1 0"
            />
          </filter>
          <filter
            id={`${uid}-halo`}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="2.6" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 .9  0 0 0 0 .55  0 0 0 .55 0"
            />
          </filter>
          <radialGradient id={`${uid}-bulge`} cx=".32" cy=".26" r=".85">
            <stop stopColor="#fff6c4" stopOpacity=".42" />
            <stop offset=".3" stopColor="#ffe08a" stopOpacity=".1" />
            <stop offset=".62" stopColor="#8a3a04" stopOpacity=".18" />
            <stop offset="1" stopColor="#2e1000" stopOpacity=".72" />
          </radialGradient>
          <radialGradient id={`${uid}-dome`} cx=".36" cy=".3" r=".78">
            <stop stopColor="#fff3c0" stopOpacity=".12" />
            <stop offset=".35" stopColor="#ffe9a0" stopOpacity=".06" />
            <stop offset=".75" stopColor="#b4580a" stopOpacity=".12" />
            <stop offset="1" stopColor="#7a3a04" stopOpacity=".4" />
          </radialGradient>
          <filter
            id={`${uid}-lit`}
            filterUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100"
            height="100"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency=".014 .02"
              numOctaves="2"
              seed={speciesId % 97}
              result="n"
            />
            <feSpecularLighting
              in="n"
              surfaceScale="2.2"
              specularConstant=".5"
              specularExponent="14"
              lightingColor="#fff6d2"
              result="spec"
            >
              <feDistantLight azimuth="235" elevation="46" />
            </feSpecularLighting>
            <feDiffuseLighting
              in="n"
              surfaceScale="2.2"
              diffuseConstant="1"
              lightingColor="#fff"
              result="diff"
            >
              <feDistantLight azimuth="235" elevation="46" />
            </feDiffuseLighting>
            <feColorMatrix
              in="diff"
              type="matrix"
              values="0 0 0 0 .5  0 0 0 0 .24  0 0 0 0 0  -1.5 0 0 0 1.1"
              result="shade"
            />
            <feMerge>
              <feMergeNode in="shade" />
              <feMergeNode in="spec" />
            </feMerge>
          </filter>
          <filter
            id={`${uid}-relief`}
            filterUnits="userSpaceOnUse"
            x="-10"
            y="-10"
            width="120"
            height="120"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="a" />
            <feGaussianBlur in="SourceAlpha" stdDeviation="15" result="b" />
            <feTurbulence
              type="fractalNoise"
              baseFrequency=".03 .04"
              numOctaves="5"
              seed={(speciesId * 7) % 83}
              result="n"
            />
            <feComposite
              in="a"
              in2="b"
              operator="arithmetic"
              k1="0"
              k2="0.6"
              k3="1.1"
              k4="0"
              result="dome"
            />
            <feComposite
              in="dome"
              in2="n"
              operator="arithmetic"
              k1="0"
              k2="1"
              k3="0.9"
              k4="0"
              result="h"
            />
            <feDiffuseLighting
              in="h"
              surfaceScale="48"
              diffuseConstant="1.2"
              lightingColor="#fff"
              result="d"
            >
              <feDistantLight azimuth="225" elevation="42" />
            </feDiffuseLighting>
            <feColorMatrix
              in="d"
              type="matrix"
              values="0 0 0 0 .18  0 0 0 0 .06  0 0 0 0 0  -2.6 0 0 0 2.05"
              result="shade"
            />
            <feColorMatrix
              in="d"
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 .94  0 0 0 0 .62  4.5 0 0 0 -4.1"
              result="hi"
            />
            <feMerge result="m">
              <feMergeNode in="shade" />
              <feMergeNode in="hi" />
            </feMerge>
            <feComposite in="m" in2="SourceAlpha" operator="in" />
          </filter>
          <filter
            id={`${uid}-grain`}
            filterUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100"
            height="100"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency=".5"
              numOctaves="3"
              seed={speciesId % 89}
              result="g"
            />
            <feDiffuseLighting
              in="g"
              surfaceScale="1.6"
              diffuseConstant="1.1"
              lightingColor="#fff"
              result="d"
            >
              <feDistantLight azimuth="235" elevation="55" />
            </feDiffuseLighting>
            <feColorMatrix
              in="d"
              type="matrix"
              values="0 0 0 0 .42  0 0 0 0 .18  0 0 0 0 0  -1.6 0 0 0 1.15"
            />
          </filter>
          <filter id={`${uid}-soften`} colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="0.38" />
          </filter>
          <filter id={`${uid}-soft`} colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation=".7" />
          </filter>
          <g id={`${uid}-inclusion`}>
            {failed ? (
              <text className="amber-fallback" x="50" y="61">
                {name.charAt(0).toUpperCase()}
              </text>
            ) : (
              <image
                href={href}
                x="15"
                y="13"
                width="70"
                height="74"
                preserveAspectRatio="xMidYMid meet"
              />
            )}
          </g>
          <g id={`${uid}-bands`} filter={fill('soft')}>
            {[
              ['M-10 18L110 -6L110 14L-10 40Z', '#fff0a0', 0.55],
              ['M-10 44L110 20L110 38L-10 66Z', '#8a3004', 0.5],
              ['M-10 70L110 44L110 56L-10 82Z', '#ffd45a', 0.4],
              ['M-10 84L110 60L110 112L-10 112Z', '#7a2a03', 0.55],
            ].map(([d, c, o], i) => (
              <path
                key={i}
                d={d as string}
                fill={c as string}
                opacity={o as number}
                transform={`rotate(${((speciesId * 37) % 40) - 20} 50 50)`}
              />
            ))}
          </g>
          <g id={`${uid}-sediment`}>
            <path
              d="M9 62Q30 48 44 61T91 43M14 72Q31 58 50 70T88 58M24 19Q40 34 77 24"
              fill="none"
              stroke="#fff0bd"
              strokeWidth=".6"
              opacity=".16"
              filter={fill('soft')}
            />
            {[
              [29, 28, 1.1],
              [69, 32, 0.7],
              [73, 68, 1.5],
              [37, 76, 0.6],
              [21, 53, 0.5],
              [59, 19, 0.4],
            ].map(([x, y, r], i) => (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill="#fff3c4"
                  fillOpacity=".12"
                  stroke="#fff6d6"
                  strokeOpacity=".7"
                  strokeWidth=".18"
                />
                <circle
                  cx={x - 0.2}
                  cy={y - 0.3}
                  r={r * 0.28}
                  fill="#ffffff"
                  opacity=".85"
                />
              </g>
            ))}
          </g>
          <clipPath id={`${uid}-body`}>
            <path d={wholeBody.d} />
          </clipPath>
          {layout.pieces.map((p: any) => (
            <clipPath key={p.id} id={`${uid}-${p.id}`}>
              <path d={curved(p.points, p.edges)} />
            </clipPath>
          ))}
        </defs>
        {assembled && (
          <g className="amber-whole">
            {body(wholeBody.d, 'body', wholeBody.piece, true)}
          </g>
        )}
        {!assembled &&
          layout.pieces.map((p: any) => {
            const owned = complete || p.rank < open
            const d = curved(p.points, p.edges)
            return (
              <g
                key={p.id}
                className="amber-piece"
                data-joined={joined || undefined}
                data-owned={owned || undefined}
                data-fresh={
                  (fresh && owned && p.rank === open - 1) || undefined
                }
                style={
                  {
                    '--dx': p.offset[0] * 150,
                    '--dy': p.offset[1] * 150,
                    '--delay': `${p.rank * 85}ms`,
                  } as CSSProperties
                }
              >
                {!owned ? (
                  <path className="amber-ghost" d={d} />
                ) : (
                  body(d, p.id, p, false)
                )}
              </g>
            )
          })}
      </svg>
      {bursting && (
        <span
          className="amber-burst"
          style={{ '--bd': celebrating ? '520ms' : '60ms' } as CSSProperties}
        >
          <b className="amber-ring" />
          {Array.from({ length: 14 }, (_, i) => (
            <i
              key={i}
              style={
                {
                  '--a': `${(i * 360) / 14 + (i % 2) * 6}deg`,
                  '--r': i % 2 ? 0.8 : 1.15,
                } as CSSProperties
              }
            />
          ))}
        </span>
      )}
    </AmberStyle>
  )
})
