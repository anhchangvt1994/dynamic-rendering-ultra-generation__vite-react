import { css } from 'styled-components'

// The Poké Ball the real pages show while an artwork loads (PokemonPage
// styles): the skeleton uses the same one, so it keeps shaking across the
// hand-over instead of turning into something else.
const POKE_BALL = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23f4f4f4' stroke='%23222' stroke-width='6'/%3E%3Cpath d='M4 50a46 46 0 0 1 92 0z' fill='%23e3350d' stroke='%23222' stroke-width='6'/%3E%3Cpath d='M4 50h92' stroke='%23222' stroke-width='6'/%3E%3Ccircle cx='50' cy='50' r='13' fill='%23f4f4f4' stroke='%23222' stroke-width='6'/%3E%3Ccircle cx='50' cy='50' r='5' fill='%23fff' stroke='%23222' stroke-width='3'/%3E%3C/svg%3E")`

/**
 * Shared skeleton pieces.
 * - `.bone`: a block the size of the content it stands for, with one soft
 *   sweep of light. Light pages use the default tone; dark surfaces set
 *   `data-tone="dark"` on the skeleton root or on any block inside it.
 * - `.catch-ball`: the in-game catch shake, where a Pokémon will appear.
 *   `--i` staggers a row of them into a wave.
 * - `.dex`: a "#0000" Pokédex number (see DexNumber).
 */
export const boneCss = css`
  .bone {
    --bone: #e3e9f0;
    --shine: #f5f8fb;
    display: block;
    flex: none;
    border-radius: 8px;
    background: linear-gradient(
        100deg,
        var(--bone) 35%,
        var(--shine) 50%,
        var(--bone) 65%
      )
      var(--bone);
    background-size: 300% 100%;
    animation: bone-sweep 1.6s ease-in-out infinite;
  }
  &[data-tone='dark'] .bone,
  [data-tone='dark'] .bone {
    --bone: rgba(255, 255, 255, 0.08);
    --shine: rgba(255, 255, 255, 0.17);
  }
  .bone--round {
    border-radius: 50%;
  }
  .bone--pill {
    border-radius: 999px;
  }

  .catch-ball {
    display: block;
    flex: none;
    aspect-ratio: 1;
    background: ${POKE_BALL} center / contain no-repeat;
    filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.22));
    animation: skeleton-catch 1.6s ease-in-out infinite;
    animation-delay: calc(var(--i, 0) * 140ms);
  }

  .dex {
    white-space: nowrap;
  }
  /* a rolling digit: a counter drawn as text, stepped 0-9 by dex-count */
  .dex-digit {
    counter-reset: dex-digit 0;
    animation: dex-count var(--roll, 0s) linear infinite;
  }
  .dex-digit::before {
    content: counter(dex-digit);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @keyframes bone-sweep {
    from {
      background-position: 100% 0;
    }
    to {
      background-position: 0 0;
    }
  }
  @keyframes skeleton-catch {
    0%,
    45%,
    100% {
      rotate: 0deg;
    }
    55% {
      rotate: -16deg;
    }
    65% {
      rotate: 12deg;
    }
    75% {
      rotate: -6deg;
    }
    85% {
      rotate: 0deg;
    }
  }
  @keyframes dex-count {
    0% {
      counter-reset: dex-digit 0;
    }
    10% {
      counter-reset: dex-digit 1;
    }
    20% {
      counter-reset: dex-digit 2;
    }
    30% {
      counter-reset: dex-digit 3;
    }
    40% {
      counter-reset: dex-digit 4;
    }
    50% {
      counter-reset: dex-digit 5;
    }
    60% {
      counter-reset: dex-digit 6;
    }
    70% {
      counter-reset: dex-digit 7;
    }
    80% {
      counter-reset: dex-digit 8;
    }
    90% {
      counter-reset: dex-digit 9;
    }
    100% {
      counter-reset: dex-digit 9;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bone,
    .catch-ball,
    .dex-digit {
      animation: none;
    }
  }
`
