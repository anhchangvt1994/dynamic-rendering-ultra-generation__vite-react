import { memo, useId } from 'react'
import styled from 'styled-components'
import { getPokemonHabitat } from './habitat.mjs'
import { HabitatFusion, HabitatMotif } from './HabitatMotifs'

const HabitatStyle = styled.div`
  position: absolute;
  z-index: 0;
  left: 50%;
  bottom: -7px;
  width: clamp(180px, 36%, 290px);
  height: 96px;
  transform: translateX(-50%);
  pointer-events: none;

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    opacity: 0.94;
    transition:
      opacity 240ms ease,
      transform 320ms ease;
  }

  stop {
    transition: stop-color 400ms ease;
  }

  .water-ring {
    transform-box: fill-box;
    transform-origin: center;
    animation: habitat-tide 4.8s ease-out infinite;
  }
  .water-ring-delayed {
    animation-delay: -2.4s;
  }
  .flora {
    transform-box: fill-box;
    transform-origin: bottom center;
    animation: habitat-breeze 6s ease-in-out infinite alternate;
  }
  .flora-delayed {
    animation-delay: -3s;
  }
  .mote {
    transform-box: fill-box;
    transform-origin: center;
    animation: habitat-mote 4s ease-in-out infinite;
  }
  .mote:nth-child(even) {
    animation-delay: -2s;
  }
  .mote:nth-child(3n) {
    animation-delay: -1s;
  }

  .electric-arc {
    opacity: 0.65;
    animation: habitat-electric 4.4s ease-out infinite;
  }
  .arc-delayed {
    animation-delay: -1.5s;
  }
  .arc-late {
    animation-delay: -3s;
  }
  .ghost-wisp,
  .poison-bubble,
  .flame,
  .wind-streak {
    transform-box: fill-box;
    transform-origin: bottom center;
  }
  .ghost-wisp {
    animation: habitat-spirit 5s ease-in-out infinite alternate;
  }
  .wisp-delayed {
    animation-delay: -2.5s;
  }
  .poison-bubble {
    animation: habitat-spirit 4s ease-in-out infinite alternate;
  }
  .bubble-delayed {
    animation-delay: -2s;
  }
  .flame {
    animation: habitat-flame 3.2s ease-in-out infinite alternate;
  }
  .flame.flora-delayed {
    animation-delay: -1.6s;
  }
  .wind-streak {
    animation: habitat-wind 6s ease-in-out infinite alternate;
  }
  .eclipse-halo {
    animation: habitat-eclipse 7s ease-in-out infinite alternate;
  }

  &[data-scanning='true'] {
    svg {
      opacity: 0.28;
      transform: translateY(3px) scale(0.95);
    }
    * {
      animation-play-state: paused !important;
    }
  }

  @keyframes habitat-tide {
    from {
      transform: scale(0.86);
      opacity: 0.65;
    }
    to {
      transform: scale(1.18, 1.3);
      opacity: 0;
    }
  }
  @keyframes habitat-breeze {
    from {
      transform: rotate(-2deg);
    }
    to {
      transform: rotate(2deg);
    }
  }
  @keyframes habitat-mote {
    0%,
    100% {
      transform: translateY(0);
      opacity: 0.15;
    }
    50% {
      transform: translateY(-10px);
      opacity: 0.8;
    }
  }
  @keyframes habitat-electric {
    0%,
    64%,
    82%,
    100% {
      opacity: 0.4;
    }
    69% {
      opacity: 1;
    }
    75% {
      opacity: 0.5;
    }
  }
  @keyframes habitat-spirit {
    from {
      transform: translateY(0);
      opacity: 0.55;
    }
    to {
      transform: translateY(-5px);
      opacity: 0.95;
    }
  }
  @keyframes habitat-flame {
    from {
      transform: scale(0.95, 0.92);
      opacity: 0.75;
    }
    to {
      transform: scale(1.02, 1.07);
      opacity: 1;
    }
  }
  @keyframes habitat-wind {
    from {
      transform: translateX(-3px);
      opacity: 0.45;
    }
    to {
      transform: translateX(3px);
      opacity: 0.9;
    }
  }
  @keyframes habitat-eclipse {
    from {
      opacity: 0.55;
    }
    to {
      opacity: 0.9;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    svg,
    stop {
      transition: none;
    }
    * {
      animation: none !important;
    }
  }
`

const grass = [
  [51, 61],
  [77, 49],
  [253, 54],
  [275, 69],
  [95, 86],
  [225, 87],
]
const flowers = [
  [65, 70],
  [91, 54],
  [242, 61],
  [255, 82],
  [113, 87],
]

const PokemonHabitat = memo(
  ({
    types,
    scanning,
  }: {
    types: { type: { name: string } }[]
    scanning: boolean
  }) => {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
    const theme = getPokemonHabitat(types)
    const { kind, accent, dark, light, petal } = theme
    const land = ['meadow', 'stone', 'arena', 'metal', 'ruins'].includes(kind)
    const plants = theme.motifs.some((type) =>
      ['normal', 'grass', 'bug'].includes(type)
    )
    const blossoms = theme.motifs.some((type) =>
      ['grass', 'fairy'].includes(type)
    )

    return (
      <HabitatStyle
        data-habitat={kind}
        data-biome={theme.biome}
        data-habitat-primary={theme.primary}
        data-habitat-secondary={theme.secondary || undefined}
        data-pokemon-types={theme.signature}
        data-scanning={scanning}
        aria-hidden="true"
      >
        <svg viewBox="0 0 320 112" preserveAspectRatio="none" focusable="false">
          <defs>
            <radialGradient id={`${uid}-surface`} cx="50%" cy="35%" r="70%">
              <stop
                offset="0"
                stopColor={kind === 'circuit' ? dark : accent}
                stopOpacity={kind === 'circuit' ? '0.94' : '0.72'}
              />
              <stop offset="1" stopColor={dark} stopOpacity="0.94" />
            </radialGradient>
            <radialGradient id={`${uid}-halo`}>
              <stop offset="0" stopColor={accent} stopOpacity="0.28" />
              <stop offset="1" stopColor={accent} stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${uid}-edge`} x2="0" y2="1">
              <stop stopColor={accent} stopOpacity="0.42" />
              <stop offset="1" stopColor={dark} stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <ellipse
            cx="160"
            cy="76"
            rx="157"
            ry="35"
            fill={`url(#${uid}-halo)`}
          />
          <ellipse
            cx="160"
            cy="85"
            rx="116"
            ry="19"
            fill="#0c2423"
            opacity="0.19"
          />

          {land ? (
            <>
              <path
                d="M30 67C30 30 290 30 290 67V76C290 114 30 114 30 76Z"
                fill={`url(#${uid}-edge)`}
              />
              <ellipse
                cx="160"
                cy="66"
                rx="130"
                ry="29"
                fill={`url(#${uid}-surface)`}
              />
              <path
                d="M33 71C64 98 257 98 287 71"
                fill="none"
                stroke={light}
                opacity="0.26"
              />
              <g fill={accent} opacity="0.26">
                {[
                  [93, 67, 19],
                  [218, 67, 24],
                  [153, 84, 23],
                  [139, 51, 18],
                ].map(([x, y, rx]) => (
                  <ellipse key={x} cx={x} cy={y} rx={rx} ry="4" />
                ))}
              </g>
              {plants &&
                grass.map(([x, y], index) => (
                  <g
                    key={x}
                    transform={`translate(${x} ${y}) scale(${index % 2 ? -1 : 1} 1)`}
                  >
                    <g className={`flora ${index % 2 ? 'flora-delayed' : ''}`}>
                      <path d="M0 0Q-17-9-15-24Q-4-20 0 0" fill={accent} />
                      <path
                        d="M0 0Q-6-24 5-31Q11-15 0 0"
                        fill={light}
                        opacity="0.85"
                      />
                      <path d="M0 0Q5-21 19-19Q16-5 0 0" fill={accent} />
                      <path
                        d="M0-1L4-21M1-2L13-14"
                        fill="none"
                        stroke={dark}
                        strokeWidth="0.8"
                        opacity="0.5"
                      />
                    </g>
                  </g>
                ))}
              {blossoms &&
                flowers.map(([x, y]) => (
                  <g key={x} transform={`translate(${x} ${y})`}>
                    <path d="M0 3V12" stroke={accent} strokeWidth="1.5" />
                    <g fill={petal}>
                      {[0, 72, 144, 216, 288].map((angle) => (
                        <ellipse
                          key={angle}
                          cy="-3.5"
                          rx="2.7"
                          ry="4"
                          transform={`rotate(${angle})`}
                        />
                      ))}
                    </g>
                    <circle r="2.3" fill={light} />
                  </g>
                ))}
            </>
          ) : (
            <>
              <ellipse
                cx="160"
                cy="70"
                rx="130"
                ry="27"
                fill={`url(#${uid}-surface)`}
                stroke={accent}
                strokeOpacity="0.5"
                strokeWidth="1.2"
              />
              {kind === 'water' && (
                <>
                  <g fill="none" stroke={light} strokeWidth="1.1">
                    <ellipse
                      className="water-ring"
                      cx="160"
                      cy="70"
                      rx="115"
                      ry="22"
                    />
                    <ellipse
                      className="water-ring water-ring-delayed"
                      cx="160"
                      cy="70"
                      rx="115"
                      ry="22"
                    />
                    <path
                      d="M48 76Q74 89 96 82T143 85T190 85T238 81T273 77"
                      opacity="0.7"
                    />
                    <path
                      d="M66 64Q88 58 109 63M209 63Q232 56 254 65"
                      opacity="0.35"
                    />
                    <path d="M105 93Q157 102 214 93" opacity="0.4" />
                  </g>
                  <g fill={light} opacity="0.65">
                    <circle cx="72" cy="80" r="1.8" />
                    <circle cx="83" cy="83" r="1" />
                    <circle cx="250" cy="77" r="1.7" />
                    <circle cx="241" cy="85" r="1.1" />
                  </g>
                </>
              )}
              {kind === 'ember' && (
                <>
                  <g
                    fill="none"
                    stroke={accent}
                    strokeWidth="1.2"
                    opacity="0.8"
                  >
                    <path d="M54 77L83 70L96 79L120 80M83 70L90 57M220 86L233 73L266 69M233 73L225 59" />
                    <ellipse
                      cx="160"
                      cy="70"
                      rx="118"
                      ry="22"
                      strokeDasharray="15 7 3 8"
                    />
                  </g>
                  <g fill={light}>
                    {[
                      [67, 61],
                      [93, 50],
                      [247, 55],
                      [266, 73],
                      [217, 85],
                    ].map(([x, y]) => (
                      <circle className="mote" key={x} cx={x} cy={y} r="1.8" />
                    ))}
                  </g>
                </>
              )}
              {kind === 'frost' && (
                <g fill={light} stroke={accent} opacity="0.7">
                  <path d="M51 77L63 48L72 69L83 56L91 82ZM235 81L244 54L252 65L263 45L273 77Z" />
                  <path
                    d="M96 89L128 63L150 75L182 57L219 87"
                    fill="none"
                    strokeWidth="1.1"
                  />
                  <ellipse
                    cx="160"
                    cy="70"
                    rx="116"
                    ry="22"
                    fill="none"
                    strokeDasharray="4 7"
                  />
                </g>
              )}
              {kind === 'astral' && (
                <g stroke={light} fill="none" opacity="0.7">
                  <ellipse
                    cx="160"
                    cy="70"
                    rx="119"
                    ry="21"
                    strokeDasharray="30 8 3 8"
                  />
                  <ellipse
                    cx="160"
                    cy="70"
                    rx="105"
                    ry="16"
                    strokeOpacity="0.5"
                  />
                  {[
                    [55, 63],
                    [88, 46],
                    [249, 53],
                    [266, 78],
                  ].map(([x, y]) => (
                    <path
                      className="mote"
                      key={x}
                      d={`M${x} ${y - 5}l3 5-3 5-3-5Z`}
                      fill={accent}
                    />
                  ))}
                </g>
              )}
            </>
          )}
          <HabitatMotif type={theme.primary} colors={theme} />
          {theme.secondary && theme.secondaryColors && (
            <HabitatMotif
              type={theme.secondary}
              colors={theme.secondaryColors}
              secondary
            />
          )}
          <HabitatFusion
            fusion={theme.fusion}
            colors={theme}
            secondary={theme.secondaryColors}
          />
        </svg>
      </HabitatStyle>
    )
  }
)

PokemonHabitat.displayName = 'PokemonHabitat'
export default PokemonHabitat
