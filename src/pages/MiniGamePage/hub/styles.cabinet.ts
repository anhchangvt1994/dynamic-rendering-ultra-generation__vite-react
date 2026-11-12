import { css } from 'styled-components'

// Arcade cabinets: body with a neon edge in the game's hue (--hue), a self-playing screen,
// a decorative deck and a coin slot. Transform/opacity only on animated parts.
export const cabinetCss = css`
  [data-region='booth'] {
    --sx: 50%;
    --sy: 30%;
    --jx: 0deg;
    --jy: 0deg;
  }
  .cab {
    position: relative;
    display: grid;
    grid-template-rows: 36px minmax(0, 1fr) 44px 40px 28px 48px;
    gap: 8px;
    height: 100%;
    padding: 12px 14px 14px;
    border-radius: 28px 28px 20px 20px;
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.045), transparent 12% 88%, rgba(0, 0, 0, 0.22)),
      linear-gradient(170deg, #302568, #17123d 70%);
    box-shadow:
      inset 0 0 0 2px color-mix(in srgb, var(--hue) 82%, transparent),
      inset 0 0 24px color-mix(in srgb, var(--hue) 28%, transparent),
      0 0 34px color-mix(in srgb, var(--hue) 36%, transparent),
      0 22px 34px rgba(2, 20, 20, 0.56);
    transition: box-shadow 260ms var(--ease), translate 260ms var(--ease);
  }
  .cab::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background: radial-gradient(circle at var(--sx) var(--sy), rgba(255, 255, 255, 0.16), transparent 45%);
    opacity: 0;
    transition: opacity 200ms var(--ease);
  }
  [data-region='booth'][data-lit] .cab::after,
  [data-region='booth']:focus-within .cab::after {
    opacity: 1;
  }
  [data-region='booth']:hover .cab,
  [data-region='booth']:focus-within .cab {
    translate: 0 -4px;
  }
  .cab > * {
    min-width: 0;
    min-height: 0;
  }
  .cab-cap {
    position: relative;
    display: grid;
    place-items: center;
    border-radius: 14px 14px 6px 6px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.5), transparent 38%),
      linear-gradient(180deg, color-mix(in srgb, var(--hue) 80%, #fff), var(--hue));
    color: var(--ink);
    box-shadow:
      0 0 20px color-mix(in srgb, var(--hue) 58%, transparent),
      inset 0 -3px 0 rgba(0, 0, 0, 0.18);
  }
  .cab-cap::before,
  .cab-cap::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #fff8cf;
    box-shadow: 0 0 10px #fff4a6;
    transform: translateY(-50%);
  }
  .cab-cap::before { left: 10px; }
  .cab-cap::after { right: 10px; }
  .cab-cap h2 {
    margin: 0;
    padding: 0 10px;
    max-width: 100%;
    font-size: 19px;
    line-height: 36px;
    font-weight: 800;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cab-screen {
    position: relative;
    display: grid;
    place-items: center;
    border-radius: 14px;
    background: #070b22;
    box-shadow: inset 0 0 0 3px #000, inset 0 0 22px rgba(0, 0, 0, 0.8);
    overflow: hidden;
  }
  .cab-glare {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(125deg, rgba(255, 255, 255, 0.12), transparent 35%);
  }
  .cab-ready {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 20px;
    color: var(--gold);
    background: rgba(7, 11, 34, 0.86);
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms;
  }
  [data-phase='insert'] .cab-ready {
    opacity: 1;
  }
  .cab-deck {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 10px;
    border-radius: 12px;
    background: linear-gradient(180deg, #ffffff15, #06081b66);
    box-shadow: inset 0 1px 0 #ffffff24, inset 0 -2px 0 #0005;
  }
  .cab-stick {
    position: relative;
    width: 8px;
    height: 26px;
    border-radius: 4px;
    background: #cfd3ff;
    transform-origin: 50% 100%;
    transform: rotate(var(--jx)) rotateX(var(--jy));
    transition: transform 160ms var(--ease);
  }
  .cab-stick::before {
    content: '';
    position: absolute;
    left: 50%;
    top: -9px;
    width: 18px;
    height: 18px;
    margin-left: -9px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff, var(--hue) 60%);
  }
  .cab-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff8, var(--gold) 70%);
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.4);
    transition: transform 120ms;
  }
  .cab-btn:nth-of-type(2) {
    background: radial-gradient(circle at 35% 30%, #fff8, var(--mint) 70%);
  }
  [data-region='booth']:active .cab-btn {
    transform: translateY(3px);
  }
  .cab-slot {
    position: relative;
    display: block;
    width: 54px;
    height: 10px;
    margin-left: auto;
    border-radius: 5px;
    background: #000;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.25);
    overflow: hidden;
  }
  .cab-stub {
    position: absolute;
    left: 6px;
    right: 6px;
    top: -14px;
    height: 12px;
    border-radius: 3px;
    background: var(--paper);
    opacity: 0;
  }
  [data-phase='insert'] .cab-stub {
    animation: cab-in 260ms var(--ease) both;
  }
  [data-phase='blink'] .cab-slot {
    animation: cab-blink 180ms steps(1) 3;
  }
  @keyframes cab-in {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 1;
      transform: translateY(16px);
    }
  }
  @keyframes cab-blink {
    50% {
      background: var(--coral);
      box-shadow: 0 0 0 2px var(--coral), 0 0 14px var(--coral);
    }
  }
  .cab-rule {
    margin: 0;
    font-size: 13.5px;
    line-height: 20px;
    opacity: 0.88;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  /* candy screen */
  .cs {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 4px;
    width: 100%;
    height: 100%;
    padding: 6px;
  }
  .cs-hud {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    line-height: 14px;
    color: #cfd3ff;
  }
  .cs-hud b {
    color: var(--gold);
    animation: cs-pop 320ms var(--spring);
  }
  .cs-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    grid-template-rows: repeat(7, 1fr);
    justify-self: center;
    height: 100%;
    aspect-ratio: 6 / 7;
    max-width: 100%;
    min-height: 0;
  }
  .cs-cell {
    display: grid;
    place-items: center;
    min-width: 0;
    min-height: 0;
  }
  .cs-cell img {
    width: 92%;
    height: 92%;
    object-fit: contain;
  }
  .cs-cell[data-new] img {
    animation: cs-drop 520ms var(--spring) both;
  }
  .cs-cell[data-swap] img {
    animation: cs-pop 420ms var(--spring) both;
  }
  @keyframes cs-drop {
    from {
      opacity: 0;
      transform: translateY(-70%) scale(0.7);
    }
  }
  @keyframes cs-pop {
    40% {
      transform: scale(1.25);
    }
  }

  /* memory screen */
  .ms {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 6px;
    justify-self: center;
    height: 100%;
    aspect-ratio: 3 / 4;
    max-width: 100%;
    padding: 8px;
  }
  .ms-card {
    position: relative;
    display: block;
    min-width: 0;
    min-height: 0;
    perspective: 400px;
  }
  .ms-in {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
    transition: transform 320ms var(--ease);
  }
  .ms-card[data-up] .ms-in {
    transform: rotateY(180deg);
  }
  .ms-back,
  .ms-face {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    border-radius: 6px;
    backface-visibility: hidden;
  }
  .ms-back {
    background: repeating-linear-gradient(45deg, var(--hue) 0 4px, color-mix(in srgb, var(--hue) 60%, #000) 4px 8px);
    box-shadow: inset 0 0 0 2px #fff6;
  }
  .ms-face {
    transform: rotateY(180deg);
    background: var(--paper);
  }
  .ms-card[data-match] .ms-face {
    box-shadow: 0 0 10px var(--gold);
  }
  .ms-face img {
    width: 86%;
    height: 86%;
    object-fit: contain;
  }

  /* power-on: once per session */
  &[data-reveal] .cab-screen {
    animation: cab-on 300ms steps(4) backwards;
    animation-delay: calc(var(--n, 2) * 80ms + 500ms);
  }
  @keyframes cab-on {
    0% {
      opacity: 0;
    }
    35% {
      opacity: 0.9;
    }
    55% {
      opacity: 0.2;
    }
  }

  @media (min-width: 640px) {
    .cab {
      padding: 18px 24px 22px;
      grid-template-rows: 48px minmax(0, 1fr) 54px 40px 28px 48px;
      border-radius: 34px 34px 24px 24px;
      box-shadow:
        inset 0 0 0 2px color-mix(in srgb, var(--hue) 82%, transparent),
        inset 0 0 28px color-mix(in srgb, var(--hue) 30%, transparent),
        0 0 44px color-mix(in srgb, var(--hue) 42%, transparent),
        0 28px 42px rgba(2, 20, 20, 0.58);
    }
    .cab-cap {
      border-radius: 18px 18px 8px 8px;
    }
    .cab-cap h2 {
      font-size: 21px;
      line-height: 40px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .cab,
    .cab::after,
    .cab-stick,
    .ms-in {
      transition: none;
    }
    [data-region='booth']:hover .cab,
    [data-region='booth']:focus-within .cab {
      translate: none;
    }
    .cs-hud b,
    .cs-cell img,
    &[data-reveal] .cab-screen,
    [data-phase] .cab-stub,
    [data-phase] .cab-slot {
      animation: none;
    }
    .cab::after {
      display: none;
    }
  }
`
