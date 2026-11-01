import styled from 'styled-components'
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { seeded } from './quiz.mjs'

// three rows of blades, the back one the tallest and darkest
const LAYERS = [
  { blades: 34, height: [38, 70], color: '#123d2a' },
  { blades: 28, height: [30, 58], color: '#1b5a37' },
  { blades: 22, height: [22, 44], color: '#277a45' },
]
// the tufts where something moves, around the middle of the meadow
const CLUMPS = [
  { x: 14, y: 70 },
  { x: 72, y: 62 },
  { x: 40, y: 78 },
  { x: 86, y: 80 },
  { x: 56, y: 66 },
]
const ENCOUNTER_MS = 620

// a row of blades as one path: thin pointed curves leaning both ways
const bladesPath = (count: number, [low, high]: number[], seed: number) => {
  const random = seeded(seed)
  let d = ''
  for (let i = 0; i < count; i++) {
    const x = (i / count) * 400 + random() * 8
    const w = 7 + random() * 9
    const h = low + random() * (high - low)
    const lean = (random() - 0.5) * 18
    d += `M${x.toFixed(1)} 100Q${(x + w * 0.3 + lean * 0.4).toFixed(1)} ${(100 - h * 0.55).toFixed(1)} ${(x + w / 2 + lean).toFixed(1)} ${(100 - h).toFixed(1)}Q${(x + w * 0.7 + lean * 0.4).toFixed(1)} ${(100 - h * 0.55).toFixed(1)} ${(x + w).toFixed(1)} 100Z`
  }
  return d
}
const PATHS = LAYERS.map((layer, i) =>
  bladesPath(layer.blades, layer.height, 97 + i * 31)
)

/**
 * "A wild Pokémon appeared": while the artwork comes, a night meadow of tall
 * grass sways, and one tuft at a time shakes hard with a "!" over it. When
 * the artwork never comes, the grass goes still in a puff of dust: it fled.
 */
export default function WildGrass({ fled = false }: { fled?: boolean }) {
  return (
    <WildGrassStyle className="wild-grass" data-fled={fled || undefined}>
      <span className="wg-glow" aria-hidden="true" />
      {LAYERS.map((layer, i) => (
        <svg
          key={i}
          className="wg-layer"
          data-layer={i}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={PATHS[i]} fill={layer.color} />
        </svg>
      ))}
      {CLUMPS.map((clump, i) => (
        <span
          key={i}
          className="wg-clump"
          style={
            {
              '--x': `${clump.x}%`,
              '--y': `${clump.y}%`,
              '--i': i,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <svg viewBox="0 0 40 40">
            <path d="M0 40L7 6 13 28 20 0 27 28 33 6 40 40Z" />
            <path className="wg-shine" d="M18 30L20 6 22 30Z" />
          </svg>
          <b className="bang">!</b>
        </span>
      ))}
      {fled && <span className="wg-dust" aria-hidden="true" />}
      <span className="sr-only" aria-live="polite">
        {fled ? 'Nó chạy mất rồi!' : 'Có gì đó trong bụi cỏ…'}
      </span>
    </WildGrassStyle>
  )
}

/**
 * The battle transition of the Game Boy games: black and white bars sweep
 * across from both sides, a white flash, and the Pokémon is there.
 */
export function Encounter({ onEnd }: { onEnd: () => void }) {
  const end = useRef(onEnd)
  end.current = onEnd
  useEffect(() => {
    const timer = window.setTimeout(() => end.current(), ENCOUNTER_MS)
    return () => clearTimeout(timer)
  }, [])
  return (
    <EncounterStyle className="encounter" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <i key={i} style={{ '--i': i } as CSSProperties} />
      ))}
      <span className="enc-flash" />
    </EncounterStyle>
  )
}

const WildGrassStyle = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  border-radius: inherit;
  background:
    radial-gradient(circle at 22% 30%, #fff 0 1px, transparent 1.5px),
    radial-gradient(circle at 48% 16%, #fff 0 1px, transparent 1.5px),
    radial-gradient(circle at 63% 34%, #fff 0 1px, transparent 1.5px),
    radial-gradient(circle at 84% 24%, #fff 0 1.5px, transparent 2px),
    radial-gradient(ellipse at 50% 120%, #2f8a52 0, transparent 60%),
    linear-gradient(#0b1838, #163a5c 55%, #1d4a3f);
  pointer-events: none;

  .wg-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 50% 70%,
      rgba(255, 255, 210, 0.16),
      transparent 55%
    );
    animation: wg-breathe 3.2s ease-in-out infinite;
  }
  .wg-layer {
    position: absolute;
    left: -6%;
    width: 112%;
    bottom: 0;
    transform-origin: 50% 100%;
    animation: wg-sway 3.4s ease-in-out infinite alternate;
  }
  .wg-layer[data-layer='0'] {
    height: 78%;
    animation-duration: 4.2s;
  }
  .wg-layer[data-layer='1'] {
    height: 60%;
    animation-delay: -1.3s;
  }
  .wg-layer[data-layer='2'] {
    height: 42%;
    animation-duration: 2.8s;
    animation-delay: -0.6s;
  }

  /* a tuft that rustles, its "!" over it: one tuft every 1.6 s */
  .wg-clump {
    position: absolute;
    left: var(--x);
    top: var(--y);
    width: clamp(46px, 15cqw, 84px);
    aspect-ratio: 1;
    transform: translate(-50%, -100%);
  }
  .wg-clump svg {
    width: 100%;
    height: 100%;
    fill: #2f9a55;
    filter: drop-shadow(0 3px 0 #0e3320);
    transform-origin: 50% 100%;
    animation: wg-rustle 8s linear infinite;
    animation-delay: calc(var(--i) * 1.6s);
  }
  .wg-clump .wg-shine {
    fill: #6fd38f;
  }
  .bang {
    position: absolute;
    left: 50%;
    bottom: 92%;
    display: grid;
    place-items: center;
    width: 28px;
    height: 34px;
    margin-left: -14px;
    border-radius: 8px;
    background: #fff;
    color: #e3350d;
    font-size: 24px;
    font-weight: 900;
    line-height: 1;
    box-shadow: 0 3px 0 #0e3320;
    opacity: 0;
    transform-origin: 50% 100%;
    animation: wg-bang 8s linear infinite;
    animation-delay: calc(var(--i) * 1.6s);
  }

  /* it fled: the grass stands still, a puff of dust where it was */
  &[data-fled] .wg-layer,
  &[data-fled] .wg-glow,
  &[data-fled] .wg-clump svg,
  &[data-fled] .bang {
    animation: none;
  }
  &[data-fled] .bang {
    opacity: 0;
  }
  &[data-fled] {
    filter: saturate(0.6) brightness(0.8);
  }
  .wg-dust {
    position: absolute;
    left: 50%;
    top: 62%;
    width: 46%;
    aspect-ratio: 2;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background:
      radial-gradient(
        circle at 30% 60%,
        rgba(220, 210, 180, 0.8) 0 18%,
        transparent 19%
      ),
      radial-gradient(
        circle at 55% 40%,
        rgba(220, 210, 180, 0.7) 0 22%,
        transparent 23%
      ),
      radial-gradient(
        circle at 75% 65%,
        rgba(220, 210, 180, 0.75) 0 16%,
        transparent 17%
      );
    animation: wg-dust 1100ms ease-out both;
  }

  @keyframes wg-sway {
    from {
      transform: skewX(-4deg);
    }
    to {
      transform: skewX(4deg);
    }
  }
  @keyframes wg-breathe {
    50% {
      opacity: 0.5;
    }
  }
  @keyframes wg-rustle {
    0%,
    12%,
    100% {
      transform: none;
    }
    2% {
      transform: rotate(-9deg) scale(1.06, 0.94);
    }
    4% {
      transform: rotate(8deg) scale(0.96, 1.05);
    }
    6% {
      transform: rotate(-7deg);
    }
    8% {
      transform: rotate(6deg) scale(1.04, 0.96);
    }
    10% {
      transform: rotate(-3deg);
    }
  }
  @keyframes wg-bang {
    0%,
    3%,
    16%,
    100% {
      opacity: 0;
      transform: translateY(8px) scale(0.4);
    }
    5% {
      opacity: 1;
      transform: translateY(-4px) scale(1.15);
    }
    7%,
    13% {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes wg-dust {
    from {
      opacity: 0;
      transform: translate(-50%, -30%) scale(0.4);
    }
    40% {
      opacity: 1;
    }
    to {
      opacity: 0.55;
      transform: translate(-50%, -60%) scale(1.25);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &,
    & * {
      animation: none !important;
    }
    /* one "!" stays up, so something is there */
    .wg-clump:last-of-type .bang {
      opacity: 1;
      transform: none;
    }
  }
`

const EncounterStyle = styled.div`
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  grid-template-rows: repeat(8, 1fr);
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;

  i {
    background: #000;
    transform: translateX(var(--from));
    animation: enc-bar 620ms cubic-bezier(0.6, 0, 0.3, 1) both;
    animation-delay: calc(var(--i) * 18ms);
  }
  i:nth-child(odd) {
    background: #f4f4f4;
    --from: -105%;
  }
  i:nth-child(even) {
    --from: 105%;
  }
  .enc-flash {
    position: absolute;
    inset: 0;
    background: #fff;
    opacity: 0;
    animation: enc-flash 620ms ease-out both;
  }

  @keyframes enc-bar {
    0% {
      transform: translateX(var(--from));
    }
    40%,
    55% {
      transform: none;
    }
    100% {
      transform: translateX(calc(var(--from) * -1));
    }
  }
  @keyframes enc-flash {
    0%,
    45% {
      opacity: 0;
    }
    55% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    i {
      display: none;
    }
    .enc-flash {
      animation: enc-fade 620ms ease-out both;
    }
    @keyframes enc-fade {
      from {
        opacity: 0.6;
      }
      to {
        opacity: 0;
      }
    }
  }
`
