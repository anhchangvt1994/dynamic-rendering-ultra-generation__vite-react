import styled from 'styled-components'
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

// NOTE - The beats (ms), matching the CSS below and in styles.tsx: the
// holes open, swallow the options (spaghettified), collapse, flash out
export const RIFT_MS = 1800
const STRANDS = 8

/** What Palkia did for the round, said in one short line. */
export function palkiaSays(removed: number, letter: string | null) {
  if (removed && letter)
    return `Palkia góp sức! Còn 2 lựa chọn · chữ đầu ${letter}`
  if (removed) return 'Palkia góp sức! Chỉ còn 2 lựa chọn'
  return `Palkia góp sức! Tên bắt đầu bằng chữ ${letter}`
}

// a bump over the rift's life: 0 → 1 → 0, sharp in, slow out
const swell = (t: number) => Math.sin(Math.PI * Math.min(1, t) ** 0.7)

/**
 * Palkia bends space. Gravitational waves ring out over the stage and the
 * silhouette warps as if seen through a lens (#palkia-lens); the options
 * left ripple like heat haze (#palkia-twist, styles.tsx) while a black hole
 * swallows each one it takes (BlackHole). The two SVG filters live here and breathe with the rift.
 */
export default function PalkiaRift({ onEnd }: { onEnd: () => void }) {
  const end = useRef(onEnd)
  end.current = onEnd
  const lens = useRef<SVGFEDisplacementMapElement>(null)
  const twist = useRef<SVGFEDisplacementMapElement>(null)
  const twistNoise = useRef<SVGFETurbulenceElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => end.current(), RIFT_MS)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches)
      return () => clearTimeout(timer)
    const start = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      const t = (now - start) / RIFT_MS
      const k = swell(t)
      lens.current?.setAttribute('scale', (46 * k).toFixed(1))
      twist.current?.setAttribute('scale', (9 * k).toFixed(1))
      // the twist swirls on: the noise drifts while it bends
      twistNoise.current?.setAttribute(
        'baseFrequency',
        `${(0.008 + 0.004 * Math.sin(now / 180)).toFixed(4)} ${(0.02 + 0.008 * Math.cos(now / 230)).toFixed(4)}`
      )
      if (t < 1) frame = requestAnimationFrame(tick)
    })
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <RiftStyle className="palkia-rift" aria-hidden="true">
      <svg className="pr-filters" width="0" height="0" focusable="false">
        <filter id="palkia-lens" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.006 0.009"
            numOctaves={1}
            seed={7}
            result="swirl"
          />
          <feDisplacementMap
            ref={lens}
            in="SourceGraphic"
            in2="swirl"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="B"
          />
        </filter>
        <filter id="palkia-twist" x="-10%" y="-30%" width="120%" height="160%">
          <feTurbulence
            ref={twistNoise}
            type="fractalNoise"
            baseFrequency="0.008 0.02"
            numOctaves={1}
            seed={3}
            result="ripple"
          />
          <feDisplacementMap
            ref={twist}
            in="SourceGraphic"
            in2="ripple"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      <span className="space-wave">
        <i />
        <i />
        <i />
      </span>
      <span className="pr-pearl" />
    </RiftStyle>
  )
}

/**
 * A black hole in an option's cell: an accretion disk spinning on its side,
 * the photon ring, the black core. The option is pulled into it like
 * spaghetti (styles.tsx, palkia-spaghetti) with strands of it spiralling in;
 * then the hole collapses into a flash and the cell is left empty.
 */
export function BlackHole() {
  return (
    <BlackHoleStyle className="black-hole" aria-hidden="true">
      <span className="bh-halo" />
      <span className="bh-core" />
      {/* the disk seen edge-on: a flat ring whose glow turns */}
      <span className="bh-disk">
        <span />
      </span>
      {Array.from({ length: STRANDS }, (_, i) => (
        <i key={i} style={{ '--i': i } as CSSProperties} />
      ))}
      <span className="bh-flash" />
    </BlackHoleStyle>
  )
}

/** The first letter Palkia told, kept on the stage for the round. */
export function PalkiaLetter({ letter }: { letter: string }) {
  return (
    <p className="palkia-letter">
      <span aria-hidden="true" className="pl-pearl" />
      Chữ đầu: <b>{letter}</b>
    </p>
  )
}

const RiftStyle = styled.div`
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;

  .pr-filters {
    position: absolute;
  }
  /* gravitational waves: rings of bent space racing out from the middle */
  .space-wave {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
  .space-wave i {
    grid-area: 1 / 1;
    width: 30%;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 3px solid rgba(255, 214, 240, 0.85);
    box-shadow:
      0 0 24px rgba(255, 124, 207, 0.7),
      inset 0 0 24px rgba(176, 124, 255, 0.6);
    opacity: 0;
    animation: pr-wave 1100ms cubic-bezier(0.2, 0.6, 0.3, 1) both;
  }
  .space-wave i:nth-child(2) {
    animation-delay: 220ms;
  }
  .space-wave i:nth-child(3) {
    animation-delay: 440ms;
  }
  /* Palkia's pearl, flaring in the middle of it */
  .pr-pearl {
    position: absolute;
    width: 18%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(
      circle at 38% 34%,
      #fff 0 12%,
      #ffd1ec 30%,
      #ff7ccf 55%,
      rgba(176, 124, 255, 0) 72%
    );
    mix-blend-mode: screen;
    animation: pr-pearl ${RIFT_MS}ms ease-out both;
  }

  @keyframes pr-wave {
    0% {
      opacity: 0.95;
      transform: scale(0.2);
    }
    100% {
      opacity: 0;
      transform: scale(4.2);
      border-width: 1px;
    }
  }
  @keyframes pr-pearl {
    0% {
      opacity: 0;
      transform: scale(0.2);
    }
    15% {
      opacity: 1;
      transform: scale(1.4);
    }
    40% {
      opacity: 0.7;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(0.3);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .space-wave i,
    .pr-pearl {
      animation: pr-fade ${RIFT_MS}ms ease-out both;
    }
    @keyframes pr-fade {
      from {
        opacity: 0.6;
        transform: none;
      }
      to {
        opacity: 0;
      }
    }
  }
`

const BlackHoleStyle = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 2;
  width: 64px;
  height: 64px;
  margin: -32px 0 0 -32px;
  pointer-events: none;
  animation: bh-life ${RIFT_MS}ms cubic-bezier(0.3, 0, 0.3, 1) both;

  > span,
  > i {
    position: absolute;
    left: 50%;
    top: 50%;
  }
  /* the light bent around it */
  .bh-halo {
    width: 150%;
    height: 150%;
    margin: -75% 0 0 -75%;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      transparent 30%,
      rgba(255, 124, 207, 0.35) 42%,
      rgba(176, 124, 255, 0.15) 58%,
      transparent 70%
    );
    animation: bh-breathe 500ms ease-in-out infinite alternate;
  }
  /* the accretion disk, seen edge-on (Gargantua): a ring squashed flat and
     tilted, crossing in front of the core; its glow turns inside it */
  .bh-disk {
    z-index: 1;
    width: 190%;
    height: 190%;
    margin: -95% 0 0 -95%;
    transform: rotate(-14deg) scaleY(0.26);
  }
  .bh-disk span {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      #fff,
      #ffd1ec 50deg,
      #ff7ccf 120deg,
      #b07cff 190deg,
      #ff7ccf 260deg,
      #ffe8f6 320deg,
      #fff
    );
    -webkit-mask: radial-gradient(
      circle,
      transparent 30%,
      #000 33%,
      #000 58%,
      transparent 70%
    );
    mask: radial-gradient(
      circle,
      transparent 30%,
      #000 33%,
      #000 58%,
      transparent 70%
    );
    filter: drop-shadow(0 0 6px #ff7ccf);
    animation: bh-spin 700ms linear infinite;
  }
  /* the event horizon and its photon ring */
  .bh-core {
    width: 52%;
    height: 52%;
    margin: -26% 0 0 -26%;
    border-radius: 50%;
    background: #000;
    box-shadow:
      0 0 0 1.5px #fff,
      0 0 0 4px rgba(255, 209, 236, 0.55),
      0 0 18px 6px rgba(255, 124, 207, 0.8),
      0 0 44px 14px rgba(176, 124, 255, 0.4);
  }
  /* strands of the option, spaghettified, spiralling in */
  > i {
    z-index: 2;
    width: 34px;
    height: 4px;
    margin: -2px 0 0 0;
    border-radius: 3px;
    background: linear-gradient(90deg, #172d45, #ffda55 35%, #fff3b0);
    transform-origin: 0 50%;
    --a: calc(var(--i) * 45deg);
    opacity: 0;
    animation: bh-noodle 900ms cubic-bezier(0.55, 0, 0.8, 0.35) both;
    animation-delay: calc(260ms + var(--i) * 45ms);
  }
  /* what is left of it: a burst of light, then nothing */
  .bh-flash {
    width: 30%;
    height: 30%;
    margin: -15% 0 0 -15%;
    border-radius: 50%;
    background: radial-gradient(circle, #fff, #ffd1ec 40%, transparent 70%);
    opacity: 0;
    animation: bh-flash 420ms ease-out ${RIFT_MS - 420}ms both;
  }

  /* opens, holds while it feeds, swells, collapses to a point */
  @keyframes bh-life {
    0% {
      transform: scale(0);
    }
    14% {
      transform: scale(1.15);
    }
    22%,
    72% {
      transform: scale(1);
    }
    82% {
      transform: scale(1.3);
    }
    90% {
      transform: scale(0.06);
    }
    100% {
      transform: scale(0);
    }
  }
  @keyframes bh-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes bh-breathe {
    to {
      transform: scale(1.12);
      opacity: 0.7;
    }
  }
  @keyframes bh-noodle {
    0% {
      opacity: 0;
      transform: rotate(var(--a)) translateX(46px) scale(0.6, 1.2);
    }
    18% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: rotate(calc(var(--a) + 600deg)) translateX(0) scale(1.8, 0.25);
    }
  }
  @keyframes bh-flash {
    0% {
      opacity: 1;
      transform: scale(0.4);
    }
    100% {
      opacity: 0;
      transform: scale(4);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`
