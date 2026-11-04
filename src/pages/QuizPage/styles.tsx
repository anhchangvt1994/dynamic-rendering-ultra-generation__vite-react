import styled from 'styled-components'

/*
 * "Eyecatch": the anime's ad-break card. A night page (ContentStyle darkens
 * behind .quiz-page), a sunburst stage that owns the screen, sticker answers
 * with ink outlines and hard shadows. Phones stack HUD → stage → answers →
 * result so the next button stays in thumb reach; from 900px the stage takes
 * the left column and everything else stacks on the right.
 */
export const QuizStyle = styled.section`
  --ink: #172d45;
  --shadow-ink: #050f1c;
  --sun: #ffda55;
  --win: #1f8f52;
  --lose: #e5483b;
  --dim-text: rgba(255, 255, 255, 0.68);
  --stage-h: clamp(220px, 40svh, 440px);
  color: #fff;

  /* a breath before the answer shows (index.tsx REVEAL_AT); a catch clicks
     shut at --click (CLICK_AT) */
  &[data-state='right'],
  &[data-state='wrong'] {
    --burst: 0.12s;
  }
  .stage[data-catch] {
    --click: 1.25s;
  }

  .arena {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 1160px;
    margin: 0 auto;
    padding: 12px 12px 32px;
  }

  .ready-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    min-height: min(70svh, 620px);
    padding: 32px 16px;
    text-align: center;
    border: 2px solid #355c85;
    border-radius: 24px;
    background: radial-gradient(ellipse at top, #244e78, #091a30 75%);
  }
  .ready-screen .title {
    flex: none;
    justify-items: center;
  }
  .ready-screen p {
    max-width: 440px;
    margin: 0;
    line-height: 1.7;
  }
  .ready-screen .next {
    flex: none;
    width: auto;
    min-width: 180px;
    min-height: 56px;
    background: var(--sun);
    color: var(--ink);
  }
  .ready-ball {
    width: 88px;
    height: 88px;
    border: 5px solid var(--ink);
    border-radius: 50%;
    background: linear-gradient(#eb5448 46%, var(--ink) 46% 54%, #fff 54%);
    box-shadow: 0 8px 0 var(--shadow-ink);
  }

  /* ── HUD: title, bag, settings ── */
  .hud {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
  }
  .title {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    display: grid;
    justify-items: start;
    font-family: var(--font-display);
    font-size: clamp(23px, 7.4vw, 38px);
    line-height: 0.95 !important;
    letter-spacing: -0.01em;
    text-transform: uppercase;
    white-space: nowrap;
    color: var(--sun);
    -webkit-text-stroke: 1.5px #2a4c8f;
    paint-order: stroke fill;
    text-shadow: 0 3px 0 #2a4c8f;
    transform-origin: left bottom;
  }
  /* "Who's that" small and white over a big yellow "Pokémon?", as on the
     anime's card */
  .title span:first-child {
    color: #fff;
    font-size: 0.6em;
    letter-spacing: 0.03em;
  }
  /* to the bag page; its count on a corner badge, 999+ at most */
  .bag-toggle {
    position: relative;
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    text-decoration: none;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font: inherit;
    cursor: pointer;
  }
  .bag-toggle svg {
    width: 22px;
    height: 22px;
    fill: var(--sun);
  }
  .bag-count {
    position: absolute;
    right: -7px;
    top: -7px;
    min-width: 20px;
    height: 19px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--lose);
    color: #fff;
    font-family: var(--font-display);
    font-size: 11px;
    line-height: 19px !important;
    text-align: center;
    white-space: nowrap;
    box-shadow: 0 0 0 2px #0d1e33;
    animation: quiz-pop 420ms cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .bag-toggle:focus-visible {
    outline: 3px solid var(--sun);
    outline-offset: 2px;
  }

  /* ── progress: three rings alike, each around the ball it leads to —
     turns around a Poké Ball (5 notches), the streak around the Premier
     Ball it pays (10), the records around the Master Ball (10). No numbers:
     a tap tells the exact count and what it is for ── */
  .trainer {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
  .meter {
    --c: var(--sun);
    --off: rgba(255, 255, 255, 0.13);
    display: grid;
    justify-items: center;
    gap: 5px;
    min-width: 0;
    padding: 6px 2px 5px;
    border: none;
    border-radius: 16px;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    transition: background-color 200ms ease-out;
  }
  .meter:hover,
  .meter[aria-pressed='true'] {
    background: rgba(255, 255, 255, 0.07);
  }
  .meter:focus-visible {
    outline: 3px solid var(--sun);
    outline-offset: 1px;
  }
  .meter[data-kind='turns'] {
    --c: #ff5a4a;
  }
  .meter[data-kind='records'] {
    --c: #d38bff;
  }
  &[data-tier='2'] .meter[data-kind='streak'] {
    --c: #ff8a3c;
  }
  .meter-ring {
    position: relative;
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    animation: quiz-tick 520ms cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  /* the notches: lit up to --p of --n */
  .meter-ring::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(var(--c) calc(var(--p) * 1turn), var(--off) 0);
    -webkit-mask:
      radial-gradient(farthest-side, transparent calc(100% - 6px), #000 0),
      repeating-conic-gradient(
        from 2deg,
        #000 0 calc(360deg / var(--n) - 5deg),
        transparent 0 calc(360deg / var(--n))
      );
    -webkit-mask-composite: source-in;
    mask:
      radial-gradient(farthest-side, transparent calc(100% - 6px), #000 0)
        intersect,
      repeating-conic-gradient(
        from 2deg,
        #000 0 calc(360deg / var(--n) - 5deg),
        transparent 0 calc(360deg / var(--n))
      );
    filter: drop-shadow(0 0 4px color-mix(in srgb, var(--c) 80%, transparent));
  }
  /* a glow of its colour behind the ball */
  .meter-ring::after {
    content: '';
    position: absolute;
    inset: 9px;
    z-index: -1;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--c) 45%, transparent),
      transparent 70%
    );
  }
  .meter-ball {
    position: relative;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    box-shadow:
      inset 0 0 0 2px #14161a,
      inset -3px -4px 0 rgba(0, 0, 0, 0.16),
      0 3px 6px rgba(0, 0, 0, 0.45);
  }
  .meter-ball::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 32%;
    height: 32%;
    margin: -16% 0 0 -16%;
    border-radius: 50%;
    background: #f4f4f4;
    box-shadow: 0 0 0 2px #14161a;
  }
  .meter[data-kind='turns'] .meter-ball {
    background:
      radial-gradient(
        circle at 32% 24%,
        rgba(255, 255, 255, 0.6),
        transparent 28%
      ),
      linear-gradient(#ef4036 0 44%, #14161a 44% 56%, #f4f4f4 56%);
  }
  .meter[data-kind='streak'] .meter-ball {
    background:
      radial-gradient(
        circle at 32% 24%,
        rgba(255, 255, 255, 0.9),
        transparent 28%
      ),
      linear-gradient(#f4f4f4 0 44%, #d8262c 44% 56%, #f4f4f4 56%);
  }
  .meter[data-kind='records'] .meter-ball {
    background:
      radial-gradient(circle at 26% 30%, #ff6fb5 0 11%, transparent 12%),
      radial-gradient(circle at 74% 30%, #ff6fb5 0 11%, transparent 12%),
      radial-gradient(
        circle at 40% 18%,
        rgba(255, 255, 255, 0.5),
        transparent 24%
      ),
      linear-gradient(#7a3cc9 0 44%, #14161a 44% 56%, #f4f4f4 56%);
  }
  /* a round in play: its ball bobs */
  .meter[data-live] .meter-ball {
    animation: quiz-turn-live 1.4s ease-in-out infinite;
  }
  /* two notches from the reward: it glows and rocks */
  .meter[data-near] .meter-ball {
    animation: quiz-reward 1.1s ease-in-out infinite;
  }
  /* full: the ring turns to a rainbow */
  &[data-tier='3'] .meter[data-kind='streak'] .meter-ring::before,
  .meter[data-full][data-kind='records'] .meter-ring::before {
    background: conic-gradient(
      #ff6a4a,
      #ffda55,
      #4fd18b,
      #4aa8ff,
      #b77cff,
      #ff6a4a
    );
    animation: quiz-spin 3s linear infinite;
  }
  /* a wrong answer: the streak's ring flashes red and empties */
  .meter[data-broken] .meter-ring {
    animation: quiz-broken 700ms ease-out;
  }
  .meter-label {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--dim-text);
  }
  .meter-label[data-clock] {
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
    color: #9fe3ff;
  }
  .trainer-hint {
    grid-column: 1 / -1;
    margin: 0;
    padding: 9px 12px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.07);
    font-size: 13px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.88);
    animation: quiz-drop 240ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .trainer-hint b {
    color: var(--sun);
  }

  /* a guest: signing in, in the rings' place and at their height */
  .guest-call {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    min-height: 83px;
    padding: 10px 14px;
    border: 3px solid var(--shadow-ink);
    border-radius: 18px;
    background:
      linear-gradient(rgba(255, 255, 255, 0.25), transparent 50%),
      linear-gradient(100deg, #ffda55, #ffb02e);
    color: var(--ink);
    text-decoration: none;
    box-shadow: 4px 4px 0 var(--shadow-ink);
    transition:
      translate 120ms ease-out,
      box-shadow 120ms ease-out;
  }
  .guest-call:hover {
    translate: -2px -2px;
    box-shadow: 6px 6px 0 var(--shadow-ink);
  }
  .guest-call:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }
  .guest-balls {
    display: flex;
  }
  .guest-balls i {
    width: 26px;
    height: 26px;
    margin-left: -8px;
    border-radius: 50%;
    box-shadow:
      inset 0 0 0 2px #14161a,
      0 2px 3px rgba(0, 0, 0, 0.3);
  }
  .guest-balls i:first-child {
    margin-left: 0;
    background:
      radial-gradient(circle, #fff 0 16%, #14161a 16% 26%, transparent 26%),
      linear-gradient(#ef4036 0 44%, #14161a 44% 56%, #f4f4f4 56%);
  }
  .guest-balls i:nth-child(2) {
    background:
      radial-gradient(circle, #fff 0 16%, #14161a 16% 26%, transparent 26%),
      linear-gradient(#f4f4f4 0 44%, #d8262c 44% 56%, #f4f4f4 56%);
  }
  .guest-balls i:nth-child(3) {
    background:
      radial-gradient(circle, #fff 0 16%, #14161a 16% 26%, transparent 26%),
      radial-gradient(circle at 26% 30%, #ff6fb5 0 11%, transparent 12%),
      radial-gradient(circle at 74% 30%, #ff6fb5 0 11%, transparent 12%),
      linear-gradient(#7a3cc9 0 44%, #14161a 44% 56%, #f4f4f4 56%);
  }
  .guest-text {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .guest-text b {
    font-size: 14px;
    font-weight: 900;
    line-height: 1.2;
  }
  .guest-text small {
    font-size: 12px;
    font-weight: 700;
    color: rgba(23, 45, 69, 0.75);
  }
  .guest-arrow {
    font-size: 16px;
  }
  /* small phones: the call alone, at the rings' height */
  @media (max-width: 459px) {
    .guest-call {
      gap: 10px;
      padding: 8px 12px;
    }
    .guest-text small {
      display: none;
    }
    .guest-text b {
      font-size: 13px;
    }
    .guest-balls i {
      width: 22px;
      height: 22px;
    }
  }

  /* the stage and the prize orb hanging from it */
  .stage-wrap {
    display: flex;
    flex-direction: column;
  }

  .settings-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 44px;
    min-height: 44px;
    padding: 0 12px;
    border: none;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .settings-toggle svg {
    width: 20px;
    height: 20px;
    flex: none;
    fill: currentColor;
    transition: rotate 300ms ease-out;
  }
  .settings-toggle[aria-expanded='true'] {
    background: var(--sun);
    color: var(--ink);
  }
  .settings-toggle[aria-expanded='true'] svg {
    rotate: 90deg;
  }
  .settings-toggle:focus-visible {
    outline: 3px solid var(--sun);
    outline-offset: 2px;
  }
  @media (max-width: 459px) {
    .settings-label {
      display: none;
    }
    .settings-toggle {
      padding: 0;
    }
  }

  .settings {
    display: none;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.06);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  }
  .settings[data-open] {
    display: flex;
    animation: quiz-drop 260ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .settings label,
  .settings [class*='label'] {
    color: var(--dim-text);
  }
  .mode {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 3px;
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.25);
  }
  .mode button {
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 1px;
    min-width: 0;
    min-height: 48px;
    padding: 4px 8px;
    border: none;
    border-radius: 11px;
    background: none;
    color: var(--dim-text);
    font: inherit;
    font-size: 15px;
    font-weight: 800;
    line-height: 1.1;
    text-align: center;
    cursor: pointer;
  }
  .mode button small {
    font-size: 11px;
    font-weight: 600;
    opacity: 0.85;
    text-wrap: balance;
  }
  .mode button[aria-pressed='true'] {
    background: var(--sun);
    color: var(--ink);
  }
  .mode button:focus-visible {
    outline: 3px solid var(--sun);
    outline-offset: 1px;
  }
  .settings-note {
    margin: 0;
    font-size: 12px;
    color: var(--dim-text);
  }

  /* ── the stage ── */
  .stage {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: var(--stage-h);
    overflow: hidden;
    border-radius: 24px;
    background: radial-gradient(circle at 50% 46%, #7ad7ff 0, #1e5bb8 72%);
    box-shadow: 0 22px 40px -18px rgba(0, 0, 0, 0.7);
    isolation: isolate;
    container-type: inline-size;
    transform: perspective(1100px) rotateX(var(--rx, 0deg))
      rotateY(var(--ry, 0deg));
    transition: transform 500ms cubic-bezier(0.2, 0.9, 0.3, 1);
  }
  .stage[data-tilt] {
    transition: transform 120ms ease-out;
  }
  /* the hologram's glare, under the pointer */
  .glare {
    position: absolute;
    inset: 0;
    z-index: 3;
    border-radius: inherit;
    background: radial-gradient(
      circle at var(--gx, 50%) var(--gy, 20%),
      rgba(255, 255, 255, 0.24),
      transparent 46%
    );
    opacity: 0;
    pointer-events: none;
    transition: opacity 300ms ease-out;
  }
  .stage[data-tilt] .glare {
    opacity: 1;
  }
  .stage--empty {
    gap: 12px;
    padding: 24px;
    text-align: center;
    font-weight: 700;
  }
  /* over the meadow the Pokémon fled from */
  .stage--empty > :not(.wild-grass) {
    position: relative;
    z-index: 3;
  }
  .stage--empty > p {
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  }
  .burst {
    position: absolute;
    inset: -50%;
    z-index: -1;
    background: repeating-conic-gradient(
      from 0deg,
      rgba(255, 255, 255, 0.17) 0 7deg,
      transparent 7deg 18deg
    );
    animation: quiz-spin 50s linear infinite;
    /* depth: the rays drift against the pointer, the silhouette with it */
    translate: calc(var(--tx, 0) * -0.7px) calc(var(--ty, 0) * -0.7px);
    transition: translate 300ms ease-out;
  }
  /* the frame: brighter as the streak grows */
  .ring {
    position: absolute;
    inset: 0;
    z-index: 3;
    border-radius: inherit;
    box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.22);
    pointer-events: none;
    transition: box-shadow 400ms ease-out;
  }
  /* the streak lights the stage from outside: the frame is the fuse's */
  &[data-tier='1'] .stage {
    box-shadow:
      0 0 0 3px var(--sun),
      0 0 34px rgba(255, 218, 85, 0.35),
      0 22px 40px -18px rgba(0, 0, 0, 0.7);
  }
  &[data-tier='2'] .stage {
    box-shadow:
      0 0 0 3px #ff6a4a,
      0 0 44px rgba(255, 106, 74, 0.55),
      0 22px 40px -18px rgba(0, 0, 0, 0.7);
  }
  &[data-tier='3'] .stage {
    box-shadow:
      0 0 0 3px #fff,
      -18px -10px 46px rgba(255, 106, 74, 0.6),
      18px -10px 46px rgba(79, 209, 139, 0.55),
      0 18px 46px rgba(74, 168, 255, 0.6),
      0 -18px 46px rgba(183, 124, 255, 0.55);
  }

  /* the silhouette and what hides it (Veil.tsx), tilted as one; time
     stopped lights it (--lit, set by Veil.tsx) so its colours show */
  .veil {
    --silhouette: brightness(var(--lit, 0))
      drop-shadow(0 0 1.5px rgba(255, 255, 255, 0.9))
      drop-shadow(0 0 22px rgba(160, 230, 255, 0.55));
    position: relative;
    width: min(70%, calc(var(--stage-h) * 0.76));
    aspect-ratio: 1;
    top: 0;
    transform: rotate(-4deg);
    translate: calc(var(--tx, 0) * 1px) calc(var(--ty, 0) * 1px);
    transition:
      translate 300ms ease-out,
      top 500ms cubic-bezier(0.2, 0.9, 0.3, 1) var(--burst, 0s),
      scale 500ms cubic-bezier(0.2, 0.9, 0.3, 1) var(--burst, 0s);
  }
  /* answered: the Pokémon steps up, its name takes the floor */
  &[data-state='right'] .veil,
  &[data-state='wrong'] .veil {
    top: -7%;
    scale: 0.86;
  }
  .mon {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    /* who's that Pokémon: solid black with a thin cold rim */
    filter: var(--silhouette);
    transition: filter 380ms ease-out;
    opacity: 0;
  }
  .mon[data-loaded] {
    opacity: 1;
    animation: quiz-enter 520ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  /* right: the colour wipes out from the middle; wrong: the signal glitches */
  &[data-state='right'] .mon {
    filter: drop-shadow(0 12px 18px rgba(0, 0, 0, 0.4));
    animation:
      quiz-hold var(--burst) steps(1, end),
      quiz-wipe 620ms cubic-bezier(0.2, 0.9, 0.2, 1) var(--burst);
  }
  &[data-state='wrong'] .mon {
    filter: drop-shadow(0 12px 18px rgba(0, 0, 0, 0.4));
    animation:
      quiz-hold var(--burst) steps(1, end),
      quiz-split 520ms steps(6, end) var(--burst);
  }
  /* caught: swallowed by the thrown ball as red light */
  .stage[data-catch] .veil {
    animation: quiz-absorb 520ms linear both;
  }
  /* a right answer turns the rays gold */
  .burst::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-conic-gradient(
      from 0deg,
      rgba(255, 218, 85, 0.5) 0 7deg,
      transparent 7deg 18deg
    );
    opacity: 0;
  }
  &[data-state='right'] .burst::after {
    animation: quiz-show 500ms ease-out var(--burst) forwards;
  }
  &[data-state='right'] .stage {
    animation: quiz-thump 340ms ease-out var(--burst);
  }
  &[data-state='wrong'] .stage {
    animation: quiz-glitch 380ms steps(2, end) var(--burst);
  }
  &[data-state='wrong'] .stage::before {
    opacity: 0;
    content: '';
    position: absolute;
    inset: 0;
    z-index: 2;
    background: repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.14) 0 2px,
      transparent 2px 5px
    );
    pointer-events: none;
    animation: quiz-static 700ms ease-out var(--burst) forwards;
  }

  /* ── the capture ── */
  .capture {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
  }
  .ball {
    position: absolute;
    left: 50%;
    top: 50%;
    width: clamp(56px, 19cqw, 112px);
    aspect-ratio: 1;
    margin: calc(clamp(56px, 19cqw, 112px) / -2) 0 0
      calc(clamp(56px, 19cqw, 112px) / -2);
    animation: quiz-throw 650ms linear both;
  }
  .ball-body {
    position: absolute;
    inset: 0;
    transform-origin: 50% 90%;
    filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.35));
  }
  .ball-body svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .stage[data-catch] .ball-body {
    animation: quiz-wobble-3 600ms ease-in-out 650ms both;
  }
  /* held: the ball glints once it has clicked */
  .stage[data-catch='done'] .ball-body {
    animation: quiz-glint 2.4s ease-in-out infinite;
  }
  /* the ball opens on the silhouette: a red flash from its button */
  .ball-body::after {
    content: '';
    position: absolute;
    inset: -60%;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.95) 0 12%,
      rgba(255, 70, 50, 0.75) 26%,
      transparent 62%
    );
    opacity: 0;
    animation: quiz-open 360ms ease-out 280ms both;
  }
  .ball-button {
    fill: #fff;
  }
  .stage[data-catch] .ball-button {
    animation: quiz-lock 200ms steps(1, end) 1.2s both;
  }
  /* the "click": three little stars once it holds */
  .ball-stars i {
    position: absolute;
    left: 50%;
    top: 0;
    width: 30%;
    aspect-ratio: 1;
    margin-left: -15%;
    background: var(--sun);
    clip-path: polygon(
      50% 0,
      61% 35%,
      98% 35%,
      68% 57%,
      79% 91%,
      50% 70%,
      21% 91%,
      32% 57%,
      2% 35%,
      39% 35%
    );
    opacity: 0;
    animation: quiz-click 420ms ease-out 1.18s both;
  }
  .ball-stars i:nth-child(1) {
    --to: -90%, -70%;
  }
  .ball-stars i:nth-child(2) {
    --to: 0, -110%;
  }
  .ball-stars i:nth-child(3) {
    --to: 90%, -70%;
  }
  /* the click: a shock ring and anime speed lines */
  .shock {
    position: absolute;
    left: 50%;
    top: calc(50% + 6cqw);
    width: 20cqw;
    aspect-ratio: 1;
    margin: -10cqw 0 0 -10cqw;
    border: 4px solid #fff;
    border-radius: 50%;
    opacity: 0;
    animation: quiz-shock 600ms cubic-bezier(0.1, 0.8, 0.3, 1) var(--click)
      forwards;
  }
  .speedlines {
    position: absolute;
    inset: -40%;
    background: repeating-conic-gradient(
      from 3deg at 50% calc(50% + 6cqw),
      transparent 0 5deg,
      rgba(255, 255, 255, 0.65) 5deg 5.7deg
    );
    -webkit-mask-image: radial-gradient(
      circle at 50% calc(50% + 6cqw),
      transparent 18%,
      #000 46%
    );
    mask-image: radial-gradient(
      circle at 50% calc(50% + 6cqw),
      transparent 18%,
      #000 46%
    );
    opacity: 0;
    animation: quiz-speed 700ms ease-out var(--click) forwards;
  }
  .fx {
    position: absolute;
    inset: 0;
    z-index: 4;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  /* ── veils: --k goes 1 → 0 as the veil wears off ── */
  .warp {
    position: absolute;
    width: 0;
    height: 0;
  }
  /* seen through water: rippled, blurred, calming down */
  .stage[data-veiled][data-veil='warp'] .mon {
    filter: var(--warp) blur(calc(var(--k, 1) * 4px)) var(--silhouette);
    transition: none;
  }
  /* shattered: the pieces fly back together, the seams vanish at the end */
  .shards {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    filter: var(--silhouette);
  }
  .shards span {
    background-size: 400% 400%;
    background-position: calc(var(--col) * 100% / 3) calc(var(--row) * 100% / 3);
    transform: translate(
        calc(var(--dx) * var(--k, 1)),
        calc(var(--dy) * var(--k, 1))
      )
      rotate(calc(var(--rot) * var(--k, 1)))
      scale(calc(1 + (var(--s) - 1) * var(--k, 1)));
  }
  .stage[data-veiled][data-veil='shards']:not([data-veil-done]) .mon {
    opacity: 0;
    animation: none;
  }
  .stage[data-veil-done] .shards {
    display: none;
  }
  /* a torch on a dark stage: the beam roams (or follows the player) and
     widens; vertical swipes still scroll the page */
  .stage[data-veiled][data-veil='torch'] {
    --beam: calc(13% + (1 - var(--k, 1)) * 110%);
    cursor: crosshair;
    touch-action: pan-y;
  }
  .stage[data-veiled][data-veil='torch']::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: rgba(4, 12, 32, calc(var(--k, 1) * 0.8));
    pointer-events: none;
  }
  .stage[data-veiled][data-veil='torch'] .mon {
    -webkit-mask-image: radial-gradient(
      var(--beam) var(--beam) at var(--x, 50%) var(--y, 50%),
      #000 62%,
      transparent 100%
    );
    mask-image: radial-gradient(
      var(--beam) var(--beam) at var(--x, 50%) var(--y, 50%),
      #000 62%,
      transparent 100%
    );
  }
  /* the light on the wall behind the silhouette */
  .beam {
    /* three times the silhouette's box, so the widest beam never meets an edge */
    position: absolute;
    inset: -100%;
    z-index: -1;
    pointer-events: none;
    background: radial-gradient(
      calc(var(--beam) * 0.3) calc(var(--beam) * 0.3) at
        calc((100% + var(--x, 50%)) / 3) calc((100% + var(--y, 50%)) / 3),
      rgba(255, 244, 196, 0.95),
      rgba(255, 214, 120, 0.55) 45%,
      rgba(255, 214, 120, 0) 100%
    );
  }

  /* the round's veil, announced like an eyecatch title, then gone */
  .title-card {
    position: absolute;
    left: 50%;
    top: 24%;
    z-index: 5;
    padding: 6px 16px 8px;
    border-radius: 10px;
    background: var(--ink);
    color: #fff;
    font-family: var(--font-display);
    font-size: clamp(20px, 7cqw, 38px);
    line-height: 1 !important;
    text-transform: uppercase;
    white-space: nowrap;
    box-shadow: 5px 5px 0 var(--sun);
    translate: -50% -50%;
    rotate: -6deg;
    pointer-events: none;
    animation: quiz-title 1.3s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
  }

  /* inside the fuse's lane, never on it */
  .cry {
    position: absolute;
    right: 12px;
    top: 12px;
    z-index: 5;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 44px;
    min-height: 44px;
    padding: 0 14px 0 10px;
    border: none;
    border-radius: 999px;
    background: rgba(5, 15, 28, 0.6);
    color: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .cry svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }
  .cry:focus-visible {
    outline: 2px solid var(--sun);
    outline-offset: 2px;
  }
  @media (max-width: 399px) {
    .cry {
      padding: 0;
    }
    .cry-label {
      display: none;
    }
  }

  /* ── the Roar of Time: the world holds still ── */
  .veil {
    transition: filter 400ms ease-out;
  }
  /* the Pokémon keeps its colours: they are the stop's best hint */
  .stage[data-frozen] .veil {
    filter: brightness(1.08) contrast(1.05);
    transition-duration: 200ms;
  }
  .time-note {
    position: absolute;
    left: 12px;
    top: 64px;
    z-index: 6;
    margin: 0;
    padding: 7px 12px;
    border-radius: 10px;
    background: rgba(5, 15, 28, 0.82);
    color: #ffd2c9;
    font-size: 13px;
    font-weight: 700;
    animation: quiz-note 3.5s ease both;
  }
  @keyframes quiz-note {
    0% {
      opacity: 0;
      transform: translateY(-4px);
    }
    8%,
    85% {
      opacity: 1;
      transform: none;
    }
    100% {
      opacity: 0;
    }
  }
  /* the gift sealed in a time crystal, cracking in the last 3 s */
  .stage-wrap[data-frozen] .prize-orb {
    box-shadow:
      0 0 0 3px rgba(225, 246, 255, 0.9),
      0 0 0 7px rgba(127, 211, 255, 0.35),
      0 0 26px rgba(127, 211, 255, 0.85);
    transition: box-shadow 200ms;
  }
  .stage-wrap[data-frozen] .prize-core::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 3;
    background:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23e9fbff' d='M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z'/%3E%3C/svg%3E")
        no-repeat 50% 82% / 30% auto,
      linear-gradient(
        125deg,
        rgba(235, 250, 255, 0.55) 0 22%,
        rgba(127, 211, 255, 0.12) 22% 48%,
        rgba(255, 255, 255, 0.35) 48% 54%,
        rgba(127, 211, 255, 0.2) 54%
      );
    animation: quiz-seal 260ms ease-out both;
  }
  .stage-wrap[data-frozen='late'] .prize-core::after {
    background:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M50 0L44 30 58 46 40 62 52 100M44 30L20 22M58 46L86 38M40 62L14 76' fill='none' stroke='white' stroke-width='3'/%3E%3C/svg%3E")
        no-repeat 50% 50% / 100% 100%,
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23e9fbff' d='M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z'/%3E%3C/svg%3E")
        no-repeat 50% 82% / 30% auto,
      linear-gradient(
        125deg,
        rgba(235, 250, 255, 0.55) 0 22%,
        rgba(127, 211, 255, 0.12) 22% 48%,
        rgba(255, 255, 255, 0.35) 48% 54%,
        rgba(127, 211, 255, 0.2) 54%
      );
  }
  .stage-wrap[data-frozen='late'] .prize-orb {
    animation: quiz-strain 180ms linear infinite;
  }
  @keyframes quiz-seal {
    from {
      opacity: 0;
      transform: scale(1.3);
    }
  }
  @keyframes quiz-strain {
    25% {
      transform: translateX(-1px) rotate(-1deg);
    }
    75% {
      transform: translateX(1px) rotate(1deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .stage-wrap[data-frozen] .prize-orb,
    .stage-wrap[data-frozen] .prize-core::after,
    .time-note {
      animation: none;
    }
  }

  /* ── the reveal ── */
  .flash {
    position: absolute;
    inset: 0;
    z-index: 4;
    background: #fff;
    opacity: 0;
    pointer-events: none;
    animation: quiz-flash 520ms ease-out var(--burst) forwards;
  }
  .reveal {
    position: absolute;
    left: 50%;
    bottom: 48px;
    z-index: 4;
    margin: 0;
    padding: 4px 14px 6px;
    border-radius: 9px;
    background: var(--ink);
    font-family: var(--font-display);
    /* one line, whatever the name: index.tsx shrinks long names to fit */
    font-size: min(36px, 8cqw);
    line-height: 1.05 !important;
    text-align: center;
    text-transform: uppercase;
    white-space: nowrap;
    color: var(--sun);
    box-shadow: 4px 4px 0 var(--sun);
    pointer-events: none;
    translate: -50% 0;
    rotate: -4deg;
    animation: quiz-slam 520ms cubic-bezier(0.3, 1.6, 0.4, 1)
      calc(var(--burst, 0s) + 180ms) both;
  }
  /* caught: a tag pinned to the name */
  .reveal[data-caught]::after {
    content: 'Đã bắt!';
    position: absolute;
    right: -10px;
    top: -18px;
    padding: 4px 10px 5px;
    border-radius: 8px;
    background: var(--win);
    color: #fff;
    font-size: max(13px, 0.36em);
    box-shadow: 3px 3px 0 var(--shadow-ink);
    rotate: 10deg;
    animation: quiz-stamp 480ms cubic-bezier(0.3, 1.6, 0.4, 1) both;
  }
  &[data-state='wrong'] .reveal {
    color: #fff;
    box-shadow: 4px 4px 0 var(--lose);
  }
  /* ── answers: stickers with an ink outline and a hard shadow ── */
  .options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .options li:nth-child(odd) {
    --tilt: -1deg;
  }
  .options li:nth-child(even) {
    --tilt: 1deg;
  }
  .options button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 60px;
    padding: 8px 10px 8px 8px;
    border: 3px solid var(--shadow-ink);
    border-radius: 16px;
    background: var(--sun);
    color: var(--ink);
    font: inherit;
    font-family: var(--font-display);
    font-size: 15px;
    line-height: 1.15 !important;
    text-align: left;
    cursor: pointer;
    box-shadow: 4px 4px 0 var(--shadow-ink);
    rotate: var(--tilt);
    transition:
      translate 120ms ease-out,
      box-shadow 120ms ease-out;
    animation: quiz-option 380ms cubic-bezier(0.3, 1.5, 0.5, 1)
      calc(var(--i) * 60ms) both;
  }
  /* one line per name: index.tsx shrinks a long name to fit its slab */
  .options button {
    --fs: 15px;
  }
  .options button span {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    font-size: var(--fs);
  }
  .options button:hover:not(:disabled) {
    translate: -2px -2px;
    box-shadow: 6px 6px 0 var(--shadow-ink);
  }
  .options button:active:not(:disabled) {
    translate: 3px 3px;
    box-shadow: 1px 1px 0 var(--shadow-ink);
  }
  .options button:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }
  .options button:disabled {
    cursor: default;
  }
  /* ── Palkia took it: pulled into a black hole like spaghetti, inside its
     own cell (transforms only: the grid never moves), then nothing ── */
  .options li {
    position: relative;
  }
  .options li[data-removed] button {
    pointer-events: none;
  }
  .options li[data-removed='fresh'] button {
    animation: palkia-spaghetti 1150ms cubic-bezier(0.6, 0, 0.8, 0.3) 240ms both;
  }
  /* the options left ripple like heat haze around the holes (PalkiaRift) */
  .options[data-bending] li:not([data-removed]) button {
    filter: url(#palkia-twist);
  }
  .options li[data-removed='gone'] button {
    opacity: 0;
    visibility: hidden;
  }
  /* the silhouette bends as if seen through the hole's lens */
  .stage[data-lensing] .veil {
    filter: url(#palkia-lens) brightness(1.08);
  }
  @keyframes palkia-spaghetti {
    0% {
      transform: none;
      filter: none;
      opacity: 1;
    }
    /* tidal pull: stretched toward the hole, squeezed across it */
    25% {
      transform: scale(1.1, 0.78) skewX(-12deg);
    }
    50% {
      transform: scale(1.45, 0.14) rotate(-25deg);
      filter: blur(0.5px) brightness(1.2);
    }
    78% {
      transform: scale(0.5, 0.05) rotate(-200deg);
      filter: blur(1.5px) brightness(1.8);
      opacity: 0.85;
    }
    100% {
      transform: scale(0) rotate(-420deg);
      filter: blur(3px) brightness(3);
      opacity: 0;
      visibility: hidden;
    }
  }
  /* bottom left: the image and the prize orb stay clear */
  .palkia-letter {
    position: absolute;
    left: 12px;
    bottom: 12px;
    z-index: 6;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 4px 12px 4px 6px;
    border: 1.5px solid rgba(255, 190, 230, 0.7);
    border-radius: 999px;
    background: rgba(40, 10, 50, 0.75);
    color: #ffe3f4;
    font-size: 13px;
    font-weight: 700;
    box-shadow: 0 0 14px rgba(255, 124, 207, 0.45);
    animation: palkia-pop 420ms cubic-bezier(0.3, 1.6, 0.5, 1) both;
  }
  .palkia-letter b {
    color: #fff;
    font-family: var(--font-display);
    font-size: 19px;
    line-height: 1 !important;
  }
  .pl-pearl {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #fff, #ffb8e2 45%, #b07cff);
  }
  /* one line along the top edge, gone in 3 s: the Pokémon stays in view */
  .palkia-note {
    position: absolute;
    left: 50%;
    top: 54px;
    z-index: 6;
    width: max-content;
    max-width: calc(100% - 24px);
    margin: 0;
    padding: 5px 12px;
    border-radius: 999px;
    background: linear-gradient(135deg, #ffe3f4, #e6d8ff);
    color: #4a1d5c;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-shadow: 0 0 18px rgba(255, 124, 207, 0.6);
    translate: -50% 0;
    animation: palkia-note 3s ease both;
  }
  @keyframes palkia-pop {
    from {
      opacity: 0;
      transform: scale(0.6);
    }
  }
  @keyframes palkia-note {
    0% {
      opacity: 0;
      transform: translateY(-8px) scale(0.92);
    }
    8%,
    85% {
      opacity: 1;
      transform: none;
    }
    100% {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .options li[data-removed='fresh'] button {
      animation: palkia-fade 600ms ease-out both;
    }
    .palkia-letter,
    .palkia-note {
      animation: none;
    }
    @keyframes palkia-fade {
      to {
        opacity: 0;
        visibility: hidden;
      }
    }
  }
  .options kbd {
    display: grid;
    place-items: center;
    flex: none;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: var(--ink);
    color: var(--sun);
    font: inherit;
    font-size: 14px;
  }
  /* ── hard mode: type the name ── */
  .guess label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 700;
    color: var(--dim-text);
  }
  .guess-row {
    display: flex;
    gap: 8px;
  }
  .guess input {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 56px;
    padding: 0 16px;
    border: 3px solid var(--shadow-ink);
    border-radius: 16px;
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 17px;
    font-weight: 700;
    box-shadow: 4px 4px 0 var(--shadow-ink);
  }
  .guess input:focus-visible {
    outline: 3px solid var(--sun);
    outline-offset: 2px;
  }
  .guess button[type='submit'] {
    flex: none;
    min-height: 56px;
    padding: 0 20px;
    border: 3px solid var(--shadow-ink);
    border-radius: 16px;
    background: var(--sun);
    color: var(--ink);
    font: inherit;
    font-family: var(--font-display);
    font-size: 16px;
    box-shadow: 4px 4px 0 var(--shadow-ink);
    cursor: pointer;
  }
  .guess button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .guess button:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .skip {
    min-height: 44px;
    margin-top: 4px;
    padding: 0 2px;
    border: none;
    background: none;
    color: var(--dim-text);
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }

  /* ── result ── */
  .result {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  /* ── the verdict, where the answers were ── */
  .verdict {
    --tone: #63e6a0;
    --tone-bg: rgba(31, 143, 82, 0.38);
    display: grid;
    /* a wide row never widens the panel past its padding */
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    padding: 14px;
    border: 3px solid var(--shadow-ink);
    border-radius: 22px;
    background: linear-gradient(
      160deg,
      var(--tone-bg),
      rgba(5, 15, 28, 0.7) 65%
    );
    box-shadow: 5px 5px 0 var(--shadow-ink);
    animation: quiz-verdict 520ms cubic-bezier(0.2, 1.3, 0.4, 1)
      var(--burst, 0s) both;
  }
  .verdict[data-tone='wrong'] {
    --tone: #ff8f80;
    --tone-bg: rgba(229, 72, 59, 0.34);
  }
  .verdict[data-tone='time'] {
    --tone: #ffb36b;
    --tone-bg: rgba(120, 90, 60, 0.4);
  }
  .verdict-head {
    display: grid;
    gap: 6px;
  }
  /* Vietnamese capitals stack their marks above the cap height (HẾT GIỜ):
     the line box leaves them room, and the 3px ink shadow its own */
  .verdict-title {
    margin: 0;
    padding-top: 2px;
    font-family: var(--font-display);
    font-size: clamp(28px, 9vw, 40px);
    line-height: 1.16 !important;
    text-transform: uppercase;
    color: var(--tone);
    -webkit-text-stroke: 1.5px var(--shadow-ink);
    paint-order: stroke fill;
    text-shadow: 0 3px 0 var(--shadow-ink);
    transform-origin: left center;
    animation: quiz-slam 480ms cubic-bezier(0.3, 1.6, 0.4, 1)
      calc(var(--burst, 0s) + 120ms) both;
  }
  .verdict-sub {
    margin: 0;
    font-size: 14px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.82);
  }
  .verdict-sub b {
    color: var(--tone);
  }
  .coach {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--dim-text);
  }
  .coach b {
    color: var(--sun);
  }
  .actions {
    display: flex;
    gap: 10px;
  }
  .verdict .next {
    padding: 0 12px;
  }
  /* catching is the player's call, and only after a right answer */
  .catch {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 8px;
    min-height: 58px;
    padding: 0 18px 0 14px;
    border: 3px solid var(--shadow-ink);
    border-radius: 16px;
    background: var(--sun);
    color: var(--ink);
    font: inherit;
    font-family: var(--font-display);
    font-size: 17px;
    text-transform: uppercase;
    box-shadow: 4px 4px 0 var(--shadow-ink);
    cursor: pointer;
    animation: quiz-fade 300ms ease-out var(--burst, 0s) both;
  }
  .catch svg {
    width: 26px;
    height: 26px;
  }
  .catch:not(:disabled):hover svg {
    animation: quiz-wobble-1 500ms ease-in-out;
  }
  .catch:active:not(:disabled) {
    translate: 3px 3px;
    box-shadow: 1px 1px 0 var(--shadow-ink);
  }
  .catch:disabled {
    cursor: default;
  }
  .catch:disabled:not([data-done]) {
    opacity: 0.7;
  }
  .catch[data-done] {
    background: var(--win);
    color: #fff;
    /* over the site's dimmed disabled buttons: done is not unavailable */
    opacity: 1;
  }
  .catch:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }
  /* narrow phones (320): the ball says "catch" (its label stays for
     screen readers), the next button gets the room and a smaller type */
  @media (max-width: 359px) {
    .catch {
      padding: 0 14px;
    }
    .catch-label {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    .verdict .next {
      font-size: 16px;
    }
  }
  .next {
    flex: 1 1 auto;
    min-width: 0;
    text-wrap: balance;
    line-height: 1.05 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 58px;
    padding: 0 20px;
    border: 3px solid var(--shadow-ink);
    border-radius: 16px;
    background: var(--lose);
    color: #fff;
    font: inherit;
    font-family: var(--font-display);
    font-size: 18px;
    text-transform: uppercase;
    box-shadow: 4px 4px 0 var(--shadow-ink);
    cursor: pointer;
    animation: quiz-option 360ms cubic-bezier(0.3, 1.5, 0.5, 1) both;
  }
  .next:active {
    translate: 3px 3px;
    box-shadow: 1px 1px 0 var(--shadow-ink);
  }
  .next:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }
  /* a chest to open first: the button turns to gold */
  .next[data-chest] {
    background: linear-gradient(100deg, #ffcf3a, #fff1a8 50%, #ffcf3a);
    background-size: 200% 100%;
    color: var(--ink);
    box-shadow:
      4px 4px 0 var(--shadow-ink),
      0 0 26px rgba(255, 207, 58, 0.7);
    animation:
      quiz-option 360ms cubic-bezier(0.3, 1.5, 0.5, 1) both,
      quiz-shine 1.6s linear infinite;
  }
  .next[data-chest='special'] {
    background-image: linear-gradient(100deg, #b77cff, #ffc4f0 50%, #b77cff);
    box-shadow:
      4px 4px 0 var(--shadow-ink),
      0 0 30px rgba(183, 124, 255, 0.8);
  }
  a.next {
    text-decoration: none;
  }
  .last-turn {
    margin: 0;
    font-size: 13px;
    color: #9fe3ff;
  }
  .stage--empty .next {
    width: auto;
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 18px;
  }
  .links a,
  .links button {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0;
    border: none;
    background: none;
    color: var(--dim-text);
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
  .links a:hover,
  .links button:hover {
    color: #fff;
  }
  .shared {
    margin: 0;
    font-size: 13px;
    color: var(--dim-text);
  }

  /* the smallest phones: tighter HUD, smaller stickers */
  @media (max-width: 359px) {
    .next,
    .catch {
      padding: 0 12px;
      font-size: 15px;
    }
    .title {
      font-size: 26px;
    }
    .options button {
      --fs: 13px;
      gap: 7px;
      padding: 6px 8px 6px 6px;
    }
    .options kbd {
      width: 24px;
      height: 24px;
      font-size: 12px;
    }
  }

  @media (max-height: 700px) {
    --stage-h: clamp(220px, 40svh, 460px);
  }

  /* ── 900px+: the stage on the left, the game on the right ── */
  @media (min-width: 900px) {
    --stage-h: min(640px, calc(100svh - 160px));

    .arena {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(340px, 0.85fr);
      grid-template-areas:
        'stage hud'
        'stage status'
        'stage settings'
        'stage play'
        'stage result';
      grid-template-rows: auto auto auto auto 1fr;
      align-items: start;
      gap: 18px 36px;
      padding: 28px 24px 48px;
    }
    &[data-phase='ready'] .arena {
      grid-template-areas:
        'ready settings'
        'ready status'
        'ready links';
      grid-template-rows: auto auto 1fr;
    }
    &[data-phase='ready'] .ready-screen {
      grid-area: ready;
      min-width: 0;
    }
    &[data-phase='ready'] .quick {
      grid-area: links;
    }
    .hud {
      grid-area: hud;
      align-items: flex-end;
      gap: 12px;
      /* room for the bag's badge, the last thing on the row */
      padding-right: 10px;
    }
    .title {
      font-size: clamp(38px, 3.3vw, 50px);
      /* tilted like the eyecatch card where there is room for it */
      transform: rotate(-3deg);
      -webkit-text-stroke-width: 2.5px;
      text-shadow:
        0 6px 0 #2a4c8f,
        0 16px 28px rgba(0, 0, 0, 0.35);
    }
    .trainer {
      grid-area: status;
    }
    .guest-call {
      grid-area: status;
      min-height: 99px;
    }
    .meter-ring {
      width: 66px;
      height: 66px;
    }
    .meter-ring::after {
      inset: 12px;
    }
    .meter-ball {
      width: 38px;
      height: 38px;
    }
    .meter-label {
      font-size: 11px;
    }
    .settings-toggle {
      display: none;
    }
    .settings {
      grid-area: settings;
      display: flex;
    }
    .stage-wrap {
      grid-area: stage;
      grid-row: 1 / -1;
    }
    .stage {
      height: var(--stage-h);
      border-radius: 32px;
    }
    .veil {
      width: min(66%, calc(var(--stage-h) * 0.7));
    }
    .options,
    .guess,
    .verdict {
      grid-area: play;
    }
    .coach {
      grid-area: result;
    }
    .options button {
      --fs: 17px;
      min-height: 68px;
    }
    .result {
      grid-area: result;
    }
  }

  @keyframes quiz-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes quiz-enter {
    from {
      transform: translateY(16px) scale(0.92);
      opacity: 0;
    }
  }
  @keyframes quiz-wipe {
    0% {
      clip-path: circle(0% at 50% 50%);
      filter: brightness(3) saturate(0);
      transform: scale(1.08);
    }
    60% {
      filter: brightness(1.3);
    }
    100% {
      clip-path: circle(75% at 50% 50%);
      transform: none;
    }
  }
  @keyframes quiz-split {
    0%,
    66% {
      filter: drop-shadow(5px 0 0 rgba(255, 0, 90, 0.85))
        drop-shadow(-5px 0 0 rgba(0, 220, 255, 0.85));
      transform: translateX(-4px) skewX(-6deg);
    }
    33% {
      transform: translateX(5px) skewX(5deg);
    }
  }
  @keyframes quiz-glitch {
    33% {
      translate: -5px 2px;
    }
    66% {
      translate: 5px -2px;
    }
  }
  @keyframes quiz-thump {
    20% {
      translate: 0 7px;
      scale: 1.015;
    }
    45% {
      translate: -4px -3px;
    }
    70% {
      translate: 3px 2px;
    }
  }
  /* the silhouette keeps its black until the burst */
  @keyframes quiz-hold {
    from,
    to {
      filter: var(--silhouette);
      clip-path: none;
    }
  }
  /* thrown from the corner in an arc, opens on the silhouette, drops */
  @keyframes quiz-throw {
    0% {
      translate: -62cqw 58cqw;
      rotate: -620deg;
      scale: 0.6;
      animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1);
    }
    44% {
      translate: 0 -10cqw;
      rotate: 0deg;
      scale: 1;
    }
    74% {
      translate: 0 -10cqw;
      animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.4);
    }
    90% {
      translate: 0 6cqw;
      animation-timing-function: ease-out;
    }
    95% {
      translate: 0 1cqw;
      animation-timing-function: ease-in;
    }
    100% {
      translate: 0 6cqw;
    }
  }
  @keyframes quiz-open {
    0% {
      opacity: 0;
      scale: 0.3;
    }
    35% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      scale: 1.6;
    }
  }
  @keyframes quiz-wobble-3 {
    0%,
    12%,
    30%,
    46%,
    64%,
    80%,
    100% {
      rotate: 0deg;
    }
    6% {
      rotate: -22deg;
    }
    38% {
      rotate: 20deg;
    }
    72% {
      rotate: -16deg;
    }
  }
  @keyframes quiz-wobble-1 {
    0%,
    100% {
      rotate: 0deg;
    }
    35% {
      rotate: 26deg;
    }
    70% {
      rotate: -14deg;
    }
  }
  @keyframes quiz-lock {
    from,
    to {
      fill: #ffda55;
    }
  }
  @keyframes quiz-click {
    0% {
      opacity: 0;
      transform: translate(0, 0) scale(0.2);
    }
    40% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(var(--to)) scale(1) rotate(90deg);
    }
  }
  @keyframes quiz-shock {
    0% {
      opacity: 1;
      scale: 0.2;
      border-width: 10px;
    }
    100% {
      opacity: 0;
      scale: 9;
      border-width: 1px;
    }
  }
  @keyframes quiz-speed {
    0% {
      opacity: 0;
      scale: 1.5;
    }
    25% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      scale: 1;
    }
  }
  /* 0–280 ms waiting for the ball to open, then swallowed as red light */
  @keyframes quiz-absorb {
    0%,
    54% {
      scale: 1;
      opacity: 1;
      filter: none;
    }
    66% {
      filter: drop-shadow(0 0 10px #ff3b30) drop-shadow(0 0 3px #fff)
        brightness(1.4);
    }
    100% {
      scale: 0.04;
      translate: 0 -10cqw;
      opacity: 0;
      filter: drop-shadow(0 0 16px #ff3b30);
    }
  }
  @keyframes quiz-glint {
    0%,
    80%,
    100% {
      filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.35));
    }
    88% {
      filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.35)) brightness(1.5)
        drop-shadow(0 0 10px #fff);
    }
  }
  @keyframes quiz-turn-live {
    50% {
      rotate: -14deg;
      scale: 1.12;
    }
  }
  @keyframes quiz-pip {
    0% {
      scale: 1 0.2;
      filter: brightness(2.4);
    }
  }
  @keyframes quiz-shine {
    to {
      background-position: -200% 0;
    }
  }
  @keyframes quiz-title {
    0% {
      opacity: 0;
      scale: 2;
    }
    14%,
    72% {
      opacity: 1;
      scale: 1;
    }
    100% {
      opacity: 0;
      scale: 0.8;
      visibility: hidden;
    }
  }
  @keyframes quiz-verdict {
    from {
      opacity: 0;
      transform: translateY(26px) rotate(-2deg) scale(0.96);
    }
  }
  @keyframes quiz-tick {
    0% {
      scale: 0.9;
      filter: brightness(1.8);
    }
    50% {
      scale: 1.08;
    }
  }
  @keyframes quiz-broken {
    0%,
    40% {
      filter: drop-shadow(0 0 10px #ff3b30) brightness(1.4);
    }
    15% {
      translate: -4px 0;
    }
    30% {
      translate: 4px 0;
    }
  }
  @keyframes quiz-reward {
    0%,
    100% {
      rotate: -10deg;
      filter: drop-shadow(0 0 2px #fff);
    }
    50% {
      rotate: 10deg;
      filter: drop-shadow(0 0 9px #fff);
    }
  }
  @keyframes quiz-static {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
      visibility: hidden;
    }
  }
  @keyframes quiz-flash {
    from {
      opacity: 0.95;
    }
    to {
      opacity: 0;
      visibility: hidden;
    }
  }
  @keyframes quiz-slam {
    from {
      opacity: 0;
      transform: translateX(-40px) scale(1.7);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes quiz-stamp {
    from {
      opacity: 0;
      transform: scale(2.4);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes quiz-fade {
    from {
      opacity: 0;
    }
  }
  @keyframes quiz-show {
    to {
      opacity: 1;
    }
  }
  @keyframes quiz-option {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.96);
    }
  }
  @keyframes quiz-pop {
    40% {
      transform: scale(1.5);
      color: var(--sun);
    }
  }
  @keyframes quiz-drop {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
  }
  @keyframes quiz-fire {
    to {
      box-shadow:
        inset 0 0 0 5px #ffb04a,
        inset 0 0 70px rgba(255, 140, 60, 0.7);
    }
  }
  @keyframes quiz-rainbow {
    to {
      filter: hue-rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    --burst: 0s !important;
    .capture,
    .glare {
      display: none;
    }
    .stage {
      transform: none;
    }
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }
`
