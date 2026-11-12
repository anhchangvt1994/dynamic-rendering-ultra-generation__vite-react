import styled from 'styled-components'
import { BREAKPOINTS, REGIONS } from './regions.mjs'
import { cabinetCss } from './styles.cabinet'
import { cardsCss } from './styles.cards'
import { stageCss } from './styles.stage'

const { md, lg } = BREAKPOINTS
const { title, booth, quests } = REGIONS

const heights = (k: 'base' | 'md' | 'lg') => `
  --h-title: ${title[k]}px;
  --h-booth: ${booth[k]}px;
  --h-quests: ${quests[k]}px;
`

// One shell for the page and its skeleton: sky, felt, bulbs and a grid whose
// regions have fixed boxes, so loaded content only ever fills them.
export const HubShellStyle = styled.div`
  --night: #0a1230;
  --indigo: #1b1f5e;
  --felt: #0f5d57;
  --felt-dark: #0a403d;
  --paper: #fff4d6;
  --ink: #2b1a3d;
  --gold: #ffcf5a;
  --mint: #5fe3b4;
  --coral: #ff6b8a;
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  --spring: cubic-bezier(0.3, 1.4, 0.4, 1);
  ${heights('base')}
  --gap: 16px;
  --pad: 16px;
  --booth-width: min(100%, 540px);
  --felt-top: calc(
    var(--pad) + 56px + var(--h-title) + var(--gap) + var(--h-booth) - 96px
  );

  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: calc(100dvh - 64px);
  padding: calc(var(--pad) + 56px) var(--pad) 120px;
  color: #fff;
  font-variant-numeric: tabular-nums;
  background:
    radial-gradient(
      ellipse 38% 30% at 12% 58%,
      rgba(25, 192, 164, 0.22),
      transparent 75%
    ),
    radial-gradient(
      ellipse 34% 32% at 88% 50%,
      rgba(79, 116, 255, 0.24),
      transparent 75%
    ),
    radial-gradient(
      ellipse 54% 22% at 50% 88%,
      rgba(14, 113, 100, 0.2),
      transparent 80%
    ),
    radial-gradient(1.5px 1.5px at 12% 22%, #fff9 50%, transparent 51%),
    radial-gradient(1px 1px at 38% 12%, #fff8 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 63% 28%, #fff9 50%, transparent 51%),
    radial-gradient(1px 1px at 84% 14%, #fff8 50%, transparent 51%),
    radial-gradient(1px 1px at 92% 38%, #fff7 50%, transparent 51%),
    radial-gradient(1px 1px at 24% 46%, #fff6 50%, transparent 51%),
    linear-gradient(180deg, var(--night), #171b50 54%, #202665);

  .hub-felt {
    position: absolute;
    inset: var(--felt-top) 0 0;
    z-index: -1;
    background:
      radial-gradient(
        ellipse 44% 90% at 25% 0,
        rgba(95, 227, 180, 0.2),
        transparent 85%
      ),
      radial-gradient(
        ellipse 42% 85% at 76% 0,
        rgba(73, 183, 226, 0.18),
        transparent 82%
      ),
      repeating-linear-gradient(45deg, #ffffff08 0 2px, transparent 2px 4px),
      repeating-linear-gradient(-45deg, #00000012 0 2px, transparent 2px 4px),
      radial-gradient(90% 70% at 50% 0, #11736a, var(--felt-dark));
    border-top: 3px solid #ffffff30;
    box-shadow: 0 -18px 40px #0a123099;
  }
  .hub-felt::after {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 160px;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(95, 227, 180, 0.09), transparent);
  }
  .hub-felt::before {
    content: '';
    position: absolute;
    inset: 8px 0 auto;
    border-top: 2px dashed #ffffff33;
  }

  .hub-grid {
    display: grid;
    gap: var(--gap);
    max-width: 1120px;
    margin-inline: auto;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'title' 'booths' 'quests';
    align-items: start;
  }
  [data-region] {
    position: relative;
    min-width: 0;
  }
  [data-region='title'] {
    grid-area: title;
    height: var(--h-title);
  }
  [data-region='quests'] {
    grid-area: quests;
    height: var(--h-quests);
    border-radius: 20px;
  }
  .hub-carousel {
    grid-area: booths;
    min-width: 0;
  }
  /* phones: center a single booth; keep the snap row for multiple booths */
  .hub-booths {
    display: flex;
    gap: var(--gap);
    margin: -48px -14px -50px;
    padding: 48px 14px 64px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 14px;
    scrollbar-width: none;
  }
  .hub-booths::-webkit-scrollbar {
    display: none;
  }
  .hub-booths > [data-region='booth'] {
    flex: 0 0 calc(100% - 40px);
    scroll-snap-align: center;
  }
  .hub-booths:has(> [data-region='booth']:only-child) > [data-region='booth'] {
    flex-basis: min(100%, 540px);
    scroll-snap-align: center;
  }
  .hub-dots {
    display: flex;
    justify-content: center;
    gap: 4px;
    height: 44px;
  }
  .hub-dot {
    position: relative;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }
  .hub-dot::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 10px;
    height: 10px;
    margin: -5px 0 0 -5px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.35);
    transition:
      transform 200ms var(--spring),
      background 200ms;
  }
  .hub-dot[data-on]::before {
    background: rgba(255, 255, 255, 0.7);
  }
  /* a gold slug rides the track with the scroll position (--p) */
  .hub-dot:first-child::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 28px;
    height: 10px;
    margin: -5px 0 0 -14px;
    border-radius: 6px;
    background: linear-gradient(180deg, #fff2b8, var(--gold));
    box-shadow: 0 0 12px 2px rgba(255, 207, 90, 0.7);
    translate: calc(var(--p, 0) * 48px) 0;
    pointer-events: none;
  }
  .hub-dot:focus-visible {
    outline: 3px solid #fff;
    outline-offset: -6px;
    border-radius: 12px;
  }
  [data-region='booth'] {
    height: var(--h-booth);
    border-radius: 28px;
  }
  .cab {
    width: var(--booth-width);
    margin-inline: auto;
  }

  [data-region='title'] h1 {
    margin: 0 0 8px;
    font-size: clamp(26px, 7.2vw, 44px);
    line-height: 1.12;
    font-weight: 800;
    letter-spacing: -0.02em;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  /* the title as a lit sign */
  .mq-word {
    display: inline-block;
    white-space: nowrap;
  }
  .mq-ch {
    display: inline-block;
    color: #fff4d6;
    text-shadow: 0 0 14px rgba(255, 207, 90, 0.55);
    animation: mq-chase 3.4s ease-in-out infinite;
    animation-delay: calc(var(--i) * -140ms);
  }
  @keyframes mq-chase {
    50% {
      opacity: 0.8;
    }
  }
  @keyframes mq-on {
    from {
      opacity: 0.18;
    }
  }
  &[data-reveal] .mq-ch {
    animation:
      mq-on 0.3s var(--ease) backwards,
      mq-chase 3.4s ease-in-out infinite;
    animation-delay: calc(var(--i) * 55ms + 350ms), calc(var(--i) * -140ms);
  }
  &[data-paused] .mq-ch {
    animation-play-state: paused;
  }
  [data-region='title'] .hub-sub {
    margin: 0;
    max-width: 52ch;
    line-height: 24px;
    max-height: 48px;
    overflow: hidden;
    opacity: 0.82;
  }

  .hub-booth-btn {
    min-height: 48px;
    padding: 0 22px;
    border: 0;
    border-radius: 14px;
    font: inherit;
    font-weight: 800;
    color: var(--ink);
    background: linear-gradient(180deg, #ff9db3, var(--coral));
    cursor: pointer;
  }
  .hub-booth-btn:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }

  .bone {
    --bone: rgba(255, 255, 255, 0.08);
    --shine: rgba(255, 255, 255, 0.17);
  }
  [data-region] > .bone-fill {
    width: 100%;
    height: 100%;
    border-radius: inherit;
  }

  ${cardsCss}
  ${cabinetCss}
  ${stageCss}

  /* Paper lanterns hanging from a scalloped awning; slow wind sway, warm light. */
  .hub-bulbs {
    position: absolute;
    inset: 0 0 auto;
    height: 64px;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .hub-bulbs-eave {
    position: absolute;
    inset: 0 -2% auto;
    height: 12px;
    background:
      radial-gradient(circle at 50% 0, #16275a 0 8px, transparent 9px) 0 0 /
        24px 12px repeat-x,
      linear-gradient(#0d1a45, #16275a) 0 0 / 100% 3px no-repeat;
    filter: drop-shadow(0 2px 3px #02061c88);
    opacity: 0.9;
  }
  .hub-bulbs ol {
    position: relative;
    display: flex;
    justify-content: space-around;
    margin: 0;
    padding: 0 10px;
    list-style: none;
  }
  .hub-bulbs li {
    position: relative;
    flex: 0 0 44px;
    height: 64px;
    transform-origin: 50% 0;
    animation: hub-lamp-sway var(--d, 6s) ease-in-out infinite alternate;
    animation-delay: calc(var(--i) * -1.1s);
  }
  .hub-bulbs li::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 2px;
    width: 1px;
    height: var(--cord);
    background: hsl(var(--hue) 40% 72% / 0.55);
  }
  .hub-lamp {
    position: absolute;
    left: 1px;
    top: calc(var(--cord) + 2px);
    display: grid;
    place-items: center;
    width: 42px;
    height: 50px;
    border-radius: 48% 48% 46% 46% / 42% 42% 58% 58%;
    background:
      repeating-linear-gradient(
        90deg,
        transparent 0 3px,
        hsl(var(--hue) 70% 38% / 0.1) 3px 4px
      ),
      radial-gradient(
        ellipse at 50% 58%,
        hsl(var(--hue) 100% 90%) 0 22%,
        hsl(var(--hue) 96% 68%) 62%,
        hsl(var(--hue) 78% 46%) 100%
      );
    box-shadow:
      inset 0 -5px 7px hsl(var(--hue) 80% 34% / 0.45),
      inset 0 3px 4px #fff6,
      0 0 8px hsl(var(--hue) 100% 62% / 0.4);
  }
  .hub-lamp img {
    position: relative;
    width: 34px;
    height: 34px;
    margin-top: 2px;
    object-fit: contain;
    mix-blend-mode: multiply;
    filter: saturate(1.15) contrast(1.12) brightness(0.9);
    opacity: 0.95;
  }
  /* wooden cap */
  .hub-lamp::before {
    content: '';
    position: absolute;
    left: 12px;
    right: 12px;
    top: -3px;
    height: 4px;
    border-radius: 2px 2px 1px 1px;
    background: linear-gradient(90deg, #4a2c24, #8a5a3c, #4a2c24);
  }
  /* backlight: light bleeds through the print, rim stays shaded */
  .hub-lamp::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background:
      radial-gradient(
        ellipse at 50% 50%,
        hsl(var(--hue) 100% 92% / 0.5) 0 28%,
        transparent 62%
      ),
      radial-gradient(
        ellipse at 50% 50%,
        transparent 52%,
        hsl(var(--hue) 70% 24% / 0.38) 100%
      );
    mix-blend-mode: soft-light;
    pointer-events: none;
  }
  .hub-lamp-halo {
    position: absolute;
    left: -10px;
    top: calc(var(--cord) - 8px);
    width: 64px;
    height: 66px;
    background: radial-gradient(
      closest-side,
      hsl(var(--hue) 100% 64% / 0.42),
      hsl(var(--hue) 100% 60% / 0.14) 60%,
      transparent
    );
    animation: hub-candle-halo var(--fd, 1.7s) linear infinite;
    animation-delay: calc(var(--i) * -0.37s);
  }
  @keyframes hub-lamp-sway {
    from {
      transform: rotate(calc(var(--a) * -1));
    }
    to {
      transform: rotate(var(--a));
    }
  }
  @keyframes hub-candle-halo {
    0%,
    100% {
      opacity: 0.95;
    }
    8% {
      opacity: 0.6;
    }
    14% {
      opacity: 0.88;
    }
    31% {
      opacity: 0.5;
    }
    38% {
      opacity: 0.82;
    }
    55% {
      opacity: 0.74;
    }
    63% {
      opacity: 0.46;
    }
    71% {
      opacity: 1;
    }
    86% {
      opacity: 0.7;
    }
  }
  @keyframes hub-candle-lamp {
    0%,
    100% {
      filter: brightness(1.08);
    }
    8% {
      filter: brightness(0.84);
    }
    14% {
      filter: brightness(1.02);
    }
    31% {
      filter: brightness(0.78);
    }
    38% {
      filter: brightness(0.98);
    }
    55% {
      filter: brightness(0.92);
    }
    63% {
      filter: brightness(0.74);
    }
    71% {
      filter: brightness(1.16);
    }
    86% {
      filter: brightness(0.9);
    }
  }
  .hub-lamp {
    animation: hub-candle-lamp var(--fd, 1.7s) linear infinite;
    animation-delay: calc(var(--i) * -0.37s);
  }
  .hub-lamp img {
    transition:
      opacity 420ms ease,
      transform 420ms ease;
  }
  .hub-lamp img[data-hide] {
    opacity: 0;
    transform: scale(0.82);
  }
  &[data-paused] .hub-bulbs li,
  &[data-paused] .hub-lamp,
  &[data-paused] .hub-lamp-halo {
    animation-play-state: paused;
  }

  /* entrance: once per session, lanterns drop in left to right */
  &[data-reveal] .hub-bulbs li {
    animation:
      hub-lamp-in 0.7s var(--ease) backwards,
      hub-lamp-sway var(--d, 6s) ease-in-out infinite alternate;
    animation-delay: calc(var(--i) * 90ms), calc(var(--i) * -1.1s);
  }
  &[data-reveal] [data-region] {
    animation: hub-rise 0.52s var(--ease) backwards;
    animation-delay: calc(var(--n, 0) * 80ms + 300ms);
  }
  @keyframes hub-lamp-in {
    from {
      opacity: 0;
      translate: 0 -16px;
    }
  }
  @keyframes hub-rise {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
  }

  @media (max-width: 420px) {
    .hub-bulbs li:nth-child(3n) {
      display: none;
    }
    .hub-bulbs li {
      flex-basis: 34px;
    }
    .hub-lamp {
      width: 32px;
      height: 40px;
    }
    .hub-lamp img {
      width: 26px;
      height: 26px;
    }
    .hub-lamp-halo {
      left: -12px;
      width: 56px;
    }
  }

  @media (min-width: ${md}px) {
    ${heights('md')}
    --gap: 20px;
    --pad: 28px;
    --booth-width: min(100%, 500px);
    --felt-top: calc(
      var(--pad) + 56px + var(--h-title) + var(--gap) + var(--h-booth) - 96px
    );
    .hub-booths {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin: -14px;
      padding: 14px;
      overflow: visible;
    }
    .hub-booths > [data-region='booth'] {
      flex: none;
    }
    .hub-dots {
      display: none;
    }
  }
  @media (min-width: ${lg}px) {
    ${heights('lg')}
    --gap: 32px;
    --pad: 40px;
    --booth-width: min(100%, 520px);
    --felt-top: calc(
      var(--pad) + 56px + var(--h-title) + var(--gap) + var(--h-booth) - 96px
    );
  }

  @media (prefers-reduced-motion: reduce) {
    .hub-bulbs li,
    .hub-lamp-halo,
    .hub-lamp,
    .hub-lamp img,
    .mq-ch,
    &[data-reveal] .mq-ch,
    &[data-reveal] .hub-bulbs li,
    &[data-reveal] [data-region] {
      animation: none;
    }
  }
`
