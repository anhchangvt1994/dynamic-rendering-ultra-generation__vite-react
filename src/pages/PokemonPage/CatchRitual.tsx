import { useEffect } from 'react'
import styled from 'styled-components'

/*
 * The catch, as in the games: a Poké Ball arcs up onto the stage, opens in a
 * flash while the Pokémon is drawn in (the stage handles that via
 * data-catching), drops, wobbles three times, clicks shut and throws stars.
 * ~2.4s, then it removes itself. Skipped entirely with reduced motion.
 */
const DURATION = 2400

const RitualStyle = styled.div`
  position: absolute;
  inset: 0;
  z-index: 6;
  pointer-events: none;

  .ball {
    position: absolute;
    left: 50%;
    top: 46%;
    width: 46px;
    height: 46px;
    margin: -23px 0 0 -23px;
    animation:
      ritual-throw 620ms cubic-bezier(0.3, 0.6, 0.4, 1) both,
      ritual-drop 260ms cubic-bezier(0.5, 0, 0.75, 0) 900ms both,
      ritual-wobble 900ms ease-in-out 1160ms both;
    transform-origin: 50% 90%;
    filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.45));
  }
  .flash {
    position: absolute;
    left: 50%;
    top: 46%;
    width: 220px;
    height: 220px;
    margin: -110px 0 0 -110px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      #fff 0,
      rgba(255, 240, 200, 0.85) 30%,
      transparent 70%
    );
    opacity: 0;
    animation: ritual-flash 520ms ease-out 560ms both;
  }
  .stars {
    position: absolute;
    left: 50%;
    top: calc(46% + 70px);
  }
  .stars i {
    position: absolute;
    width: 16px;
    height: 16px;
    margin: -8px;
    background: #ffda55;
    clip-path: polygon(
      50% 0,
      61% 39%,
      100% 50%,
      61% 61%,
      50% 100%,
      39% 61%,
      0 50%,
      39% 39%
    );
    opacity: 0;
    animation: ritual-star 700ms cubic-bezier(0.16, 1, 0.3, 1) 2060ms both;
    transform: rotate(var(--a)) translateY(0);
  }

  @keyframes ritual-throw {
    0% {
      transform: translate(0, 260px) scale(0.6) rotate(-360deg);
      opacity: 0;
    }
    15% {
      opacity: 1;
    }
    100% {
      transform: translate(0, 0) scale(1) rotate(0);
      opacity: 1;
    }
  }
  @keyframes ritual-drop {
    to {
      translate: 0 70px;
    }
  }
  @keyframes ritual-wobble {
    0%,
    100% {
      rotate: 0deg;
      translate: 0 70px;
    }
    15% {
      rotate: -24deg;
      translate: 0 70px;
    }
    30% {
      rotate: 18deg;
      translate: 0 70px;
    }
    45% {
      rotate: -14deg;
      translate: 0 70px;
    }
    60% {
      rotate: 10deg;
      translate: 0 70px;
    }
    75% {
      rotate: -4deg;
      translate: 0 70px;
    }
  }
  @keyframes ritual-flash {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    35% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: scale(1.4);
    }
  }
  @keyframes ritual-star {
    0% {
      opacity: 0;
      transform: rotate(var(--a)) translateY(0) scale(0.4);
    }
    30% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: rotate(var(--a)) translateY(-54px) scale(1);
    }
  }
`

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function CatchRitual({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, DURATION)
    return () => window.clearTimeout(timer)
  }, [onDone])

  return (
    <RitualStyle aria-hidden="true">
      <span className="flash" />
      <svg className="ball" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="10.5"
          fill="#f4f4f4"
          stroke="#1b1b1b"
          strokeWidth="1.6"
        />
        <path
          d="M1.5 12a10.5 10.5 0 0 1 21 0z"
          fill="#e3350d"
          stroke="#1b1b1b"
          strokeWidth="1.6"
        />
        <path d="M1.5 12h21" stroke="#1b1b1b" strokeWidth="1.6" />
        <circle
          cx="12"
          cy="12"
          r="3.4"
          fill="#f4f4f4"
          stroke="#1b1b1b"
          strokeWidth="1.6"
        />
        <circle cx="12" cy="12" r="1.4" fill="#fff" />
      </svg>
      <span className="stars">
        {[0, 72, 144, 216, 288].map((angle) => (
          <i key={angle} style={{ ['--a' as string]: `${angle}deg` }} />
        ))}
      </span>
    </RitualStyle>
  )
}
