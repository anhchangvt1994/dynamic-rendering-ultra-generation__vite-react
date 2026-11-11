import styled from 'styled-components'
import { BREAKPOINTS, REGIONS } from './regions.mjs'
import { cardsCss } from './styles.cards'

const { md, lg } = BREAKPOINTS
const { title, trainer, booth, quests } = REGIONS

const heights = (k: 'base' | 'md' | 'lg') => `
  --h-title: ${title[k]}px;
  --h-trainer: ${trainer[k]}px;
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
  --felt-top: calc(var(--pad) + 56px + var(--h-title) + var(--gap) + var(--h-trainer) + var(--gap) / 2);

  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: calc(100dvh - 64px);
  padding: calc(var(--pad) + 56px) var(--pad) 120px;
  color: #fff;
  font-variant-numeric: tabular-nums;
  background:
    radial-gradient(1.5px 1.5px at 12% 22%, #fff9 50%, transparent 51%),
    radial-gradient(1px 1px at 38% 12%, #fff8 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 63% 28%, #fff9 50%, transparent 51%),
    radial-gradient(1px 1px at 84% 14%, #fff8 50%, transparent 51%),
    radial-gradient(1px 1px at 92% 38%, #fff7 50%, transparent 51%),
    radial-gradient(1px 1px at 24% 46%, #fff6 50%, transparent 51%),
    linear-gradient(180deg, var(--night), var(--indigo) 58%, #2a2570);

  .hub-felt {
    position: absolute;
    inset: var(--felt-top) 0 0;
    z-index: -1;
    background:
      repeating-linear-gradient(45deg, #ffffff08 0 2px, transparent 2px 4px),
      repeating-linear-gradient(-45deg, #00000012 0 2px, transparent 2px 4px),
      radial-gradient(90% 70% at 50% 0, var(--felt), var(--felt-dark));
    border-top: 3px solid #ffffff22;
    box-shadow: 0 -18px 40px #0a123099;
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
    grid-template-areas: 'title' 'trainer' 'booths' 'quests';
    align-items: start;
  }
  [data-region] {
    position: relative;
    min-width: 0;
    overflow: hidden;
  }
  [data-region='title'] {
    grid-area: title;
    height: var(--h-title);
  }
  [data-region='trainer'] {
    grid-area: trainer;
    height: var(--h-trainer);
    border-radius: 20px;
  }
  [data-region='quests'] {
    grid-area: quests;
    height: var(--h-quests);
    border-radius: 20px;
  }
  .hub-booths {
    grid-area: booths;
    display: grid;
    gap: var(--gap);
    grid-template-columns: minmax(0, 1fr);
  }
  [data-region='booth'] {
    height: var(--h-booth);
    border-radius: 28px;
  }

  [data-region='title'] h1 {
    margin: 0 0 8px;
    font-size: clamp(30px, 6.4vw, 44px);
    line-height: 1.12;
    font-weight: 800;
    letter-spacing: -0.02em;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
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

  /* bulbs */
  .hub-bulbs {
    position: absolute;
    inset: 0 0 auto;
    height: 64px;
    z-index: 0;
    pointer-events: none;
  }
  .hub-bulbs::before {
    content: '';
    position: absolute;
    inset: -14px -4% auto;
    height: 40px;
    border-bottom: 2px solid #ffffff2e;
    border-radius: 0 0 50% 50% / 0 0 100% 100%;
  }
  .hub-bulbs ol {
    display: flex;
    justify-content: space-around;
    margin: 0;
    padding: 12px 8px 0;
    list-style: none;
  }
  .hub-bulbs li {
    width: 12px;
    height: 18px;
    margin-top: calc(var(--i) * 0px);
    border-radius: 50% 50% 46% 46%;
    background: radial-gradient(circle at 40% 30%, #fff, var(--gold) 55%, #e49a1f);
    box-shadow: 0 0 14px 3px #ffcf5a80;
    transform-origin: 50% -10px;
    animation:
      hub-sway 3.6s ease-in-out infinite,
      hub-twinkle 2.4s ease-in-out infinite;
    animation-delay: calc(var(--i) * -300ms), calc(var(--i) * -170ms);
  }
  @keyframes hub-sway {
    50% {
      transform: rotate(5deg);
    }
    0%,
    100% {
      transform: rotate(-5deg);
    }
  }
  @keyframes hub-twinkle {
    50% {
      opacity: 0.7;
    }
  }
  &[data-paused] .hub-bulbs li {
    animation-play-state: paused;
  }

  /* entrance: once per session, transform/opacity only */
  &[data-reveal] .hub-bulbs li {
    animation:
      hub-light 0.5s var(--ease) backwards,
      hub-sway 3.6s ease-in-out infinite,
      hub-twinkle 2.4s ease-in-out infinite;
    animation-delay: calc(var(--i) * 60ms), calc(var(--i) * -300ms), calc(var(--i) * -170ms);
  }
  &[data-reveal] [data-region] {
    animation: hub-rise 0.52s var(--ease) backwards;
    animation-delay: calc(var(--n, 0) * 80ms + 300ms);
  }
  @keyframes hub-light {
    from {
      opacity: 0;
      transform: scale(0.4);
    }
  }
  @keyframes hub-rise {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
  }

  @media (min-width: ${md}px) {
    ${heights('md')}
    --gap: 20px;
    --pad: 28px;
    --felt-top: calc(var(--pad) + 56px + var(--h-trainer) + var(--gap) / 2);
    .hub-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-areas: 'title trainer' 'booths quests';
    }
  }
  @media (min-width: ${lg}px) {
    ${heights('lg')}
    --gap: 24px;
    --pad: 40px;
    --felt-top: calc(var(--pad) + 56px + var(--h-trainer) + var(--gap) / 2);
    .hub-grid {
      grid-template-columns: minmax(0, 1fr) 380px;
    }
    .hub-booths {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding-bottom: 24px;
    }
    .hub-booths > :nth-child(even) {
      transform: translateY(24px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hub-bulbs li,
    &[data-reveal] .hub-bulbs li,
    &[data-reveal] [data-region] {
      animation: none;
    }
  }
`
