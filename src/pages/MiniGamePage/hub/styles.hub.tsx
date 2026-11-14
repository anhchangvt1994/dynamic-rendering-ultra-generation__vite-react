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
  /* Phones: centered layered slides. Neighbor cards remain visible behind the active card. */
  .hub-booths {
    display: flex;
    gap: 0;
    margin: -48px -14px -50px;
    padding: 48px max(0px, calc((100% - 540px) / 2)) 64px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 0;
    scrollbar-width: none;
  }
  .hub-booths::-webkit-scrollbar {
    display: none;
  }
  @media (max-width: ${md - 1}px) {
    .hub-booths::after {
      content: '';
      flex: 0 0 clamp(167px, calc((100vw - 375px) + 167px), 250px);
    }
  }
  @media (max-width: ${md - 1}px) {
    .hub-booths > [data-region='booth'] {
      flex: 0 0 calc(100% - 72px);
      margin-left: 36px;
      margin-right: -126px;
      scroll-snap-align: center;
      transform: translateY(calc(min(var(--a, 1), 1) * 14px)) scale(calc(1 - min(var(--a, 1), 1) * 0.12));
      opacity: calc(1 - min(var(--a, 1), 1) * 0.72);
      filter: brightness(calc(1 - min(var(--a, 1), 1) * 0.24));
      z-index: calc(10 - round(abs(var(--o, 0))));
      transition: transform 220ms ease-out, opacity 220ms ease-out;
      transform-style: preserve-3d;
    }
    .hub-booths > [data-region='booth']:only-child {
      flex-basis: min(100%, 540px);
      margin-inline: auto;
    }
  }
  .hub-dots {
    display: flex;
    justify-content: center;
    gap: 4px;
    height: 44px;
  }
  @media (prefers-reduced-motion: reduce) { .cab-pokemon-preview img,.cab-pokemon-preview i { animation:none; } }
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

  /* Festival light string: glass orbs with Pokémon on three glowing swags,
     a colour chase running along the wire and an aurora ribbon above. */
  .hub-bulbs {
    --sag: 34px;
    --orb: 44px;
    position: absolute;
    inset: 0 0 auto;
    height: calc(var(--sag) + var(--orb) + 34px);
    z-index: 0;
    overflow: visible;
    pointer-events: none;
  }
  .hub-aurora {
    position: absolute;
    inset: -30px -10% auto;
    height: 130px;
    background:
      radial-gradient(40% 60% at 15% 30%, hsl(330 100% 62% / 0.55), transparent),
      radial-gradient(38% 55% at 50% 20%, hsl(170 100% 55% / 0.5), transparent),
      radial-gradient(40% 60% at 85% 30%, hsl(265 100% 66% / 0.55), transparent);
    filter: blur(18px);
    mix-blend-mode: screen;
    animation: hub-aurora 14s ease-in-out infinite alternate;
  }
  .hub-rail {
    position: absolute;
    inset: 0 0 auto;
    height: 5px;
    background: linear-gradient(90deg, #5a3a1e, #ffd36a 20%, #fff2b8 50%, #ffd36a 80%, #5a3a1e);
    box-shadow: 0 2px 10px #ffcf5a99, 0 6px 22px #ffcf5a44;
    opacity: 0.9;
  }
  .hub-wire {
    position: absolute;
    left: 0;
    top: 3px;
    width: 100%;
    height: calc(var(--sag) + 2px);
    overflow: visible;
  }
  .hub-wire path {
    fill: none;
    stroke-linecap: round;
  }
  .hub-wire-base {
    stroke: #ffe9b8;
    stroke-opacity: 0.55;
    stroke-width: 1.4;
    filter: drop-shadow(0 0 3px #ffd36a);
  }
  .hub-wire-run {
    stroke: #fff;
    stroke-width: 3.2;
    stroke-dasharray: 2 18;
    filter: drop-shadow(0 0 4px #ff9de2) drop-shadow(0 0 8px #7ff5ff);
    animation:
      hub-wire-run 1.6s linear infinite,
      hub-wire-hue 6s linear infinite;
  }
  .hub-bulbs ol {
    position: absolute;
    inset: 3px 0 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .hub-bulbs li {
    position: absolute;
    left: var(--x);
    top: calc(var(--t) * var(--sag));
    width: 0;
    height: 0;
  }
  .hub-swing {
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    transform-origin: 0 0;
    animation: hub-orb-sway var(--d, 6s) ease-in-out infinite alternate;
    animation-delay: calc(var(--i) * -1.3s);
  }
  .hub-orb-cord {
    position: absolute;
    left: 0;
    top: 0;
    width: 1px;
    height: calc(var(--cord) + 2px);
    background: hsl(var(--hue) 70% 85% / 0.8);
  }
  .hub-orb {
    position: absolute;
    left: calc(var(--orb) / -2);
    top: var(--cord);
    display: grid;
    place-items: center;
    width: var(--orb);
    height: var(--orb);
    border-radius: 50%;
    background:
      radial-gradient(circle at 50% 55%, hsl(var(--hue) 100% 96%) 0 24%, hsl(var(--hue) 100% 72%) 66%, hsl(var(--hue) 90% 48%));
    box-shadow:
      inset 0 -6px 9px hsl(var(--hue) 90% 36% / 0.55),
      inset 0 0 0 1.5px hsl(var(--hue) 100% 90% / 0.8),
      0 0 12px hsl(var(--hue) 100% 62% / 0.85),
      0 0 26px hsl(var(--hue) 100% 60% / 0.5);
    animation: hub-orb-pulse 3.6s ease-in-out infinite;
    animation-delay: calc(var(--i) * -0.24s);
  }
  /* glass gloss */
  .hub-orb::after {
    content: '';
    position: absolute;
    left: 17%;
    top: 9%;
    width: 36%;
    height: 24%;
    border-radius: 50%;
    background: linear-gradient(180deg, #fffffff0, #fff0);
    transform: rotate(-28deg);
  }
  /* socket cap */
  .hub-orb::before {
    content: '';
    position: absolute;
    left: 32%;
    right: 32%;
    top: -4px;
    height: 5px;
    border-radius: 2px 2px 1px 1px;
    background: linear-gradient(90deg, #4a3a22, #d9b25a, #4a3a22);
  }
  .hub-orb img {
    width: 70%;
    height: 70%;
    margin-top: 2px;
    object-fit: contain;
    filter: drop-shadow(0 1px 1.5px #0007) saturate(1.15);
    transition:
      opacity 400ms ease,
      transform 400ms var(--spring);
  }
  .hub-orb img[data-hide] {
    opacity: 0;
    transform: scale(0.4) rotate(-25deg);
  }
  .hub-orb-glow {
    position: absolute;
    left: -62px;
    top: calc(var(--cord) - 40px);
    width: 124px;
    height: 124px;
    background: radial-gradient(
      closest-side,
      hsl(var(--hue) 100% 62% / 0.5),
      hsl(var(--hue) 100% 58% / 0.16) 58%,
      transparent
    );
    mix-blend-mode: screen;
    animation: hub-orb-chase 3.6s ease-in-out infinite;
    animation-delay: calc(var(--i) * -0.24s);
  }
  /* four-point sparkle off each orb */
  .hub-orb-spark {
    position: absolute;
    left: 10px;
    top: calc(var(--cord) - 4px);
    width: 16px;
    height: 16px;
    background:
      linear-gradient(90deg, transparent 10%, #fff 50%, transparent 90%) center / 100% 2px no-repeat,
      linear-gradient(0deg, transparent 10%, #fff 50%, transparent 90%) center / 2px 100% no-repeat,
      radial-gradient(circle, #fff 0 2px, hsl(var(--hue) 100% 80% / 0.7) 3px, transparent 8px);
    opacity: 0;
    animation: hub-twinkle 3.6s ease-in-out infinite;
    animation-delay: calc(var(--i) * -0.52s);
  }
  .hub-bulbs li:nth-child(even) .hub-orb-spark {
    left: -26px;
    top: calc(var(--cord) + 24px);
    width: 12px;
    height: 12px;
  }
  @keyframes hub-orb-sway {
    from {
      transform: rotate(calc(var(--a) * -1));
    }
    to {
      transform: rotate(var(--a));
    }
  }
  /* the chase: a wave of brightness runs along the string */
  @keyframes hub-orb-chase {
    0%,
    100% {
      opacity: 0.35;
      scale: 0.85;
    }
    14% {
      opacity: 1;
      scale: 1.12;
    }
    34% {
      opacity: 0.5;
      scale: 0.92;
    }
  }
  @keyframes hub-orb-pulse {
    0%,
    100% {
      filter: brightness(0.9) saturate(1);
    }
    14% {
      filter: brightness(1.28) saturate(1.3);
    }
    34% {
      filter: brightness(0.95) saturate(1.05);
    }
  }
  @keyframes hub-twinkle {
    0%,
    55%,
    100% {
      opacity: 0;
      transform: scale(0.3) rotate(0deg);
    }
    68% {
      opacity: 1;
      transform: scale(1) rotate(45deg);
    }
    84% {
      opacity: 0.3;
      transform: scale(0.6) rotate(80deg);
    }
  }
  @keyframes hub-wire-run {
    to {
      stroke-dashoffset: -20;
    }
  }
  @keyframes hub-wire-hue {
    0%,
    100% {
      filter: drop-shadow(0 0 4px #ff9de2) drop-shadow(0 0 8px #7ff5ff);
    }
    33% {
      filter: drop-shadow(0 0 4px #ffe08a) drop-shadow(0 0 8px #ff8a5c);
    }
    66% {
      filter: drop-shadow(0 0 4px #9dffd2) drop-shadow(0 0 8px #8a9dff);
    }
  }
  @keyframes hub-aurora {
    from {
      transform: translateX(-4%) scaleY(0.9);
      opacity: 0.7;
    }
    to {
      transform: translateX(4%) scaleY(1.15);
      opacity: 1;
    }
  }
  &[data-paused] .hub-swing,
  &[data-paused] .hub-orb,
  &[data-paused] .hub-orb-glow,
  &[data-paused] .hub-orb-spark,
  &[data-paused] .hub-wire-run,
  &[data-paused] .hub-aurora {
    animation-play-state: paused;
  }

  /* entrance: once per session, orbs drop in along the string */
  &[data-reveal] .hub-bulbs li {
    animation: hub-orb-in 0.8s var(--spring) backwards;
    animation-delay: calc(var(--i) * 70ms);
  }
  &[data-reveal] [data-region] {
    animation: hub-rise 0.52s var(--ease) backwards;
    animation-delay: calc(var(--n, 0) * 80ms + 300ms);
  }
  @keyframes hub-orb-in {
    from {
      opacity: 0;
      translate: 0 -40px;
      scale: 0.4;
    }
  }
  @keyframes hub-rise {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
  }

  @media (max-width: 520px) {
    .hub-bulbs {
      --sag: 20px;
      --orb: 36px;
    }
    .hub-bulbs li[data-extra] {
      display: none;
    }
    .hub-orb-glow {
      left: -48px;
      width: 96px;
      height: 96px;
      top: calc(var(--cord) - 30px);
    }
    .hub-orb-spark {
      left: 8px;
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
      align-items: stretch;
      gap: clamp(18px, 2vw, 30px);
      margin: -14px;
      padding: 18px 24px 30px;
      overflow: visible;
    }
    .hub-booths {
      perspective: none;
    }
    .hub-booths > [data-region='booth'] {
      flex: none;
      margin: 0;
      scroll-snap-align: none;
      transform: none;
      opacity: 1;
      filter: none;
      z-index: auto;
      transition: none;
      transform-style: flat;
    }
    .hub-dots {
      display: none;
    }
  }
  @media (min-width: ${lg}px) {
    ${heights('lg')}
    .hub-booths {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    --gap: 32px;
    --pad: 40px;
    --booth-width: min(100%, 520px);
    --felt-top: calc(
      var(--pad) + 56px + var(--h-title) + var(--gap) + var(--h-booth) - 96px
    );
  }

  @media (prefers-reduced-motion: reduce) {
    .hub-swing,
    .hub-orb,
    .hub-orb-glow,
    .hub-orb-spark,
    .hub-wire-run,
    .hub-aurora,
    .hub-orb img,
    .mq-ch,
    &[data-reveal] .mq-ch,
    &[data-reveal] .hub-bulbs li,
    &[data-reveal] [data-region] {
      animation: none;
    }
    .hub-orb-spark {
      opacity: 0.8;
    }
  }
`
