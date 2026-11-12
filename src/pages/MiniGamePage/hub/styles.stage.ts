import { css } from 'styled-components'

// The arcade as a stage: a portal behind the cabinets, light cones from the
// ceiling, a scrolling floor grid, cabinets set at different depths with neon
// rails, a CRT scan, blinking marquee bulbs and a sheen on the play button.
// Region boxes never change: tilt and depth use rotate/scale/translate only,
// and every effect is absolutely positioned. Phones keep the in-box effects.
export const stageCss = css`
  /* ceiling light cones */
  &::before {
    content: '';
    position: absolute;
    inset: 0 -10% auto;
    height: 78%;
    z-index: -1;
    pointer-events: none;
    background:
      conic-gradient(from 198deg at 16% -8%, transparent 0, rgba(95, 227, 180, 0.3) 7deg, transparent 17deg),
      conic-gradient(from 164deg at 84% -8%, transparent 0, rgba(98, 140, 255, 0.34) 7deg, transparent 17deg),
      conic-gradient(from 178deg at 50% -14%, transparent 0, rgba(255, 207, 90, 0.16) 5deg, transparent 12deg);
    animation: stage-sweep 9s ease-in-out infinite alternate;
  }
  @keyframes stage-sweep {
    from {
      transform: translateX(-3%);
      opacity: 0.75;
    }
    to {
      transform: translateX(3%);
      opacity: 1;
    }
  }

  /* floor: a perspective grid that rolls toward the player */
  .hub-felt {
    overflow: hidden;
  }
  .hub-felt::after {
    inset: 0 -20% auto;
    height: 220%;
    background:
      repeating-linear-gradient(90deg, rgba(95, 227, 180, 0.38) 0 1px, transparent 1px 72px),
      repeating-linear-gradient(0deg, rgba(95, 227, 180, 0.32) 0 1px, transparent 1px 56px);
    -webkit-mask-image: linear-gradient(180deg, #000, transparent 70%);
    mask-image: linear-gradient(180deg, #000, transparent 70%);
    transform-origin: 50% 0;
    transform: perspective(520px) rotateX(62deg);
    animation: stage-floor 2.8s linear infinite;
  }
  @keyframes stage-floor {
    to {
      transform: perspective(520px) rotateX(62deg) translateY(56px);
    }
  }

  /* portal behind the cabinets (md+): two counter-rotating rings and a glow */
  .hub-carousel {
    position: relative;
  }
  .hub-carousel::before,
  .hub-carousel::after {
    content: '';
    display: none;
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: -1;
    border-radius: 50%;
    pointer-events: none;
    translate: -50% -50%;
  }
  .hub-carousel::before {
    width: min(1040px, 94vw);
    aspect-ratio: 1;
    background:
      radial-gradient(closest-side, rgba(95, 227, 180, 0.2), rgba(79, 116, 255, 0.1) 60%, transparent 72%),
      conic-gradient(from 0deg, transparent, #5fe3b4 10%, transparent 26%, #ff6b8a 50%, transparent 66%, #628cff 82%, transparent);
    -webkit-mask: radial-gradient(closest-side, #000 0 66%, transparent 66.5% 69%, #000 69.5% 71%, transparent 71.5%);
    mask: radial-gradient(closest-side, #000 0 66%, transparent 66.5% 69%, #000 69.5% 71%, transparent 71.5%);
    filter: drop-shadow(0 0 14px rgba(95, 227, 180, 0.7));
    opacity: 0.8;
    animation: stage-spin 18s linear infinite;
  }
  .hub-carousel::after {
    width: min(820px, 76vw);
    aspect-ratio: 1;
    background: repeating-conic-gradient(from 0deg, #ffcf5a 0 2.2deg, transparent 2.2deg 9deg);
    -webkit-mask: radial-gradient(closest-side, transparent 0 94%, #000 94.5% 100%);
    mask: radial-gradient(closest-side, transparent 0 94%, #000 94.5% 100%);
    opacity: 0.5;
    animation: stage-spin 30s linear infinite reverse;
  }
  @keyframes stage-spin {
    to {
      rotate: 360deg;
    }
  }

  /* neon rails down the cabinet flanks */
  .cab::before {
    content: '';
    position: absolute;
    top: 96px;
    bottom: 120px;
    left: -3px;
    right: -3px;
    border-inline: 3px solid var(--hue);
    filter: drop-shadow(0 0 7px var(--hue));
    pointer-events: none;
    animation: stage-pulse 2.4s ease-in-out infinite alternate;
    animation-delay: calc(var(--n, 2) * -420ms);
  }
  @keyframes stage-pulse {
    from {
      opacity: 0.45;
    }
    to {
      opacity: 1;
    }
  }

  /* marquee bulbs on the cap blink out of step */
  .cab-cap::before,
  .cab-cap::after {
    animation: stage-blink 1.1s steps(1) infinite;
  }
  .cab-cap::after {
    animation-delay: -550ms;
  }
  @keyframes stage-blink {
    50% {
      opacity: 0.25;
      box-shadow: none;
    }
  }

  /* CRT: scanlines and a slow bright bar */
  .cab-screen::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0 1px, transparent 1px 3px);
    mix-blend-mode: multiply;
  }
  .cab-glare::after {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 26%;
    background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    animation: stage-scan 4.6s linear infinite;
    animation-delay: calc(var(--n, 2) * -1100ms);
  }
  @keyframes stage-scan {
    from {
      transform: translateY(-110%);
    }
    to {
      transform: translateY(420%);
    }
  }

  /* play button: a sheen sweeps across it */
  .hub-booth-btn {
    position: relative;
    overflow: hidden;
    transition: scale 160ms var(--ease), box-shadow 200ms;
    box-shadow: 0 0 0 0 transparent, 0 6px 0 rgba(120, 20, 50, 0.45);
  }
  .hub-booth-btn::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 36%;
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.7), transparent);
    translate: -140% 0;
    animation: stage-sheen 3.4s ease-in-out infinite;
    animation-delay: calc(var(--n, 2) * -900ms);
    pointer-events: none;
  }
  .hub-booth-btn:disabled::after {
    display: none;
  }
  @keyframes stage-sheen {
    0%,
    55% {
      translate: -140% 0;
    }
    100% {
      translate: 380% 0;
    }
  }
  [data-region='booth']:hover .hub-booth-btn:not(:disabled) {
    box-shadow: 0 0 22px var(--hue), 0 6px 0 rgba(120, 20, 50, 0.45);
  }
  .hub-booth-btn:active {
    scale: 0.97;
  }

  /* phones: the swipe drives the stage. Cabinets swing on a hinge, shrink and dim as they leave
     the centre; the portal ring turns with the scroll (--p) instead of on a timer. */
  @media (max-width: 639px) {
    .hub-booths > [data-region='booth'] {
      transform-origin: 50% 62%;
      transform: perspective(760px) rotateY(calc(var(--o, 0) * -26deg));
      scale: calc(1 - var(--a, 0) * 0.1);
      translate: 0 calc(var(--a, 0) * 18px);
      opacity: calc(1 - var(--a, 0) * 0.35);
      will-change: transform, opacity;
    }
    .hub-carousel::before {
      display: block;
      width: min(640px, 190vw);
      top: 44%;
      opacity: 0.55;
      animation: none;
      rotate: calc(var(--p, 0) * 150deg);
    }
  }

  @media (min-width: 640px) {
    .hub-carousel::before,
    .hub-carousel::after {
      display: block;
    }

    /* two cabinets at different depths: one leans forward, one stands back */
    [data-region='booth'] {
      transition:
        rotate 360ms var(--spring),
        scale 360ms var(--spring);
      box-shadow: 0 0 110px 26px color-mix(in srgb, var(--hue) 20%, transparent);
    }
    .hub-booths > [data-region='booth']:nth-child(odd) {
      rotate: -1.6deg;
      scale: 1.02;
      translate: 0 -8px;
      z-index: 2;
    }
    .hub-booths > [data-region='booth']:nth-child(even) {
      rotate: 1.6deg;
      scale: 0.965;
      translate: 0 22px;
    }
    .hub-booths > [data-region='booth']:hover,
    .hub-booths > [data-region='booth']:focus-within {
      rotate: 0deg;
      scale: 1.035;
      z-index: 3;
    }

    /* sparks drifting up the flanks */
    [data-region='booth']::after {
      content: '';
      position: absolute;
      inset: -40px -26px;
      pointer-events: none;
      z-index: -1;
      background:
        radial-gradient(3px 3px at 3% 78%, var(--hue) 50%, transparent 55%),
        radial-gradient(2px 2px at 97% 62%, #fff 50%, transparent 55%),
        radial-gradient(3px 3px at 5% 36%, #fff4a6 50%, transparent 55%),
        radial-gradient(2px 2px at 95% 24%, var(--hue) 50%, transparent 55%),
        radial-gradient(2px 2px at 2% 12%, #fff 50%, transparent 55%),
        radial-gradient(3px 3px at 98% 88%, #fff4a6 50%, transparent 55%);
      animation: stage-rise 5.2s linear infinite;
      animation-delay: calc(var(--n, 2) * -1300ms);
    }
    @keyframes stage-rise {
      0% {
        transform: translateY(26px);
        opacity: 0;
      }
      25% {
        opacity: 1;
      }
      100% {
        transform: translateY(-44px);
        opacity: 0;
      }
    }
  }

  &[data-paused] {
    &::before,
    .hub-felt::after,
    .hub-carousel::before,
    .hub-carousel::after,
    .cab::before,
    .cab-cap::before,
    .cab-cap::after,
    .cab-glare::after,
    .hub-booth-btn::after,
    [data-region='booth']::after {
      animation-play-state: paused;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &::before,
    .hub-felt::after,
    .hub-carousel::before,
    .hub-carousel::after,
    .cab::before,
    .cab-cap::before,
    .cab-cap::after,
    .cab-glare::after,
    .hub-booth-btn::after,
    [data-region='booth']::after {
      animation: none;
    }
    .hub-booths > [data-region='booth'] {
      transition: none;
    }
    @media (max-width: 639px) {
      .hub-booths > [data-region='booth'] {
        transform: none;
        scale: 1;
        translate: none;
        opacity: 1;
        will-change: auto;
      }
      .hub-carousel::before {
        rotate: none;
      }
    }
    .hub-booths > [data-region='booth']:hover,
    .hub-booths > [data-region='booth']:focus-within {
      scale: 1;
    }
  }
`
