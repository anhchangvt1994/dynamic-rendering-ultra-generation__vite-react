import { css } from 'styled-components'

// motion of a round: combo chip, particles, glow, shake. Reduced motion
// turns the movement off and keeps the information.
export const playCss = css`
  .mg-stage {
    isolation: isolate;
  }
  .mg-backdrop-art {
    position: absolute;
    inset: -8%;
    z-index: -1;
    background-size: cover;
    background-position: center;
    opacity: 0.08;
    filter: blur(2px);
    pointer-events: none;
  }
  .mg-stage[data-tier='2'],
  .mg-stage[data-tier='3'] {
    box-shadow:
      0 0 22px var(--glow),
      inset 0 0 18px var(--glow);
  }
  .mg-stage[data-tier='3'] {
    animation: mg-pulse 1.4s ease-in-out infinite;
  }
  @keyframes mg-pulse {
    50% {
      box-shadow:
        0 0 34px var(--glow),
        inset 0 0 26px var(--glow);
    }
  }
  .mg-combo {
    position: absolute;
    left: 14px;
    top: -34px;
    z-index: 3;
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--accent);
    color: var(--deep);
    font-variant-numeric: tabular-nums;
    animation: mg-chip-in 220ms cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .mg-combo b {
    font-size: 18px;
  }
  .mg-combo span {
    font-size: 12px;
    font-weight: 600;
  }
  .mg-combo[data-tier='3'] {
    box-shadow: 0 0 16px var(--glow);
  }
  .mg-combo[data-fade] {
    opacity: 0;
    transition: opacity 450ms ease;
  }
  @keyframes mg-chip-in {
    from {
      transform: scale(0.6);
    }
  }
  .mg-burst {
    position: absolute;
    z-index: 4;
    width: 0;
    height: 0;
    pointer-events: none;
  }
  .mg-burst i {
    position: absolute;
    left: -3px;
    top: -3px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: mg-spark 700ms ease-out forwards;
  }
  @keyframes mg-spark {
    to {
      transform: translate(var(--dx), var(--dy)) scale(0.2);
      opacity: 0;
    }
  }
  .mg-card[data-miss] {
    animation: mg-shake 180ms ease;
  }
  @keyframes mg-shake {
    25% {
      transform: translateX(-4px);
    }
    75% {
      transform: translateX(4px);
    }
  }
  .mg-chest {
    display: grid;
    justify-items: center;
    width: 100%;
  }
  .mg-chest-box {
    display: inline-block;
    animation: mg-wobble 900ms ease-in-out infinite;
  }
  @keyframes mg-wobble {
    25% {
      transform: rotate(-12deg);
    }
    75% {
      transform: rotate(12deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .mg-chest-box,
    .mg-chip.mg-fly {
      animation: none;
    }
    .mg-stage[data-tier='3'],
    .mg-combo,
    .mg-card[data-miss],
    .mg-mate[data-mood='cheer'] {
      animation: none;
    }
    .mg-flip {
      transition: none;
    }
    .mg-combo[data-fade] {
      transition: none;
    }
  }
`
