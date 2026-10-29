import { memo, useId } from 'react'
import type { CSSProperties } from 'react'
import styled from 'styled-components'
import { getPokemonHabitat } from './habitat.mjs'
import {
  CX,
  CY,
  HabitatFusion,
  RX,
  RY,
  RuneRing,
  TypeAura,
  TypeParticles,
  timing,
} from './HabitatMotifs'

const HabitatStyle = styled.div`
  position: absolute;
  z-index: 0;
  left: 50%;
  bottom: 3px;
  width: clamp(190px, 40%, 320px);
  aspect-ratio: 320 / 200;
  transform: translateX(-50%);
  pointer-events: none;

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    transition:
      opacity 240ms ease,
      transform 320ms ease,
      filter 320ms ease;
  }

  stop {
    transition: stop-color 400ms ease;
  }

  /* Re-mounted per type signature, so every new Pokémon is "summoned". */
  .hb-stage {
    transform-box: view-box;
    transform-origin: 160px 168px;
    animation: hb-enter 760ms cubic-bezier(0.2, 0.9, 0.25, 1.2) both;
  }

  .hb-burst,
  .hb-spin,
  .hb-spin-rev,
  .hb-ripple,
  .hb-shock,
  .hb-boil,
  .hb-corona,
  .hb-core,
  .hb-bloom,
  .hb-twinkle,
  .hb-sweep,
  .hb-mist,
  .hb-p {
    transform-box: fill-box;
    transform-origin: center;
  }
  .hb-flame,
  .hb-sway,
  .hb-wisp,
  .hb-ray,
  .hb-beam {
    transform-box: fill-box;
    transform-origin: bottom center;
  }
  .hb-drip {
    transform-box: fill-box;
    transform-origin: top center;
  }

  .hb-burst {
    animation: hb-burst 900ms ease-out both;
  }
  .hb-bloom {
    animation: hb-bloom 3.6s ease-in-out infinite alternate;
  }
  .hb-beam {
    animation: hb-beam 2.8s ease-in-out infinite alternate;
  }
  .hb-streak {
    animation: hb-streak var(--t, 2.4s) linear var(--d, 0s) infinite;
  }
  .hb-core {
    animation: hb-core 2.4s ease-in-out infinite alternate;
  }
  .hb-spin {
    animation: hb-spin var(--t, 22s) linear infinite;
  }
  .hb-spin-rev {
    animation: hb-spin var(--t, 16s) linear infinite reverse;
  }
  .hb-dash {
    animation: hb-dash var(--t, 4s) linear var(--d, 0s) infinite;
  }
  .hb-pulse {
    animation: hb-pulse 2.2s ease-in-out infinite alternate;
  }

  .hb-flame {
    animation: hb-flame 0.9s ease-in-out var(--d, 0s) infinite alternate;
  }
  .hb-ripple {
    animation: hb-ripple 3.3s ease-out var(--d, 0s) infinite;
  }
  .hb-zap {
    animation: hb-zap var(--t, 2.6s) steps(1, end) var(--d, 0s) infinite;
  }
  .hb-sway {
    animation: hb-sway 2.6s ease-in-out var(--d, 0s) infinite alternate;
  }
  .hb-glint {
    animation: hb-glint var(--t, 2s) ease-in-out var(--d, 0s) infinite
      alternate;
  }
  .hb-shock {
    animation: hb-shock 1.8s cubic-bezier(0.1, 0.7, 0.3, 1) var(--d, 0s)
      infinite;
  }
  .hb-boil {
    animation: hb-boil var(--t, 2.4s) ease-in var(--d, 0s) infinite;
  }
  .hb-drip {
    animation: hb-drip 2.4s ease-in var(--d, 0s) infinite;
  }
  .hb-bob {
    animation: hb-bob 3.2s ease-in-out var(--d, 0s) infinite alternate;
  }
  .hb-hover {
    animation: hb-hover 3.4s ease-in-out var(--d, 0s) infinite alternate;
  }
  .hb-wisp {
    animation: hb-wisp 2.8s ease-in-out var(--d, 0s) infinite;
  }
  .hb-corona {
    animation: hb-corona 3s ease-in-out infinite alternate;
  }
  .hb-sweep {
    animation: hb-sweep 3.2s ease-in-out infinite;
  }
  .hb-twinkle {
    animation: hb-twinkle 1.8s ease-in-out var(--d, 0s) infinite;
  }
  .hb-ray {
    animation: hb-ray 2.2s ease-in-out var(--d, 0s) infinite alternate;
  }
  .hb-mist {
    animation: hb-mist 6s ease-in-out var(--d, 0s) infinite alternate;
  }

  .hb-p-rise {
    animation: hb-rise var(--t) ease-out var(--d) infinite;
  }
  .hb-p-burst {
    animation: hb-rise calc(var(--t) * 0.45) cubic-bezier(0.2, 0.8, 0.3, 1)
      var(--d) infinite;
  }
  .hb-p-sway {
    animation: hb-sway-up var(--t) ease-in-out var(--d) infinite;
  }
  .hb-p-fall {
    animation: hb-fall calc(var(--t) * 1.3) linear var(--d) infinite;
  }
  .hb-p-spark {
    animation: hb-spark calc(var(--t) * 0.6) linear var(--d) infinite;
  }
  .hb-p-swirl {
    animation: hb-swirl var(--t) ease-out var(--d) infinite;
  }
  .hb-p-wander {
    animation: hb-wander calc(var(--t) * 1.4) ease-in-out var(--d) infinite;
  }
  .hb-p-smoke {
    animation: hb-smoke calc(var(--t) * 1.2) ease-out var(--d) infinite;
  }
  .hb-p-twinkle {
    animation: hb-twinkle-up var(--t) ease-in-out var(--d) infinite;
  }

  /* power tier (BST rank 0..9) sets how much energy the stage shows */
  &[data-power='0'] svg,
  &[data-power='1'] svg {
    filter: saturate(0.6) brightness(0.85);
  }
  .hb-crown {
    animation: hb-bob 2.6s ease-in-out infinite alternate;
  }

  &[data-scanning='true'] {
    svg {
      opacity: 0.3;
      filter: saturate(0.4);
      transform: translateY(4px) scale(0.94);
    }
    * {
      animation-play-state: paused !important;
    }
  }

  @keyframes hb-enter {
    0% {
      transform: scale(0.55);
      opacity: 0;
    }
    55% {
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
  @keyframes hb-burst {
    from {
      transform: scale(0.3);
      opacity: 1;
    }
    to {
      transform: scale(1.9);
      opacity: 0;
    }
  }
  @keyframes hb-bloom {
    from {
      transform: scale(0.94);
      opacity: 0.75;
    }
    to {
      transform: scale(1.06);
      opacity: 1;
    }
  }
  @keyframes hb-beam {
    from {
      transform: scaleX(0.86);
      opacity: 0.6;
    }
    to {
      transform: scaleX(1);
      opacity: 1;
    }
  }
  @keyframes hb-streak {
    0% {
      transform: translateY(0);
      opacity: 0;
    }
    20% {
      opacity: 0.9;
    }
    100% {
      transform: translateY(-120px);
      opacity: 0;
    }
  }
  @keyframes hb-core {
    from {
      transform: scale(0.85);
      opacity: 0.7;
    }
    to {
      transform: scale(1.12);
      opacity: 1;
    }
  }
  @keyframes hb-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes hb-dash {
    to {
      stroke-dashoffset: -100;
    }
  }
  @keyframes hb-pulse {
    from {
      opacity: 0.45;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes hb-flame {
    0% {
      transform: scale(0.85, 0.75) skewX(-5deg);
    }
    50% {
      transform: scale(1.05, 1.15) skewX(4deg);
    }
    100% {
      transform: scale(0.92, 1) skewX(-2deg);
    }
  }
  @keyframes hb-ripple {
    0% {
      transform: scale(0.15);
      opacity: 0;
    }
    20% {
      opacity: 0.9;
    }
    100% {
      transform: scale(1);
      opacity: 0;
    }
  }
  @keyframes hb-zap {
    0%,
    100% {
      opacity: 0;
    }
    4%,
    22% {
      opacity: 1;
    }
    9%,
    30% {
      opacity: 0.2;
    }
    13%,
    36% {
      opacity: 1;
    }
    44% {
      opacity: 0;
    }
  }
  @keyframes hb-sway {
    from {
      transform: rotate(-7deg);
    }
    to {
      transform: rotate(7deg);
    }
  }
  @keyframes hb-glint {
    from {
      opacity: 0.45;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes hb-shock {
    from {
      transform: scale(0.85);
      opacity: 0.95;
    }
    to {
      transform: scale(1.45, 1.8);
      opacity: 0;
    }
  }
  @keyframes hb-boil {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    70% {
      transform: scale(1);
      opacity: 1;
    }
    82% {
      transform: scale(1.35);
      opacity: 0;
    }
    100% {
      transform: scale(0);
      opacity: 0;
    }
  }
  @keyframes hb-drip {
    0% {
      transform: scaleY(0.2);
      opacity: 1;
    }
    80% {
      transform: scaleY(1.2);
      opacity: 1;
    }
    100% {
      transform: scaleY(1.2) translateY(6px);
      opacity: 0;
    }
  }
  @keyframes hb-bob {
    from {
      transform: translateY(4px);
      opacity: 0.6;
    }
    to {
      transform: translateY(-6px);
      opacity: 1;
    }
  }
  @keyframes hb-hover {
    from {
      transform: translateY(2px) rotate(-8deg);
    }
    to {
      transform: translateY(-10px) rotate(8deg);
    }
  }
  @keyframes hb-wisp {
    0% {
      transform: translateY(0) scale(0.6, 0.4);
      opacity: 0;
    }
    30% {
      opacity: 1;
    }
    60% {
      transform: translateY(-14px) scale(1.1, 1.15) skewX(8deg);
    }
    100% {
      transform: translateY(-34px) scale(0.5, 0.8) skewX(-8deg);
      opacity: 0;
    }
  }
  @keyframes hb-corona {
    from {
      transform: scale(0.97);
      opacity: 0.65;
    }
    to {
      transform: scale(1.04);
      opacity: 1;
    }
  }
  @keyframes hb-sweep {
    0%,
    30% {
      transform: translateX(-150px) skewX(-30deg);
    }
    100% {
      transform: translateX(150px) skewX(-30deg);
    }
  }
  @keyframes hb-twinkle {
    0%,
    100% {
      transform: scale(0) rotate(0);
      opacity: 0;
    }
    50% {
      transform: scale(1) rotate(90deg);
      opacity: 1;
    }
  }
  @keyframes hb-ray {
    from {
      transform: scaleY(0.55);
      opacity: 0.4;
    }
    to {
      transform: scaleY(1.1);
      opacity: 1;
    }
  }
  @keyframes hb-mist {
    from {
      transform: translateX(-12px) scale(0.9);
    }
    to {
      transform: translateX(12px) scale(1.15);
    }
  }

  @keyframes hb-rise {
    0% {
      transform: translate(0, 0) scale(0.4);
      opacity: 0;
    }
    15% {
      opacity: 1;
    }
    70% {
      opacity: 0.9;
    }
    100% {
      transform: translate(var(--x), -120px) scale(1);
      opacity: 0;
    }
  }
  @keyframes hb-sway-up {
    0% {
      transform: translate(0, 0) scale(0.5);
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    50% {
      transform: translate(var(--x), -60px) scale(1);
    }
    100% {
      transform: translate(calc(var(--x) * -1), -120px) scale(0.8);
      opacity: 0;
    }
  }
  @keyframes hb-fall {
    0% {
      transform: translate(var(--x), -130px) rotate(0);
      opacity: 0;
    }
    20%,
    85% {
      opacity: 1;
    }
    100% {
      transform: translate(0, 0) rotate(180deg);
      opacity: 0;
    }
  }
  @keyframes hb-spark {
    0%,
    100% {
      transform: translate(0, 0) scale(0.3);
      opacity: 0;
    }
    8% {
      transform: translate(calc(var(--x) * 0.3), -16px) scale(1.4);
      opacity: 1;
    }
    16% {
      opacity: 0.2;
    }
    22% {
      transform: translate(calc(var(--x) * 0.6), -28px) scale(0.9);
      opacity: 1;
    }
    34% {
      opacity: 0;
    }
  }
  @keyframes hb-swirl {
    0% {
      transform: translate(0, 0) rotate(0) scale(0.6);
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    100% {
      transform: translate(calc(var(--x) * 2.5), -110px) rotate(540deg) scale(1);
      opacity: 0;
    }
  }
  @keyframes hb-wander {
    0% {
      transform: translate(0, 0);
      opacity: 0;
    }
    15%,
    45% {
      opacity: 1;
    }
    35% {
      transform: translate(var(--x), -30px);
    }
    55% {
      opacity: 0.15;
    }
    65% {
      transform: translate(calc(var(--x) * -0.6), -55px);
      opacity: 1;
    }
    100% {
      transform: translate(calc(var(--x) * 0.4), -95px);
      opacity: 0;
    }
  }
  @keyframes hb-smoke {
    0% {
      transform: translate(0, 0) scale(0.5);
      opacity: 0;
    }
    25% {
      opacity: 0.75;
    }
    100% {
      transform: translate(var(--x), -90px) scale(2.6);
      opacity: 0;
    }
  }
  @keyframes hb-twinkle-up {
    0% {
      transform: translate(0, 0) scale(0) rotate(0);
      opacity: 0;
    }
    25% {
      transform: translate(calc(var(--x) * 0.3), -30px) scale(1.3) rotate(90deg);
      opacity: 1;
    }
    50% {
      transform: translate(calc(var(--x) * 0.6), -60px) scale(0.4) rotate(180deg);
      opacity: 0.5;
    }
    75% {
      transform: translate(calc(var(--x) * 0.8), -85px) scale(1.1) rotate(270deg);
      opacity: 1;
    }
    100% {
      transform: translate(var(--x), -110px) scale(0) rotate(360deg);
      opacity: 0;
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
    .hb-p,
    .hb-streak,
    .hb-burst {
      display: none;
    }
  }
`

const STREAKS = [
  [118, 0, 2.2],
  [140, -0.8, 2.8],
  [160, -1.5, 2],
  [182, -0.4, 2.6],
  [204, -1.9, 2.4],
]

const PokemonHabitat = memo(
  ({
    types,
    scanning,
    power = 4,
  }: {
    types: { type: { name: string } }[]
    scanning: boolean
    /** BST tier from getPokemonPower: 0 (F) … 9 (EX) */
    power?: number
  }) => {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
    const theme = getPokemonHabitat(types)
    const { light, dark, glow } = theme
    const second = theme.secondaryColors
    const edge = second?.glow ?? glow
    const auras = [
      { type: theme.primary, colors: theme },
      ...(theme.secondary && second
        ? [{ type: theme.secondary, colors: second }]
        : []),
    ]
    const flatten = `translate(${CX} ${CY}) scale(1 ${RY / RX})`
    const front = `M${CX - RX} ${CY}A${RX} ${RY} 0 0 0 ${CX + RX} ${CY}`
    const energy = power / 9

    return (
      <HabitatStyle
        data-habitat={theme.kind}
        data-biome={theme.biome}
        data-habitat-primary={theme.primary}
        data-habitat-secondary={theme.secondary || undefined}
        data-pokemon-types={theme.signature}
        data-scanning={scanning}
        data-power={power}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 320 200"
          preserveAspectRatio="xMidYMax meet"
          focusable="false"
        >
          <defs>
            <radialGradient id={`${uid}-bloom`}>
              <stop offset="0" stopColor={glow} stopOpacity="0.6" />
              <stop offset="0.55" stopColor={edge} stopOpacity="0.22" />
              <stop offset="1" stopColor={edge} stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${uid}-beam`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor={glow} stopOpacity="0.5" />
              <stop offset="0.5" stopColor={edge} stopOpacity="0.16" />
              <stop offset="1" stopColor={edge} stopOpacity="0" />
            </linearGradient>
            <radialGradient id={`${uid}-face`} cx="50%" cy="42%" r="62%">
              <stop offset="0" stopColor={light} stopOpacity="0.9" />
              <stop offset="0.28" stopColor={glow} stopOpacity="0.85" />
              <stop offset="0.68" stopColor={dark} stopOpacity="0.96" />
              <stop offset="1" stopColor={edge} stopOpacity="0.95" />
            </radialGradient>
            <linearGradient id={`${uid}-side`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={edge} />
              <stop offset="0.35" stopColor={dark} />
              <stop offset="1" stopColor="#06080d" />
            </linearGradient>
            <radialGradient id={`${uid}-core`}>
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="0.35" stopColor={light} stopOpacity="0.7" />
              <stop offset="1" stopColor={glow} stopOpacity="0" />
            </radialGradient>
          </defs>

          <g key={theme.signature} className="hb-stage">
            <g opacity={0.3 + 0.7 * energy}>
            <ellipse
              className="hb-bloom"
              cx={CX}
              cy={CY}
              rx="160"
              ry="48"
              fill={`url(#${uid}-bloom)`}
            />
            <g className="hb-beam" fill={`url(#${uid}-beam)`}>
              <path d={`M${CX - 92} ${CY}L${CX - 52} 0H${CX + 52}L${CX + 92} ${CY}Z`} opacity="0.45" />
              <path d={`M${CX - 62} ${CY}L${CX - 30} 0H${CX + 30}L${CX + 62} ${CY}Z`} opacity="0.7" />
              <path d={`M${CX - 30} ${CY}L${CX - 12} 0H${CX + 12}L${CX + 30} ${CY}Z`} />
            </g>
            </g>
            <g fill={light}>
              {STREAKS.map(([x, d, t], i) => (
                <rect
                  key={x}
                  className="hb-streak"
                  style={timing(d, t)}
                  x={x - 0.8}
                  y={CY - 40}
                  width="1.6"
                  height="34"
                  rx="0.8"
                  fill={i % 2 ? edge : light}
                />
              ))}
            </g>

            {/* platform body */}
            <ellipse
              cx={CX}
              cy={CY + 17}
              rx={RX * 0.96}
              ry="13"
              fill="#000"
              opacity="0.4"
            />
            <path
              d={`${front}V${CY + 11}A${RX} ${RY} 0 0 1 ${CX - RX} ${CY + 11}Z`}
              fill={`url(#${uid}-side)`}
            />
            <path
              d={`M${CX - RX} ${CY + 11}A${RX} ${RY} 0 0 0 ${CX + RX} ${CY + 11}`}
              fill="none"
              stroke={edge}
              strokeWidth="1.2"
              opacity="0.7"
            />
            <ellipse
              cx={CX}
              cy={CY}
              rx={RX}
              ry={RY}
              fill={`url(#${uid}-face)`}
            />

            {/* spinning rune rings, painted onto the face */}
            <g
              transform={flatten}
              fill="none"
              style={{ '--t': `${26 - 14 * energy}s` } as CSSProperties}
            >
              <RuneRing type={theme.primary} colors={theme} radius={96} count={12} />
              <RuneRing
                type={theme.secondary || theme.primary}
                colors={second || theme}
                radius={58}
                count={8}
                reverse
              />
              <circle className="hb-core" r="40" fill={`url(#${uid}-core)`} />
            </g>

            <path d={front} fill="none" stroke={glow} strokeWidth="6" opacity="0.35" />
            <path d={front} fill="none" stroke={light} strokeWidth="1.4" />
            <ellipse
              cx={CX}
              cy={CY}
              rx={RX}
              ry={RY}
              fill="none"
              stroke={edge}
              strokeWidth="1.2"
            />

            {auras.map(({ type, colors }, i) => (
              <g key={type} data-motif={type} opacity={i ? 0.8 : 1}>
                <TypeAura type={type} colors={colors} uid={uid} />
              </g>
            ))}

            {/* dual types: two energy bands braided around the beam */}
            {second &&
              [glow, second.glow].map((color, i) => (
                <ellipse
                  key={i}
                  className="hb-dash"
                  style={timing(i * -1.2, 2.4)}
                  cx={CX}
                  cy={CY - 18 - i * 22}
                  rx={RX - 8 - i * 18}
                  ry={RY - 4 - i * 4}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray="22 28"
                  opacity="0.65"
                />
              ))}

            <HabitatFusion
              fusion={theme.fusion}
              colors={theme}
              secondary={second}
            />
            <TypeParticles types={auras} count={5 + power} />

            {/* tier S and above: crown rings of light rising over the stage */}
            {power >= 6 &&
              [0, 1, 2].slice(0, power - 5).map((i) => (
                <g key={i} className="hb-crown" style={timing(-i * 0.8)}>
                  <ellipse
                    cx={CX}
                    cy={112 - i * 30}
                    rx={92 - i * 20}
                    ry={15 - i * 3}
                    fill="none"
                    stroke={glow}
                    strokeWidth="7"
                    opacity="0.25"
                  />
                  <ellipse
                    className="hb-dash"
                    style={timing(0, 3 + i)}
                    cx={CX}
                    cy={112 - i * 30}
                    rx={92 - i * 20}
                    ry={15 - i * 3}
                    fill="none"
                    stroke="#fff6d6"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    pathLength="100"
                    strokeDasharray={power === 9 ? '0.1 2.5' : '18 4 2 4'}
                  />
                </g>
              ))}

            <ellipse
              className="hb-burst"
              cx={CX}
              cy={CY}
              rx={RX}
              ry={RY}
              fill="none"
              stroke={light}
              strokeWidth="3"
            />
          </g>
        </svg>
      </HabitatStyle>
    )
  }
)

PokemonHabitat.displayName = 'PokemonHabitat'
export default PokemonHabitat
