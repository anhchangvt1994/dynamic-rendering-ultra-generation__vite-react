import styled, { css, keyframes } from 'styled-components'

const shake = keyframes`
  0%, 100% { transform: translateX(0) }
  25% { transform: translateX(-5px) rotate(-2deg) }
  75% { transform: translateX(5px) rotate(2deg) }
`
const bob = keyframes`
  0%, 100% { transform: translateY(0) }
  50% { transform: translateY(-6px) }
`
const twinkle = keyframes`
  0%, 100% { opacity: .2; transform: scale(.6) }
  50% { opacity: 1; transform: scale(1) }
`
// care effects: lengths in the circle's radius (--R) and its sixth (--u)
const at = (x: string, y: string) =>
  `translate(-50%, -50%) translate(calc((${x}) * var(--R)), calc((${y}) * var(--R)))`
const fxBurst = keyframes`
  0% { opacity: 0; transform: ${at('var(--x0)', 'var(--y0)')} scale(.2) rotate(0deg) }
  12% { opacity: 1 }
  35% { transform: ${at('var(--x) * .72', 'var(--y) * .72')} scale(1.15) rotate(var(--r)) }
  72% { opacity: 1 }
  100% { opacity: 0; transform: ${at('var(--x)', 'var(--y) - .25')} scale(.85) rotate(var(--r)) }
`
const fxToss = keyframes`
  0% { opacity: 0; transform: ${at('0', '-.1')} scale(.3) rotate(0deg) }
  10% { opacity: 1 }
  40% { transform: ${at('var(--x)', 'var(--y) - .2')} scale(1.1) rotate(var(--r)) }
  80% { opacity: 1 }
  100% { opacity: 0; transform: ${at('var(--x) * 1.08', 'var(--y) + .45')} scale(.8) rotate(calc(var(--r) * 2)) }
`
const fxRise = keyframes`
  0% { opacity: 0; transform: ${at('var(--x0)', 'var(--y0)')} scale(.2) }
  14% { opacity: 1; transform: ${at('var(--x0)', 'var(--y0) - .08')} scale(1) }
  45% { transform: ${at('var(--x0) + (var(--x) - var(--x0)) * .4 + .14', '(var(--y0) + var(--y)) * .45')} scale(1, 1.06) }
  75% { transform: ${at('var(--x0) + (var(--x) - var(--x0)) * .75 - .1', 'var(--y0) + (var(--y) - var(--y0)) * .78')} scale(1.06, .96) }
  92% { opacity: 1; transform: ${at('var(--x)', 'var(--y)')} scale(1.05) }
  100% { opacity: 0; transform: ${at('var(--x)', 'var(--y)')} scale(1.7) }
`
const fxWave = keyframes`
  0% { opacity: .95; transform: scale(.72) }
  100% { opacity: 0; transform: scale(1.6) }
`
const fxSheen = keyframes`
  0% { opacity: 0; background-position: 130% 0 }
  15% { opacity: 1 }
  85% { opacity: 1 }
  100% { opacity: 0; background-position: -130% 0 }
`
const fxDish = keyframes`
  0% { opacity: 0; transform: ${at('0', '-1.35')} scale(.55) rotate(-14deg) }
  26% { opacity: 1; transform: ${at('0', '.02')} scale(1.12, .9) rotate(5deg) }
  36% { transform: ${at('0', '-.08')} scale(.96, 1.06) rotate(-2deg) }
  50% { opacity: 1; transform: ${at('0', '0')} scale(1) rotate(0deg) }
  62% { opacity: 1; transform: ${at('0', '.06')} scale(1.2, .7) }
  74% { opacity: 0; transform: ${at('0', '.12')} scale(.15) }
  100% { opacity: 0; transform: ${at('0', '.12')} scale(0) }
`
const fxGain = keyframes`
  0% { opacity: 0; transform: translate(-50%, 10%) scale(.4) rotate(-10deg) }
  16% { opacity: 1; transform: translate(-50%, -70%) scale(1.14) rotate(4deg) }
  28% { transform: translate(-50%, -55%) scale(1) rotate(-2deg) }
  80% { opacity: 1; transform: translate(-50%, -85%) scale(1) rotate(0deg) }
  100% { opacity: 0; transform: translate(-50%, -125%) scale(.92) }
`
const fxPop = keyframes`
  0% { opacity: 0; transform: ${at('var(--x)', 'var(--y)')} scale(0) rotate(-20deg) }
  30% { opacity: 1; transform: ${at('var(--x)', 'var(--y)')} scale(1.35) rotate(10deg) }
  45% { transform: ${at('var(--x)', 'var(--y)')} scale(.95) rotate(-6deg) }
  60% { transform: ${at('var(--x)', 'var(--y)')} scale(1.1) rotate(4deg) }
  85% { opacity: 1 }
  100% { opacity: 0; transform: ${at('var(--x)', 'var(--y) - .2')} scale(1) }
`
const fxGlow = keyframes`
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.6) }
  25% { opacity: 1 }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.15) }
`
const fxFlash = keyframes`
  0% { opacity: 0; transform: scale(.94) }
  22% { opacity: 1; transform: scale(1.05) }
  100% { opacity: 0; transform: scale(1) }
`
const fxIcon = keyframes`
  0%, 100% { transform: none }
  35% { transform: scale(1.4) rotate(-12deg) }
  65% { transform: scale(.92) rotate(6deg) }
`
const fxFade = keyframes`
  0%, 100% { opacity: 0 }
  15%, 80% { opacity: 1 }
`
const drift = keyframes`
  from { transform: translateX(0) }
  to { transform: translateX(-18%) }
`
const spin = keyframes`
  to { transform: rotate(360deg) }
`
const ping = keyframes`
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--a1) 70%, transparent) }
  100% { box-shadow: 0 0 0 9px transparent }
`
const pop = keyframes`
  from { opacity: 0; transform: translateY(6px) scale(.94) }
  to { opacity: 1; transform: none }
`
const nudge = keyframes`
  0%, 100% { transform: scale(1) }
  50% { transform: scale(1.18) }
`

const breathe = keyframes`
  0%, 100% { opacity: .72 }
  50% { opacity: 1 }
`
const sway = keyframes`
  0%, 100% { transform: rotate(-1.6deg) scaleX(1) }
  50% { transform: rotate(1.6deg) scaleX(1.06) }
`
const swayBack = keyframes`
  0%, 100% { transform: rotate(1.2deg) scaleX(1.04) }
  50% { transform: rotate(-1.8deg) scaleX(.97) }
`
const shimmer = keyframes`
  0%, 100% { opacity: .35 }
  35% { opacity: .9 }
  70% { opacity: .5 }
`
const moteFloat = keyframes`
  0% { transform: translate(0, 0) }
  33% { transform: translate(calc(var(--dx) * .6), calc(var(--dy) * .4)) }
  66% { transform: translate(calc(var(--dx) * -.4), calc(var(--dy) * .8)) }
  100% { transform: translate(var(--dx), var(--dy)) }
`
const moteTwinkle = keyframes`
  0%, 100% { opacity: 0; scale: .5 }
  12% { opacity: 1; scale: 1.25 }
  22% { opacity: .35; scale: .9 }
  34% { opacity: .95; scale: 1.1 }
  60% { opacity: .2; scale: .7 }
  80% { opacity: .7; scale: 1 }
`

const motion = css`
  @media (prefers-reduced-motion: no-preference) {
    .pat div {
      animation: ${drift} 46s linear infinite alternate;
    }
    .pat div:nth-child(even) {
      animation-direction: alternate-reverse;
      animation-duration: 58s;
    }
    .rm-disc::before {
      animation: ${spin} 40s linear infinite;
    }
    .rm-bubble {
      animation: ${pop} 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.3);
    }
    .rm-ring[data-low] .rm-ring-icon {
      animation: ${nudge} 1.6s ease-in-out infinite;
    }
    .rm-act[data-urgent] {
      animation: ${ping} 1.6s ease-out infinite;
    }
    .rm-act,
    .rm-meter i,
    .rm-level-bar i {
      transition:
        transform 0.15s ease,
        background-color 0.15s ease,
        width 0.6s ease;
    }
    .rm-act:not([aria-disabled='true']):active {
      transform: translateY(3px);
      box-shadow:
        inset 0 0 0 2px var(--c),
        0 1px 0 color-mix(in srgb, var(--c) 70%, #000);
    }
    .rm-room[data-mood='angry'] .rm-disc {
      animation: ${shake} 0.4s 2;
    }
    .rm-room[data-mood='happy'] .rm-sprite,
    .rm-room[data-mood='glad'] .rm-sprite {
      animation: ${bob} 2.4s ease-in-out infinite;
    }
    .rm-sparkles i {
      animation: ${twinkle} 2.2s ease-in-out infinite;
    }
    .rm-sparkles i:nth-child(2n) {
      animation-delay: 0.7s;
    }
    .rm-sparkles i:nth-child(3n) {
      animation-delay: 1.3s;
    }
    .rm-act > span {
      transition: transform 0.22s cubic-bezier(0.3, 1.6, 0.5, 1);
    }
    .rm-act:not([aria-disabled='true']):hover > span {
      transform: translateY(-3px) rotate(-8deg) scale(1.08);
    }
    .rm-act:not([aria-disabled='true']):active > span {
      transform: scale(0.86);
    }
    .rm-back {
      transition:
        transform 0.18s cubic-bezier(0.3, 1.6, 0.5, 1),
        background-color 0.15s ease;
    }
    .rm-door img,
    .rm-door small {
      transition:
        transform 0.35s cubic-bezier(0.3, 1.4, 0.5, 1),
        filter 0.25s ease,
        opacity 0.25s ease;
    }
    .rm-back:hover svg {
      transform: translateX(-3px);
    }
    .rm-back svg {
      transition: transform 0.18s ease;
    }
    .rm-back:active {
      transform: scale(0.92);
    }

    /* the light: it breathes, its rays sway, the dust drifts and glints */
    .rm-light-cone {
      animation: ${breathe} 7s ease-in-out infinite;
    }
    .rm-light-rays {
      animation:
        ${sway} 11s ease-in-out infinite,
        ${shimmer} 6.5s ease-in-out infinite;
    }
    .rm-light-rays[data-b] {
      animation:
        ${swayBack} 15s ease-in-out infinite,
        ${shimmer} 9s -3s ease-in-out infinite;
    }
    .rm-light-src {
      animation: ${breathe} 5s ease-in-out infinite;
    }
    .rm-light-dust i {
      animation:
        ${moteFloat} var(--t) var(--d) ease-in-out infinite alternate,
        ${moteTwinkle} var(--k) var(--d) ease-in-out infinite;
    }

    /* care effects */
    .rm-fx-p,
    .rm-fx-wave,
    .rm-fx-sheen,
    .rm-fx-dish,
    .rm-glow {
      display: block;
    }
    .rm-fx-p {
      animation: ${fxBurst} var(--t, 1150ms) var(--d)
        cubic-bezier(0.2, 0.8, 0.3, 1) both;
    }
    .rm-fx-p[data-p='crumb'] {
      animation-name: ${fxToss};
      animation-timing-function: cubic-bezier(0.25, 0.7, 0.4, 1);
    }
    .rm-fx-p[data-p='bubble'] {
      animation: ${fxRise} var(--t, 1400ms) var(--d)
        cubic-bezier(0.35, 0.1, 0.4, 1) both;
    }
    .rm-fx-p[data-p='anger'] {
      animation: ${fxPop} 1100ms var(--d) cubic-bezier(0.3, 1.4, 0.5, 1) both;
    }
    .rm-fx-wave {
      animation: ${fxWave} 0.9s cubic-bezier(0.2, 0.7, 0.3, 1) both;
    }
    .rm-fx-wave + .rm-fx-wave {
      animation-delay: 0.16s;
      border-width: calc(var(--u) * 0.12);
    }
    [data-fx='feed'] > .rm-fx-wave {
      animation-delay: 0.5s;
    }
    [data-fx='feed'] > .rm-fx-wave + .rm-fx-wave {
      animation-delay: 0.66s;
    }
    .rm-fx-sheen {
      animation: ${fxSheen} 1.1s 0.25s ease-in-out both;
    }
    .rm-fx-dish {
      animation: ${fxDish} 1s cubic-bezier(0.3, 0.8, 0.4, 1) both;
    }
    .rm-fx-gain {
      animation: ${fxGain} 1.9s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
    }
    [data-fx='feed'] > .rm-fx-gain {
      animation-delay: 0.55s;
    }
    .rm-glow {
      animation: ${fxGlow} 1.5s ease-out both;
    }
    .rm-glow[data-fx='feed'] {
      animation-delay: 0.5s;
    }
    .rm-ring-flash {
      animation: ${fxFlash} 0.9s ease-out both;
    }
    .rm-ring:has(.rm-ring-flash) .rm-ring-icon {
      animation: ${fxIcon} 0.6s cubic-bezier(0.3, 1.5, 0.5, 1);
    }
  }
`

export const RoomStyle = styled.div`
  --line: color-mix(in srgb, var(--fg) 12%, transparent);
  --glass: color-mix(in srgb, var(--bg) 72%, transparent);
  --surface: color-mix(in srgb, var(--fg) 7%, transparent);
  --track: color-mix(in srgb, var(--fg) 16%, transparent);
  --warn: #ff4d5e;
  --heart: #ff4d79;
  --feed: #ff7a1a;
  --bathe: #1e8fff;
  --pet: #ff4f8b;
  --cook: #17a85a;
  --dock: 146px;
  /* as wide as the phone allows, giving way on short ones so the sticker
     clears the dock */
  --disc: clamp(176px, min(100vw - 48px, 100dvh - 440px), 320px);
  position: relative;
  padding-bottom: var(--dock);
  color: var(--fg);
  background: var(--bg);
  font-family: var(--font-body), system-ui, sans-serif;

  /* light rooms: white paper on a coloured wall, lines in the room's colour */
  &[data-tone='light'] {
    --line: color-mix(in srgb, var(--a1) 30%, transparent);
    --glass: rgba(255, 255, 255, 0.8);
    --surface: rgba(255, 255, 255, 0.7);
    --track: color-mix(in srgb, var(--a1) 22%, transparent);
  }

  h1,
  h2,
  p {
    margin: 0;
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  /* ---------- the room: the upper half (wall, HUD, bubble), then the stage ---------- */
  .rm-room {
    position: relative;
    isolation: isolate;
    display: grid;
    grid-template-rows: minmax(min-content, 1fr) auto;
    gap: 10px;
    min-height: calc(100dvh - 64px - var(--dock));
    padding: 14px 16px 18px;
    overflow: hidden;
  }
  .rm-sky {
    position: absolute;
    z-index: -2;
    inset: 0;
    background:
      radial-gradient(
        closest-side circle at 50% 74%,
        color-mix(in srgb, var(--a2) 80%, transparent),
        transparent
      ),
      radial-gradient(
        120% 55% at 50% 0,
        color-mix(in srgb, var(--a1) 30%, transparent),
        transparent 70%
      );
  }
  .rm-floor {
    position: absolute;
    z-index: -1;
    left: -50%;
    right: -50%;
    bottom: -4px;
    height: 36%;
    background-image:
      linear-gradient(
        color-mix(in srgb, var(--a1) 50%, transparent) 2px,
        transparent 2px
      ),
      linear-gradient(
        90deg,
        color-mix(in srgb, var(--a1) 50%, transparent) 2px,
        transparent 2px
      );
    background-size: 46px 46px;
    background-position: center top;
    transform: perspective(260px) rotateX(58deg);
    transform-origin: 50% 100%;
    mask-image: linear-gradient(to top, #000 0%, transparent 85%);
    opacity: 0.6;
  }
  .rm-upper {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 8px;
    min-height: 0;
  }

  /* the types' poster wall, behind the HUD, fading out above the circle */
  .rm-wall {
    position: absolute;
    z-index: -1;
    inset: -14px -16px 0;
    overflow: hidden;
    pointer-events: none;
    mask-image: linear-gradient(to bottom, #000 45%, transparent 100%);
  }
  .pat {
    position: absolute;
    inset: -30px -10%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    transform: rotate(-8deg);
  }
  .pat div {
    font-family: var(--font-display), system-ui, sans-serif;
    font-size: 36px;
    line-height: 1;
    white-space: nowrap;
    text-transform: uppercase;
    color: transparent;
    -webkit-text-stroke: 1.5px var(--a1);
    opacity: 0.55;
  }
  .pat div:nth-child(3n + 2) {
    color: var(--a1);
    -webkit-text-stroke: 0;
    opacity: 0.22;
  }
  .pat div:nth-child(even) {
    margin-left: -120px;
  }
  /* the words sit back behind the name and the bubble */
  .rm-wall::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      70% 60% at 50% 38%,
      color-mix(in srgb, var(--bg) 88%, transparent),
      transparent 75%
    );
  }
  /* one huge word behind the circle, the way a poster does */
  .rm-mega {
    position: absolute;
    z-index: -1;
    left: 50%;
    top: calc(var(--pt) + var(--disc) * 0.12);
    transform: translateX(-50%);
    font-family: var(--font-display), system-ui, sans-serif;
    font-size: calc(var(--disc) * 0.78);
    line-height: 1;
    white-space: nowrap;
    text-transform: uppercase;
    color: transparent;
    -webkit-text-stroke: 2px color-mix(in srgb, var(--a1) 30%, transparent);
    pointer-events: none;
  }
  /* the light: a hazy cone from a source above, god rays swaying inside it,
     and fine dust drifting and glinting where the light catches it */
  .rm-light {
    position: absolute;
    z-index: -1;
    left: 50%;
    top: -340px;
    bottom: 8px;
    width: calc(var(--disc) * 2.8);
    transform: translateX(-50%);
    mix-blend-mode: screen;
    pointer-events: none;
    --warm: #fff3d6;
  }
  .rm-light-cone,
  .rm-light-rays {
    position: absolute;
    inset: 0;
    clip-path: polygon(47% 0, 53% 0, 100% 100%, 0 100%);
  }
  .rm-light-cone {
    background:
      radial-gradient(
        ellipse 55% 38% at 50% 100%,
        color-mix(in srgb, var(--a1) 40%, transparent),
        transparent
      ),
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--warm) 38%, transparent) 0,
        color-mix(in srgb, var(--warm) 14%, transparent) 22%,
        color-mix(in srgb, var(--a1) 12%, transparent) 62%,
        color-mix(in srgb, var(--a2) 20%, transparent) 100%
      );
    filter: blur(14px);
  }
  .rm-light-rays {
    transform-origin: 50% 0;
    background: conic-gradient(
      from 180deg at 50% 0,
      transparent 0 14deg,
      color-mix(in srgb, var(--warm) 55%, transparent) 17deg,
      transparent 20deg 24deg,
      color-mix(in srgb, var(--warm) 38%, transparent) 26deg,
      transparent 30deg 33deg,
      color-mix(in srgb, var(--a1) 45%, transparent) 36deg,
      transparent 41deg 45deg,
      color-mix(in srgb, var(--warm) 50%, transparent) 47deg,
      transparent 51deg 55deg,
      color-mix(in srgb, var(--a2) 40%, transparent) 58deg,
      transparent 63deg 68deg,
      color-mix(in srgb, var(--warm) 34%, transparent) 70deg,
      transparent 75deg 360deg
    );
    -webkit-mask-image: linear-gradient(180deg, #000, transparent 88%);
    mask-image: linear-gradient(180deg, #000, transparent 88%);
    filter: blur(5px);
    opacity: 0.6;
  }
  .rm-light-rays[data-b] {
    transform: scaleX(-1);
    opacity: 0.4;
    filter: blur(9px);
  }
  .rm-light-src {
    position: absolute;
    left: 50%;
    top: 0;
    width: calc(var(--disc) * 0.5);
    height: calc(var(--disc) * 0.5);
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(
      closest-side,
      color-mix(in srgb, var(--warm) 85%, transparent),
      color-mix(in srgb, var(--a1) 28%, transparent) 55%,
      transparent
    );
    filter: blur(6px);
  }
  .rm-light-dust i {
    position: absolute;
    left: var(--x);
    top: var(--y);
    width: var(--s);
    height: var(--s);
    border-radius: 50%;
    background: var(--warm);
    box-shadow:
      0 0 calc(var(--s) * 2) color-mix(in srgb, var(--warm) 90%, transparent),
      0 0 calc(var(--s) * 5) color-mix(in srgb, var(--a1) 70%, transparent);
    opacity: 0.55;
  }
  .rm-stage::after {
    content: '';
    position: absolute;
    z-index: -1;
    left: 50%;
    bottom: 6px;
    width: calc(var(--disc) * 1.5);
    height: calc(var(--disc) * 0.22);
    transform: translateX(-50%);
    border-radius: 50%;
    background: radial-gradient(
      closest-side,
      color-mix(in srgb, var(--a1) 55%, transparent),
      transparent
    );
    pointer-events: none;
  }
  .rm-wall-sticker {
    position: absolute;
    right: 18px;
    top: 52%;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    transform: rotate(12deg);
    color: var(--ink);
    background: var(--a1);
    box-shadow: 3px 3px 0 var(--a2);
  }

  /* ---------- HUD: a poster title with the way back beside it; the level,
     the three needs and the type orbit the circle instead of sitting in rows ---------- */
  .rm-hud {
    --hb: 48px;
    position: relative;
    display: grid;
    justify-items: center;
    min-height: var(--hb);
    padding: 0 calc(var(--hb) + 10px);
  }
  .rm-back {
    position: absolute;
    top: 0;
    left: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--hb);
    height: var(--hb);
    border-radius: 50%;
    color: var(--fg);
    background: var(--glass);
    backdrop-filter: blur(10px);
    box-shadow:
      inset 0 0 0 1px var(--line),
      0 10px 24px -14px rgba(0, 0, 0, 0.6);
    text-decoration: none;
  }
  .rm-back:hover {
    background-color: color-mix(in srgb, var(--a1) 22%, var(--glass));
  }
  .rm-back svg {
    flex: none;
  }
  .rm-back-text {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .rm-name {
    display: grid;
    justify-items: center;
    gap: 7px;
    max-width: 100%;
    min-width: 0;
    text-align: center;
  }
  .rm-name h1 {
    display: -webkit-box;
    max-width: 100%;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-family: var(--font-display), system-ui, sans-serif;
    font-size: clamp(26px, 8.6vw, 40px);
    font-weight: 400;
    line-height: 1.04;
    letter-spacing: 0.01em;
    overflow-wrap: anywhere;
    text-wrap: balance;
    text-shadow:
      0 0 14px var(--bg),
      0 0 4px var(--bg),
      0 3px 0 color-mix(in srgb, var(--a1) 55%, transparent);
  }
  .rm-name p {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 4px 10px;
    font-size: 12px;
    font-weight: 700;
  }
  .rm-name p > span:not(.rm-stars):not(.rm-count) {
    opacity: 0.85;
  }
  .rm-lv {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .rm-stars {
    flex: none;
    color: var(--star);
    letter-spacing: 1px;
  }
  .rm-count {
    padding: 2px 9px;
    border-radius: 999px;
    background: var(--glass);
    box-shadow: inset 0 0 0 1px var(--line);
    font-variant-numeric: tabular-nums;
    line-height: 1.3;
  }
  /* the others of its species peek in at the stage's two edges, like figures
     behind a half-open door: tap one, swipe, or press an arrow key to call it */
  .rm-step {
    display: contents;
  }
  .rm-door {
    --w: max(46px, calc((100% - var(--disc)) / 2 + var(--disc) * 0.08));
    position: absolute;
    z-index: 2;
    top: calc(var(--pt) + var(--disc) / 2);
    width: var(--w);
    height: calc(var(--disc) * 0.78);
    margin-top: calc(var(--disc) * -0.39);
    overflow: hidden;
    color: var(--fg);
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-mask-image: linear-gradient(var(--to), transparent, #000 55%);
    mask-image: linear-gradient(var(--to), transparent, #000 55%);
  }
  .rm-door-prev {
    --to: 90deg;
    left: 0;
  }
  .rm-door-next {
    --to: 270deg;
    right: 0;
  }
  .rm-door img {
    position: absolute;
    top: 50%;
    width: calc(var(--disc) * 0.66);
    max-width: none;
    height: auto;
    margin-top: calc(var(--disc) * -0.33);
    object-fit: contain;
    filter: brightness(0.5) saturate(0.7) blur(1.2px);
    opacity: 0.85;
    pointer-events: none;
    user-select: none;
  }
  .rm-door-prev img {
    right: calc(var(--w) * -0.15);
  }
  .rm-door-next img {
    left: calc(var(--w) * -0.15);
    transform: scaleX(-1);
  }
  .rm-door small {
    position: absolute;
    bottom: 6%;
    left: 50%;
    max-width: 92%;
    padding: 2px 8px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--glass);
    box-shadow: inset 0 0 0 1px var(--line);
    font-size: 10px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
    transform: translate(-50%, 8px);
    opacity: 0;
  }
  .rm-door:hover img,
  .rm-door:focus-visible img {
    filter: brightness(0.95) saturate(1) blur(0);
    opacity: 1;
  }
  .rm-door-prev:hover img,
  .rm-door-prev:focus-visible img {
    transform: translateX(10px);
  }
  .rm-door-next:hover img,
  .rm-door-next:focus-visible img {
    transform: translateX(-10px) scaleX(-1);
  }
  .rm-door:hover small,
  .rm-door:focus-visible small {
    opacity: 1;
    transform: translate(-50%, 0);
  }

  /* ---------- the orbit: every piece sits on the circle's rim by angle ---------- */
  .rm-medal,
  .rm-ring,
  .rm-sticker {
    position: absolute;
    z-index: 3;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) rotate(var(--ang))
      translateY(calc(var(--R) * -1 - var(--out)))
      rotate(calc(var(--ang) * -1 + var(--tilt, 0deg)));
  }
  .rm-medal {
    --ang: -40deg;
    --out: 2px;
    display: grid;
    place-items: center;
    width: var(--ms);
    height: var(--ms);
    border-radius: 50%;
    background: conic-gradient(var(--a1) var(--lv), var(--track) 0);
    box-shadow: 0 12px 22px -10px rgba(0, 0, 0, 0.7);
  }
  .rm-medal::before {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: var(--bg);
  }
  .rm-medal b {
    position: relative;
    font-family: var(--font-display), system-ui, sans-serif;
    font-size: calc(var(--ms) * 0.4);
    font-weight: 400;
    line-height: 1;
  }
  .rm-medal small {
    position: absolute;
    left: 50%;
    bottom: -8px;
    padding: 0 7px;
    transform: translateX(-50%);
    border-radius: 999px;
    color: #fff;
    background: var(--heart);
    font-size: 10px;
    font-weight: 800;
    line-height: 16px;
    white-space: nowrap;
  }
  .rm-rings {
    display: contents;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .rm-ring {
    --out: 12px;
    display: grid;
    place-items: center;
    width: var(--gs);
    height: var(--gs);
    border-radius: 50%;
    background: conic-gradient(var(--a1) var(--p, 0%), var(--track) 0);
    box-shadow: 0 12px 22px -10px rgba(0, 0, 0, 0.7);
  }
  .rm-ring::before {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: var(--bg);
  }
  .rm-ring:nth-child(1) {
    --ang: 218deg;
  }
  .rm-ring:nth-child(2) {
    --ang: 180deg;
  }
  .rm-ring:nth-child(3) {
    --ang: 142deg;
  }
  .rm-ring-icon {
    position: relative;
    font-size: calc(var(--gs) * 0.42);
    line-height: 1;
  }
  .rm-ring-text {
    position: absolute;
    z-index: 1;
    left: 50%;
    bottom: -9px;
    display: flex;
    align-items: baseline;
    gap: 4px;
    padding: 0 7px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: var(--bg);
    box-shadow: inset 0 0 0 1px var(--line);
    line-height: 16px;
    white-space: nowrap;
  }
  .rm-ring-text small {
    font-size: 10px;
    font-weight: 600;
    opacity: 0.8;
  }
  .rm-ring-text b {
    font-size: 11px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .rm-meter {
    display: none;
  }
  /* loading: the ring's place, no number yet */
  .rm-ring[data-pending] b {
    visibility: hidden;
  }
  .rm-ring[data-low] {
    background: conic-gradient(var(--warn) var(--p, 0%), var(--track) 0);
  }
  .rm-ring[data-low] .rm-ring-text {
    color: #fff;
    background: var(--warn);
    box-shadow: none;
  }
  .rm-ring[data-need='hunger'] {
    --fxc: var(--feed);
  }
  .rm-ring[data-need='clean'] {
    --fxc: var(--bathe);
  }
  .rm-ring[data-need='fun'] {
    --fxc: var(--pet);
  }
  /* the need a care just filled */
  .rm-ring-flash {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: color-mix(in srgb, var(--fxc) 18%, transparent);
    box-shadow:
      inset 0 0 0 2px var(--fxc),
      0 0 18px 1px color-mix(in srgb, var(--fxc) 70%, transparent);
    pointer-events: none;
    animation: ${fxFade} 0.9s ease-out both;
  }

  /* ---------- mood bubble ---------- */
  .rm-bubble-wrap {
    display: flex;
    justify-content: center;
    padding-bottom: 8px;
    pointer-events: none;
  }
  .rm-bubble {
    position: relative;
    max-width: min(100%, 340px);
    padding: 9px 15px;
    border-radius: 18px;
    color: #14171f;
    background: #fff;
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--a1) 75%, transparent),
      0 14px 28px -14px rgba(0, 0, 0, 0.6);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.35;
    text-align: center;
  }
  .rm-bubble::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -6px;
    width: 12px;
    height: 12px;
    transform: translateX(-50%) rotate(45deg);
    background: #fff;
    box-shadow: 3px 3px 0 0 color-mix(in srgb, var(--a1) 75%, transparent);
  }
  .rm-bubble:empty {
    display: none;
  }
  .rm-bubble b {
    font-weight: 800;
  }
  .rm-emoji {
    font-size: 18px;
    vertical-align: -2px;
  }

  /* ---------- the stage: the circle, the Pokémon, the sticker ---------- */
  .rm-stage {
    --pt: 30px;
    position: relative;
    z-index: 1;
    display: grid;
    justify-items: center;
    padding-top: var(--pt);
    padding-bottom: 52px;
  }
  .rm-disc {
    --R: calc(var(--disc) / 2);
    --ms: 58px;
    --gs: 52px;
    --u: calc(var(--R) / 6);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--disc);
    height: var(--disc);
    border-radius: 50%;
    background: radial-gradient(
      circle at 50% 36%,
      color-mix(in srgb, var(--a2) 72%, #fff) 0,
      var(--a2) 58%,
      color-mix(in srgb, var(--a2) 72%, #000) 100%
    );
    box-shadow:
      0 0 0 4px var(--a1),
      0 0 0 11px color-mix(in srgb, var(--a1) 20%, transparent),
      0 26px 60px -12px color-mix(in srgb, var(--a2) 80%, transparent);
  }
  .rm-disc::before {
    content: '';
    position: absolute;
    inset: -20px;
    border-radius: 50%;
    border: 2px dashed color-mix(in srgb, var(--a1) 55%, transparent);
    pointer-events: none;
  }
  .rm-disc::after {
    content: '';
    position: absolute;
    left: 16%;
    right: 16%;
    bottom: -34px;
    height: 14px;
    border-radius: 50%;
    background: radial-gradient(closest-side, rgba(0, 0, 0, 0.4), transparent);
    pointer-events: none;
  }
  /* what the care reactions move, so the sprite's own bob stays */
  .rm-actor {
    position: relative;
    z-index: 1;
    display: flex;
    transform-origin: 50% 85%;
  }
  [data-unlock-gold] .rm-disc {
    box-shadow:
      0 0 0 4px #ffd447,
      0 0 0 11px rgba(255, 212, 71, 0.28),
      0 0 40px 8px rgba(255, 212, 71, 0.45);
  }
  [data-unlock-gold] .rm-disc::before {
    border-color: rgba(255, 212, 71, 0.7);
  }
  .rm-sticker {
    --ang: 38deg;
    --out: 6px;
    --tilt: -4deg;
    max-width: calc(var(--disc) * 0.8);
    overflow: hidden;
    padding: 6px 12px;
    border-radius: 10px;
    color: var(--ink);
    background: var(--a1);
    box-shadow:
      3px 3px 0 var(--a2),
      0 12px 22px -12px rgba(0, 0, 0, 0.6);
    font-family: var(--font-display), system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.1;
    letter-spacing: 0.04em;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .rm-sparkles {
    position: absolute;
    inset: -26px;
    pointer-events: none;
  }
  .rm-sparkles i {
    position: absolute;
    width: 11px;
    height: 11px;
    background: #fff;
    clip-path: polygon(
      50% 0,
      62% 38%,
      100% 50%,
      62% 62%,
      50% 100%,
      38% 62%,
      0 50%,
      38% 38%
    );
  }
  .rm-sparkles i:nth-child(1) {
    left: 8%;
    top: 20%;
  }
  .rm-sparkles i:nth-child(2) {
    right: 6%;
    top: 12%;
  }
  .rm-sparkles i:nth-child(3) {
    right: 0;
    top: 58%;
  }
  .rm-sparkles i:nth-child(4) {
    left: 2%;
    bottom: 22%;
  }
  .rm-sparkles i:nth-child(5) {
    left: 40%;
    top: -2%;
  }
  .rm-sparkles i:nth-child(6) {
    right: 22%;
    bottom: 2%;
  }
  /* ---------- care effects (motion in the motion block) ---------- */
  [data-fx='feed'] {
    --fxc: var(--feed);
  }
  [data-fx='bathe'] {
    --fxc: var(--bathe);
  }
  [data-fx='pet'] {
    --fxc: var(--pet);
  }
  [data-fx='angry'] {
    --fxc: var(--warn);
  }
  .rm-fx {
    position: absolute;
    z-index: 3;
    inset: 0;
    pointer-events: none;
  }
  .rm-fx-p,
  .rm-fx-wave,
  .rm-fx-sheen,
  .rm-fx-dish,
  .rm-glow {
    display: none;
  }
  .rm-fx-p {
    position: absolute;
    left: 50%;
    top: 50%;
    opacity: 0;
    font-style: normal;
    line-height: 1;
  }
  .rm-fx-p[data-p='heart'] {
    color: var(--c);
    font-size: calc(var(--u) * 1.15 * var(--s));
    text-shadow:
      0 2px 0 color-mix(in srgb, var(--c) 55%, #000),
      0 0 14px color-mix(in srgb, var(--c) 70%, transparent);
  }
  .rm-fx-p[data-p='spark'] {
    width: calc(var(--u) * 0.9 * var(--s));
    aspect-ratio: 1;
    background: #fff;
    clip-path: polygon(
      50% 0,
      60% 40%,
      100% 50%,
      60% 60%,
      50% 100%,
      40% 60%,
      0 50%,
      40% 40%
    );
    filter: drop-shadow(0 0 4px var(--fxc));
  }
  .rm-fx-p[data-p='bubble'] {
    width: calc(var(--u) * 0.95 * var(--s));
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(
      circle at 32% 28%,
      #fff 0 9%,
      rgba(255, 255, 255, 0.4) 10% 22%,
      rgba(124, 199, 255, 0.14) 45%,
      rgba(255, 120, 200, 0.3) 78%,
      rgba(255, 255, 255, 0.85) 93%
    );
    box-shadow:
      inset 0 0 0 1.5px rgba(255, 255, 255, 0.8),
      inset -3px -4px 7px rgba(255, 79, 139, 0.28),
      inset 3px 3px 6px rgba(79, 209, 255, 0.4),
      0 0 10px rgba(124, 199, 255, 0.45);
  }
  .rm-fx-p[data-p='drop'] {
    width: calc(var(--u) * 0.5 * var(--s));
    height: calc(var(--u) * 0.78 * var(--s));
    border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%;
    background: linear-gradient(170deg, #fff 0 18%, var(--c) 60%);
    box-shadow: 0 0 8px color-mix(in srgb, var(--c) 60%, transparent);
  }
  .rm-fx-p[data-p='crumb'] {
    width: calc(var(--u) * 0.6 * var(--s));
    aspect-ratio: 1;
    border-radius: 32%;
    background: var(--c);
    box-shadow:
      inset -2px -3px 0 rgba(0, 0, 0, 0.2),
      inset 2px 2px 0 rgba(255, 255, 255, 0.45);
  }
  .rm-fx-p[data-p='puff'] {
    width: calc(var(--u) * 1.05 * var(--s));
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle at 38% 34%, #fff, var(--c) 70%);
    box-shadow: calc(var(--u) * 0.4) calc(var(--u) * 0.1) 0
      calc(var(--u) * -0.1) var(--c);
    opacity: 0;
  }
  .rm-fx-p[data-p='anger'] {
    font-size: calc(var(--u) * 1.2 * var(--s));
    filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.25));
  }
  .rm-fx-wave {
    position: absolute;
    inset: 0;
    border: calc(var(--u) * 0.26) solid var(--fxc);
    border-radius: 50%;
    opacity: 0;
    box-shadow: 0 0 22px color-mix(in srgb, var(--fxc) 60%, transparent);
  }
  .rm-fx-sheen {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: linear-gradient(
        110deg,
        transparent 32%,
        rgba(255, 255, 255, 0.85) 47%,
        rgba(170, 225, 255, 0.6) 51%,
        rgba(255, 170, 225, 0.45) 55%,
        transparent 68%
      )
      0 0 / 260% 100% no-repeat;
    mix-blend-mode: screen;
    opacity: 0;
  }
  .rm-fx-dish {
    position: absolute;
    left: 50%;
    top: 50%;
    opacity: 0;
    filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.35));
  }
  .rm-fx-dish svg {
    display: block;
  }
  /* what the care won, over the circle's top */
  .rm-fx-gain {
    position: absolute;
    z-index: 2;
    left: 50%;
    top: 4%;
    padding: 0.45em 1em 0.4em;
    border-radius: 999px;
    color: #14171f;
    background: #fff;
    box-shadow:
      inset 0 0 0 2.5px var(--fxc),
      0 4px 0 color-mix(in srgb, var(--fxc) 75%, #000),
      0 16px 30px -12px rgba(0, 0, 0, 0.6);
    font-family: var(--font-display), system-ui, sans-serif;
    font-size: clamp(15px, calc(var(--u) * 0.72), 22px);
    font-weight: 400;
    line-height: 1;
    letter-spacing: 0.02em;
    white-space: nowrap;
    transform: translate(-50%, -85%);
    animation: ${fxFade} 1.9s ease both;
  }
  [data-taste='disliked'] > .rm-fx-gain {
    --fxc: #8a93a6;
  }
  /* the room lights up in the care's colour behind the circle */
  .rm-glow {
    position: absolute;
    z-index: -1;
    left: 50%;
    top: calc(var(--disc) / 2 + var(--pt));
    width: calc(var(--disc) * 2.3);
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(
      closest-side,
      color-mix(in srgb, var(--fxc) 60%, transparent),
      color-mix(in srgb, var(--fxc) 22%, transparent) 55%,
      transparent
    );
    opacity: 0;
    pointer-events: none;
  }
  .rm-care-error {
    position: absolute;
    z-index: 5;
    left: 50%;
    top: 38%;
    display: grid;
    gap: 8px;
    justify-items: center;
    width: min(270px, calc(100% - 32px));
    padding: 14px 16px;
    transform: translate(-50%, -50%);
    border-radius: 18px;
    color: #14171f;
    background: #fff;
    box-shadow: 0 18px 40px -16px rgba(0, 0, 0, 0.6);
    text-align: center;
    font-size: 13px;
    font-weight: 700;
  }
  .rm-care-error .rm-btn {
    color: #14171f;
    border-color: #14171f;
  }

  /* ---------- the sprite ---------- */
  .rm-sprite {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .rm-body {
    position: relative;
    display: block;
    flex: none;
  }
  .rm-body img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
  }
  .rm-stage .rm-body img,
  .rm-stage .rm-canvas {
    filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.25));
  }
  /* the individual's palette and marks, over its picture's box */
  .rm-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    opacity: 0;
  }
  .rm-body[data-canvas] > .rm-canvas {
    opacity: 1;
  }
  .rm-body[data-canvas] > img {
    visibility: hidden;
  }
  /* turned away: the front, mirrored */
  .rm-body img[data-back] {
    transform: scaleX(-1);
  }
  .rm-body img[data-pixel] {
    image-rendering: pixelated;
  }
  .rm-body img:not([data-pixel]) {
    image-rendering: auto;
  }
  /* not painted until it is fitted: its first box is never seen to move */
  .rm-body img:not([data-ready]) {
    opacity: 0.001;
  }
  .rm-body:has(> img:not([data-ready])) {
    visibility: hidden;
  }
  .rm-letter {
    display: grid;
    place-items: center;
    width: 80%;
    height: 80%;
    border-radius: 50%;
    color: var(--ink);
    background: var(--a1);
    font-family: var(--font-display), system-ui, sans-serif;
    font-size: 40px;
  }

  /* ---------- the dock: a floating care bar, the profile pulled up ---------- */
  .rm-dock {
    position: fixed;
    z-index: 20;
    left: 8px;
    right: 8px;
    bottom: max(8px, env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    max-width: 560px;
    max-height: calc(100dvh - 80px);
    margin-inline: auto;
    padding: 0 10px 10px;
    border-radius: 24px;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(18px) saturate(1.4);
    box-shadow:
      inset 0 0 0 1px var(--line),
      0 20px 44px -14px rgba(0, 0, 0, 0.7);
  }
  .rm-sheet-toggle {
    all: unset;
    box-sizing: border-box;
    display: grid;
    gap: 4px;
    justify-items: center;
    align-content: center;
    min-height: 44px;
    padding: 6px 0 4px;
    cursor: pointer;
  }
  .rm-grab {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--track);
  }
  .rm-toggle-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;
    opacity: 0.85;
  }
  .rm-chev {
    width: 7px;
    height: 7px;
    margin-top: 3px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(-135deg);
  }
  [aria-expanded='true'] .rm-chev {
    margin-top: -3px;
    transform: rotate(45deg);
  }
  .rm-sheet-toggle:focus-visible,
  .rm-act:focus-visible,
  .rm-btn:focus-visible,
  .rm-dish:focus-visible,
  .rm-field input:focus-visible,
  .rm-close:focus-visible,
  .rm-back:focus-visible,
  .rm-door:focus-visible {
    outline: 3px solid var(--a1);
    outline-offset: 2px;
  }
  .rm-profile {
    display: none;
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 2px 2px 10px;
    scrollbar-width: none;
  }
  .rm-profile[data-open] {
    display: grid;
    align-content: start;
    gap: 10px;
  }
  .rm-carebar {
    display: grid;
    gap: 4px;
    flex: none;
  }
  .rm-actions {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    padding-bottom: 4px;
  }
  .rm-act {
    position: relative;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 4px;
    min-width: 0;
    min-height: 64px;
    padding: 6px 2px;
    --c: var(--a1);
    border: 0;
    border-radius: 16px;
    color: #14171f;
    background: #fff;
    box-shadow:
      inset 0 0 0 2px var(--c),
      0 4px 0 color-mix(in srgb, var(--c) 70%, #000);
    font:
      800 12px/1.1 var(--font-body),
      system-ui,
      sans-serif;
    text-decoration: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .rm-act > span {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--c);
    box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.18);
    font-size: 18px;
    line-height: 1;
  }
  .rm-act[data-action='feed'] {
    --c: var(--feed);
  }
  .rm-act[data-action='bathe'] {
    --c: var(--bathe);
  }
  .rm-act[data-action='pet'] {
    --c: var(--pet);
  }
  .rm-act[data-action='cook'] {
    --c: var(--cook);
  }
  .rm-act:hover {
    background: color-mix(in srgb, var(--c) 12%, #fff);
  }
  .rm-act[data-urgent] {
    background: color-mix(in srgb, var(--c) 18%, #fff);
    box-shadow:
      inset 0 0 0 3px var(--c),
      0 4px 0 color-mix(in srgb, var(--c) 70%, #000);
  }
  .rm-act[data-urgent]::after {
    content: '!';
    position: absolute;
    top: 5px;
    right: 6px;
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    color: #fff;
    background: var(--warn);
    font-size: 11px;
    font-weight: 900;
  }
  .rm-act[aria-disabled='true'] {
    opacity: 0.45;
    filter: grayscale(0.6);
    box-shadow: inset 0 0 0 2px var(--c);
    cursor: not-allowed;
  }
  .rm-act[aria-disabled='true']:hover {
    background: #fff;
  }
  .rm-reasons {
    min-height: 15px;
    font-size: 11.5px;
    font-weight: 600;
    line-height: 1.3;
    text-align: center;
    opacity: 0.8;
  }
  .rm-alert {
    color: var(--fg);
    font-size: 13px;
    font-weight: 700;
    text-align: center;
  }
  .rm-alert:not(:empty) {
    padding: 4px 0 0;
  }

  /* ---------- profile cards ---------- */
  .rm-card {
    padding: 16px;
    border-radius: 18px;
    background: var(--surface);
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .rm-card h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.85;
  }
  .rm-card h2::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--a1);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a1) 25%, transparent);
  }
  .rm-level {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .rm-level b {
    font-family: var(--font-display), system-ui, sans-serif;
    font-size: 26px;
    font-weight: 400;
    line-height: 1;
  }
  .rm-level b span {
    color: var(--heart);
  }
  .rm-level small {
    font-size: 12px;
    font-weight: 600;
    opacity: 0.75;
  }
  /* the way to the top level: a heart line, a stop at each reward */
  .rm-track {
    position: relative;
    height: 74px;
    margin: 6px 22px 0;
  }
  .rm-track > i {
    position: absolute;
    left: 0;
    right: 0;
    top: 10px;
    height: 8px;
    border-radius: 999px;
    background:
      linear-gradient(90deg, var(--a1), var(--heart)) 0 0 / var(--reach) 100%
        no-repeat,
      color-mix(in srgb, var(--a1) 20%, var(--track));
  }
  .rm-track ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .rm-track li {
    position: absolute;
    left: var(--at);
    top: 0;
    display: grid;
    justify-items: center;
    gap: 1px;
    width: 76px;
    margin-left: -38px;
    text-align: center;
    opacity: 0.6;
  }
  .rm-track li span {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin-bottom: -8px;
    border-radius: 50%;
    color: var(--a1);
    background: var(--bg);
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--a1) 48%, var(--track));
    font-size: 14px;
    line-height: 1;
  }
  .rm-track li b {
    margin-top: 4px;
    font-size: 11px;
  }
  .rm-track li small {
    font-size: 10px;
    opacity: 0.8;
  }
  .rm-track li[data-open] {
    opacity: 1;
  }
  .rm-track li[data-open] span {
    color: var(--ink);
    background: var(--heart);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--heart) 30%, transparent),
      0 6px 14px -4px var(--heart);
  }
  /* one sheet of paper in the room's colours, its sections ruled apart */
  .rm-paper {
    border-radius: 22px;
    background: linear-gradient(
      165deg,
      color-mix(in srgb, var(--a1) 14%, var(--surface)),
      color-mix(in srgb, var(--a2) 30%, var(--surface))
    );
    box-shadow:
      inset 0 0 0 1px var(--line),
      0 20px 40px -28px color-mix(in srgb, var(--a1) 70%, #000);
  }
  .rm-paper > .rm-card {
    border-radius: 0;
    background: none;
    box-shadow: none;
  }
  .rm-paper > .rm-card + .rm-card {
    border-top: 1px dashed var(--line);
  }
  .rm-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .rm-radar-n {
    fill: var(--a1);
    font-size: 11px;
    font-weight: 800;
  }
  .rm-radar-hint {
    justify-self: center;
    padding: 4px 12px;
    border-radius: 999px;
    background: var(--surface);
    box-shadow: inset 0 0 0 1px var(--line);
    font-size: 12px;
    font-weight: 700;
    opacity: 0.85;
  }
  .rm-radar {
    display: grid;
    gap: 12px;
    margin: 0;
  }
  .rm-radar svg {
    display: block;
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
    overflow: visible;
  }
  .rm-radar-grid polygon,
  .rm-radar-grid line {
    fill: none;
    stroke: var(--track);
    stroke-width: 1;
  }
  .rm-radar-shape {
    fill: color-mix(in srgb, var(--a1) 45%, transparent);
    stroke: var(--a1);
    stroke-width: 2.5;
    filter: drop-shadow(0 0 6px color-mix(in srgb, var(--a1) 70%, transparent));
    stroke-linejoin: round;
  }
  .rm-radar text {
    fill: var(--fg);
    font-size: 10px;
    font-weight: 700;
  }
  .rm-stat-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 14px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 12.5px;
  }
  .rm-stat-list li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 5px 6px;
  }
  .rm-stat-list span {
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rm-stat-list b {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .rm-stat-list small {
    font-weight: 600;
    opacity: 0.6;
  }
  .rm-stat-list i {
    grid-column: 1 / -1;
    height: 6px;
    border-radius: 3px;
    background:
      linear-gradient(var(--c), var(--c)) 0 0 / var(--v) 100% no-repeat,
      var(--track);
  }
  .rm-facts {
    display: grid;
    margin: 12px 0 0;
    font-size: 13px;
    line-height: 1.4;
  }
  .rm-facts > div {
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    min-height: 44px;
    padding: 8px 0;
  }
  .rm-facts > div + div {
    border-top: 1px solid var(--line);
  }
  .rm-facts dt {
    font-weight: 600;
    opacity: 0.7;
  }
  .rm-facts dd {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
    min-width: 0;
    margin: 0;
    font-weight: 600;
  }
  .rm-facts .rm-stars {
    font-size: 15px;
    line-height: 1;
  }
  .rm-cap {
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--surface);
    box-shadow: inset 0 0 0 1px var(--line);
    font-size: 11.5px;
    font-weight: 700;
    line-height: 1.2;
  }
  /* the palette as overlapping coins; origin/invert: the artwork itself */
  .pd-dots {
    display: inline-flex;
    flex: none;
    align-items: center;
    padding-left: 6px;
  }
  .pd-dot {
    width: 18px;
    height: 18px;
    margin-left: -6px;
    border-radius: 50%;
    box-shadow:
      0 0 0 2px #fff,
      0 0 0 3px var(--line);
  }
  .pd-dots[data-effect='metal'] .pd-dot {
    background-image: linear-gradient(
      140deg,
      rgb(255 255 255 / 0.75) 0 18%,
      transparent 46%,
      rgb(0 0 0 / 0.14)
    );
  }
  .pd-art {
    width: 22px;
    height: 22px;
    background-color: #fff;
    background-position: center;
    background-repeat: no-repeat;
    background-size: 112%;
  }
  .rm-persona {
    margin: 0;
    padding: 12px 14px;
    border-radius: 14px;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--a1) 22%, transparent),
      color-mix(in srgb, var(--a2) 26%, transparent)
    );
  }
  .rm-persona b {
    font-family: var(--font-display), system-ui, sans-serif;
    font-size: 16px;
    font-weight: 400;
  }
  .rm-persona p {
    margin-top: 4px;
    font-size: 13px;
    line-height: 1.45;
    opacity: 0.9;
  }
  .rm-muted {
    font-size: 13px;
    opacity: 0.75;
  }
  .rm-field {
    display: grid;
    gap: 6px;
    margin-top: 12px;
    font-size: 12px;
    font-weight: 700;
  }
  .rm-field label {
    opacity: 0.8;
  }
  .rm-field-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
  .rm-field input {
    flex: 1 1 140px;
    min-width: 0;
    min-height: 44px;
    padding: 8px 14px;
    border: 1.5px solid var(--track);
    border-radius: 12px;
    color: var(--fg);
    background: var(--surface);
    font:
      600 14px var(--font-body),
      system-ui,
      sans-serif;
  }
  .rm-field input:focus {
    border-color: var(--a1);
  }
  .rm-field-msg {
    min-height: 1.2em;
    font-weight: 600;
  }
  .rm-btn {
    display: inline-grid;
    place-items: center;
    min-height: 44px;
    padding: 8px 18px;
    border: 1.5px solid var(--track);
    border-radius: 999px;
    color: var(--fg);
    background: transparent;
    font:
      700 13px/1.2 var(--font-body),
      system-ui,
      sans-serif;
    text-decoration: none;
    cursor: pointer;
  }
  .rm-btn:hover {
    background: var(--surface);
  }
  .rm-btn[aria-current='page'],
  .rm-primary,
  .rm-primary:hover {
    border-color: var(--a1);
    color: var(--ink);
    background: var(--a1);
  }
  .rm-btn[aria-disabled='true'] {
    opacity: 0.6;
  }
  .rm-siblings ul {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* ---------- feed sheet ---------- */
  .rm-feed {
    width: min(460px, 100vw);
    max-width: 100vw;
    max-height: 82dvh;
    margin: auto auto 0;
    padding: 0;
    border: 0;
    border-radius: 24px 24px 0 0;
    color: var(--fg);
    background: var(--bg);
    box-shadow:
      inset 0 0 0 1px var(--line),
      0 -20px 50px -20px rgba(0, 0, 0, 0.7);
    font-family: var(--font-body), system-ui, sans-serif;
  }
  .rm-feed::backdrop {
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(3px);
  }
  .rm-feed-inner {
    display: grid;
    gap: 12px;
    padding: 14px 14px calc(14px + env(safe-area-inset-bottom));
  }
  .rm-feed header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .rm-feed h2 {
    font-family: var(--font-display), system-ui, sans-serif;
    font-size: 18px;
    font-weight: 400;
    overflow-wrap: anywhere;
  }
  .rm-close {
    flex: none;
    min-width: 44px;
    min-height: 44px;
    border: 0;
    border-radius: 50%;
    color: var(--fg);
    background: var(--surface);
    font-size: 16px;
    cursor: pointer;
  }
  .rm-feed-note {
    display: grid;
    gap: 10px;
    justify-items: center;
    padding: 14px 0;
    text-align: center;
  }
  .rm-dishes {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 2px;
    overflow-y: auto;
    max-height: 54dvh;
    list-style: none;
  }
  .rm-dish {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-radius: 16px;
    color: #172d45;
    background: #fff;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .rm-dish[aria-disabled='true'] {
    opacity: 0.6;
  }
  .rm-dish[data-taste='liked'] {
    box-shadow: inset 0 0 0 2.5px #3fa463;
  }
  .rm-dish[data-taste='disliked'] {
    box-shadow: inset 0 0 0 2.5px #d64545;
  }
  .rm-dish-art {
    flex: none;
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
  }
  .rm-dish-text {
    flex: 1;
    min-width: 0;
  }
  .rm-dish-text strong {
    display: block;
    margin-bottom: 4px;
    font-size: 14px;
  }
  .rm-taste {
    flex: none;
    padding: 3px 8px;
    border-radius: 999px;
    color: #fff;
    background: #2f7d44;
    font-size: 12px;
    font-weight: 800;
  }
  .rm-dish[data-taste='disliked'] .rm-taste {
    background: #b23030;
  }

  /* ---------- desktop: the scene card left, the profile column right ---------- */
  @media (min-width: 960px) {
    --disc: clamp(220px, calc(100dvh - 555px), 400px);
    display: grid;
    grid-template-columns: minmax(0, 1fr) 400px;
    grid-template-rows: minmax(0, 1fr) auto auto;
    column-gap: 20px;
    height: calc(100dvh - 64px);
    min-height: 600px;
    padding: 16px max(20px, calc((100% - 1320px) / 2));

    .rm-room {
      grid-column: 1;
      grid-row: 1;
      min-height: 0;
      grid-template-rows: minmax(min-content, 1fr) auto;
      gap: 14px;
      padding: 26px 30px 32px;
      border-radius: 28px;
      box-shadow:
        inset 0 0 0 2px var(--line),
        0 24px 50px -30px color-mix(in srgb, var(--a1) 60%, #000);
    }
    .rm-wall {
      inset: -26px -30px 0;
    }
    .pat {
      gap: 10px;
    }
    .pat div {
      font-size: 64px;
    }
    .rm-wall-sticker {
      right: 40px;
    }
    .rm-hud {
      --hb: 56px;
      padding: 0 calc(var(--hb) + 16px);
    }
    .rm-name {
      gap: 9px;
    }
    .rm-name h1 {
      -webkit-line-clamp: 1;
      font-size: clamp(34px, 3.6vw, 52px);
    }
    .rm-name p {
      gap: 4px 12px;
      font-size: 13px;
    }
    .rm-disc {
      --ms: 76px;
      --gs: 64px;
    }
    .rm-medal small {
      font-size: 11px;
      line-height: 18px;
    }
    .rm-ring-text small {
      font-size: 11px;
    }
    .rm-ring-text b {
      font-size: 12px;
    }
    .rm-bubble {
      max-width: 440px;
      padding: 11px 20px;
      font-size: 15px;
    }
    .rm-stage {
      --pt: 36px;
      padding-bottom: 66px;
    }
    .rm-disc::before {
      inset: -26px;
    }
    .rm-disc::after {
      bottom: -46px;
      height: 18px;
    }
    .rm-sticker {
      font-size: 20px;
      padding: 8px 18px;
    }
    .rm-dock {
      display: contents;
    }
    .rm-sheet-toggle {
      display: none;
    }
    .rm-profile {
      display: grid;
      align-content: start;
      gap: 12px;
      grid-column: 2;
      grid-row: 1 / -1;
      padding: 16px 4px 16px 0;
      margin: -16px 0;
    }
    .rm-carebar {
      grid-column: 1;
      grid-row: 2;
      gap: 8px;
      padding-top: 18px;
    }
    .rm-actions {
      gap: 14px;
    }
    .rm-act {
      display: flex;
      justify-content: center;
      gap: 12px;
      min-height: 68px;
      border-radius: 20px;
      font-size: 15px;
    }
    .rm-act > span {
      width: 42px;
      height: 42px;
      font-size: 22px;
    }
    .rm-act[data-urgent]::after {
      top: 8px;
      right: 10px;
    }
    .rm-reasons {
      font-size: 12.5px;
    }
    .rm-alert {
      grid-column: 1;
      grid-row: 3;
    }
    .rm-feed {
      margin: auto;
      border-radius: 24px;
    }
  }

  @media (max-width: 359px) {
    .rm-hud {
      --hb: 44px;
    }
    .rm-disc {
      --ms: 52px;
      --gs: 46px;
    }
  }
  /* phone: let the Pokémon own the stage; smaller orbit badges sit outside it */
  @media (max-width: 599px) {
    .rm-room {
      gap: 2px;
      padding: 10px 12px 12px;
      min-height: calc(100dvh - 64px - var(--dock));
    }
    .rm-stage {
      --pt: 20px;
      padding-bottom: 44px;
    }
    .rm-disc {
      --ms: 46px;
      --gs: 38px;
      box-shadow:
        0 0 0 3px var(--a1),
        0 0 0 8px color-mix(in srgb, var(--a1) 20%, transparent),
        0 20px 46px -12px color-mix(in srgb, var(--a2) 80%, transparent);
    }
    .rm-ring {
      --out: 7px;
    }
    .rm-ring::before {
      inset: 3px;
    }
    .rm-ring-text {
      bottom: -6px;
      gap: 2px;
      padding: 0 5px;
      line-height: 13px;
    }
    .rm-ring-text small {
      font-size: 8px;
    }
    .rm-ring-text b {
      font-size: 9px;
    }
    .rm-ring-icon {
      font-size: calc(var(--gs) * 0.38);
    }
    .rm-medal {
      --out: 1px;
    }
    .rm-medal small {
      bottom: -6px;
      padding-inline: 5px;
      font-size: 8px;
      line-height: 13px;
    }
    .rm-sticker {
      display: none;
    }
    .rm-mega {
      top: calc(var(--pt) + var(--disc) * 0.2);
      font-size: calc(var(--disc) * 0.62);
    }
    .rm-door {
      top: calc(var(--pt) + var(--disc) / 2);
      height: calc(var(--disc) * 0.62);
      margin-top: calc(var(--disc) * -0.31);
    }
    .rm-name p > span:not(.rm-stars):not(.rm-count) {
      display: none;
    }
  }
  /* the narrow desktop room (~500px): the care labels stay on one line */
  @media (min-width: 960px) and (max-width: 1199px) {
    .rm-act {
      white-space: nowrap;
    }
  }
  @media (min-width: 1200px) {
    --disc: clamp(220px, calc(100dvh - 500px), 400px);
  }

  ${motion}
`
