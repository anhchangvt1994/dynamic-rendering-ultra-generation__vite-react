import { memo } from 'react'
import type { CSSProperties } from 'react'
import styled from 'styled-components'

/*
 * The Pokémon's name as a title card whose treatment follows its BST tier:
 *   weak (F/E)   — dull, letters slumped as if out of breath
 *   solid (D/C)  — clean block letters with a short extrusion
 *   strong (B/A) — tier-coloured 3D extrusion
 *   elite (S/SS) — metal gradient, letters slam down, light sweeps across
 *   mythic (SSS) — + chromatic glitch
 *   ex (EX)      — + holo rainbow running through the letters
 */
const GROUPS = [
  'weak',
  'weak',
  'solid',
  'solid',
  'strong',
  'strong',
  'elite',
  'elite',
  'mythic',
  'ex',
] as const

const NameStyle = styled.div`
  container-type: inline-size;
  width: 100%;
  padding: 2px 8px 6px;
  text-align: center;

  .name {
    position: relative;
    display: inline-flex;
    justify-content: center;
    max-width: 100%;
    margin: 0;
    font-family: 'Dela Gothic One', 'Be Vietnam Pro', sans-serif;
    font-weight: 400;
    /* long names shrink to fit one line; Dela runs ~0.85em per letter */
    font-size: clamp(20px, calc(96cqi / (var(--len) * 0.85)), 40px);
    line-height: 1.1 !important;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    white-space: nowrap;
    color: #fff;
  }
  .name .l {
    /* where this letter sits inside word-wide backgrounds */
    --slice-x: calc(var(--i) / max(var(--len) - 1, 1) * 100%);
    --sweep-x: calc(
      (var(--i) + var(--len) * 0.6) / max(var(--len) - 1, 1) * 100%
    );
    display: inline-block;
    /* the global reset forces 1.5 on everything; letters need the tight box */
    line-height: 1.1 !important;
    animation: name-rise 520ms cubic-bezier(0.2, 1.2, 0.3, 1)
      calc(var(--i) * 45ms) both;
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /* weak: grey, letters slightly off-axis and sagging */
  &[data-group='weak'] .name {
    color: #c9d1ce;
    text-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);
  }
  &[data-group='weak'] .name .l {
    rotate: var(--tilt);
    translate: 0 var(--sag);
    animation-name: name-flop;
    animation-duration: 700ms;
  }

  /* solid: clean block letters, short neutral extrusion */
  &[data-group='solid'] .name {
    text-shadow:
      0 1px 0 var(--tier-b),
      0 2px 0 var(--tier-b),
      0 6px 10px rgba(0, 0, 0, 0.35);
  }

  /* strong: deep extrusion in the tier colour */
  &[data-group='strong'] .name {
    text-shadow:
      0 1px 0 var(--tier-a),
      0 2px 0 var(--tier-b),
      0 3px 0 var(--tier-b),
      0 4px 0 var(--tier-b),
      0 5px 0 var(--tier-b),
      0 10px 14px rgba(0, 0, 0, 0.45),
      0 0 18px color-mix(in srgb, var(--tier-a) 45%, transparent);
  }

  /* elite and up: metal fill per letter, extrusion via drop-shadows */
  &[data-group='elite'] .name .l,
  &[data-group='mythic'] .name .l,
  &[data-group='ex'] .name .l {
    background:
      linear-gradient(
          100deg,
          transparent 40%,
          rgba(255, 255, 255, 0.95) 50%,
          transparent 60%
        )
        var(--sweep-x) 0 / calc(var(--len) * 100%) 100% no-repeat,
      linear-gradient(180deg, #fff 18%, var(--tier-a) 55%, var(--tier-b) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 1px 0 var(--tier-b))
      drop-shadow(0 3px 0 var(--tier-b))
      drop-shadow(0 0 10px color-mix(in srgb, var(--tier-a) 60%, transparent));
    animation:
      name-slam 460ms cubic-bezier(0.3, 1.6, 0.4, 1) calc(var(--i) * 55ms) both,
      name-sweep 3.2s ease-in-out calc(var(--len) * 55ms + 600ms) infinite;
  }
  /* one impact shake once the last letter lands */
  &[data-group='elite'] .name,
  &[data-group='mythic'] .name,
  &[data-group='ex'] .name {
    animation: name-impact 360ms ease-out calc(var(--len) * 55ms + 260ms) both;
  }

  /* SSS / EX: chromatic split that glitches every few seconds */
  &[data-group='mythic'] .name::before,
  &[data-group='mythic'] .name::after,
  &[data-group='ex'] .name::before,
  &[data-group='ex'] .name::after {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    pointer-events: none;
    mix-blend-mode: screen;
    opacity: 0;
  }
  &[data-group='mythic'] .name::before,
  &[data-group='ex'] .name::before {
    color: #ff2d75;
    animation: name-glitch-a 3.4s steps(1, end) 1.4s infinite;
  }
  &[data-group='mythic'] .name::after,
  &[data-group='ex'] .name::after {
    color: #2de1ff;
    animation: name-glitch-b 3.4s steps(1, end) 1.4s infinite;
  }

  /* EX: holo rainbow running continuously through the letters */
  &[data-group='ex'] .name .l {
    background:
      linear-gradient(
          100deg,
          transparent 40%,
          rgba(255, 255, 255, 0.95) 50%,
          transparent 60%
        )
        var(--sweep-x) 0 / calc(var(--len) * 100%) 100% no-repeat,
      linear-gradient(
          90deg,
          #ff5f6d,
          #ffd86f,
          #7dff9b,
          #6bf2ff,
          #c77dff,
          #ff7ce8,
          #ff5f6d
        )
        var(--slice-x) 0 / calc(var(--len) * 100%) 100%;
    -webkit-background-clip: text;
    background-clip: text;
    filter: drop-shadow(0 2px 0 #6a1fb5)
      drop-shadow(0 0 12px rgba(255, 140, 230, 0.7));
    animation:
      name-slam 460ms cubic-bezier(0.3, 1.6, 0.4, 1) calc(var(--i) * 55ms) both,
      name-sweep-ex 3.2s ease-in-out calc(var(--len) * 55ms + 600ms) infinite;
  }

  @keyframes name-rise {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes name-flop {
    0% {
      opacity: 0;
      transform: translateY(-8px);
    }
    70% {
      opacity: 1;
      transform: translateY(2px);
    }
    100% {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes name-slam {
    0% {
      opacity: 0;
      transform: translateY(-24px) scale(1.8);
    }
    60% {
      opacity: 1;
      transform: translateY(2px) scale(0.94);
    }
    100% {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes name-sweep {
    0% {
      background-position:
        var(--sweep-x) 0,
        0 0;
    }
    40%,
    100% {
      background-position:
        calc((var(--i) - var(--len) * 1.6) / max(var(--len) - 1, 1) * 100%) 0,
        0 0;
    }
  }
  @keyframes name-sweep-ex {
    0% {
      background-position:
        var(--sweep-x) 0,
        var(--slice-x) 0;
    }
    40%,
    100% {
      background-position:
        calc((var(--i) - var(--len) * 1.6) / max(var(--len) - 1, 1) * 100%) 0,
        var(--slice-x) 0;
    }
  }
  @keyframes name-impact {
    0%,
    100% {
      translate: 0 0;
    }
    20% {
      translate: -3px 1px;
    }
    40% {
      translate: 3px -1px;
    }
    60% {
      translate: -2px 0;
    }
    80% {
      translate: 1px 0;
    }
  }
  @keyframes name-glitch-a {
    0%,
    100% {
      opacity: 0;
      transform: none;
    }
    2% {
      opacity: 0.85;
      transform: translate(-3px, 1px);
      clip-path: inset(10% 0 55% 0);
    }
    4% {
      opacity: 0.85;
      transform: translate(2px, -1px);
      clip-path: inset(60% 0 8% 0);
    }
    6% {
      opacity: 0;
    }
  }
  @keyframes name-glitch-b {
    0%,
    100% {
      opacity: 0;
      transform: none;
    }
    2% {
      opacity: 0.85;
      transform: translate(3px, -1px);
      clip-path: inset(50% 0 20% 0);
    }
    4% {
      opacity: 0.85;
      transform: translate(-2px, 1px);
      clip-path: inset(5% 0 70% 0);
    }
    6% {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .name,
    .name .l,
    .name::before,
    .name::after {
      animation: none !important;
    }
  }
`

// "eternatus-eternamax" → "Eternatus Eternamax"
const display = (name: string) => name.split('-').filter(Boolean).join(' ')

// Deterministic tilt/sag per letter so SSR and client render the same.
const slump = (i: number) => ({
  '--tilt': `${((i * 37) % 7) - 3}deg`,
  '--sag': `${(i * 13) % 3}px`,
})

const PokemonName = memo(
  ({
    name,
    label,
    level,
    color,
  }: {
    name: string
    /** official display name ("Mr. Mime"); falls back to the slug */
    label?: string
    level: number
    color: { a: string; b: string }
  }) => {
    const text = label || display(name)
    const letters = [...text]
    return (
      <NameStyle
        data-group={GROUPS[level] ?? 'solid'}
        style={
          {
            '--tier-a': color.a,
            '--tier-b': color.b,
            '--len': letters.length,
          } as CSSProperties
        }
      >
        <h1 key={name} className="name" data-text={text}>
          <span className="sr">{text}</span>
          {letters.map((letter, i) => (
            <span
              key={i}
              className="l"
              aria-hidden="true"
              style={{ '--i': i, ...slump(i) } as CSSProperties}
            >
              {letter === ' ' ? ' ' : letter}
            </span>
          ))}
        </h1>
      </NameStyle>
    )
  }
)

PokemonName.displayName = 'PokemonName'
export default PokemonName
