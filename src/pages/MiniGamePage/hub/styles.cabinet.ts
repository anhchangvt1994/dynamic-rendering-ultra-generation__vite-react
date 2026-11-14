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
    position: relative;
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
    position: relative;
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
  .cs-fx {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .cs-fx u {
    position: absolute;
    inset: 15%;
    border: 2px solid #fff6b0;
    border-radius: 50%;
    animation: cs-ring 420ms ease-out both;
  }
  .cs-fx b {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 4px;
    height: 4px;
    margin: -2px;
    border-radius: 50%;
    background: #ffe477;
    animation: cs-shard 460ms ease-out both;
  }
  .cs-gain {
    position: absolute;
    translate: -50% -50%;
    color: #fff6b0;
    font-size: 12px;
    font-weight: 800;
    text-shadow: 0 1px 3px #0009;
    pointer-events: none;
    animation: cs-gain 900ms ease-out both;
  }
  .cs-call {
    position: absolute;
    left: 50%;
    top: 42%;
    translate: -50% -50%;
    white-space: nowrap;
    font-size: 15px;
    font-weight: 900;
    color: #d8fff9;
    text-shadow: 0 0 8px #7dffea, 0 2px 3px #000a;
    pointer-events: none;
    animation: cs-call 1000ms var(--spring) both;
  }
  .cs-call[data-tier='4'] {
    color: #ffe477;
    text-shadow: 0 0 10px #ff9be0, 0 2px 3px #000a;
  }
  @keyframes cs-ring {
    from { transform: scale(0.3); opacity: 1; }
    to { transform: scale(1.7); opacity: 0; }
  }
  @keyframes cs-shard {
    from { transform: rotate(var(--a)) translateX(0); opacity: 1; }
    to { transform: rotate(var(--a)) translateX(16px); opacity: 0; }
  }
  @keyframes cs-gain {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(-14px); opacity: 0; }
  }
  @keyframes cs-call {
    from { transform: scale(0.4); opacity: 0; }
    25% { transform: scale(1.15); opacity: 1; }
    80% { opacity: 1; }
    to { transform: scale(1); opacity: 0; }
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

  /* chọn cặp screen */
  .ts { display: grid; grid-template: minmax(0, 1fr) / minmax(0, 1fr); place-items: center; width: 100%; height: 100%; padding: 6px; box-sizing: border-box; overflow: hidden; }
  .ts-grid { position: relative; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); grid-template-rows: repeat(6, minmax(0, 1fr)); gap: 2px; height: 100%; max-height: 100%; aspect-ratio: 1; max-width: 100%; }
  .ts-tile { position: relative; display: grid; place-items: center; min-width: 0; min-height: 0; border-radius: 5px; border: 1px solid #95e7ff; background: linear-gradient(145deg, #2a6188, #10243d); }
  .ts-tile img { width: 86%; height: 86%; object-fit: contain; }
  .ts-tile[data-gone] { visibility: hidden; }
  .ts-tile[data-pop] { background: none; border-color: transparent; }
  .ts-tile[data-echo] { border-color: #7dffea; box-shadow: 0 0 8px #7dffea; animation: ts-echo 420ms ease-in-out infinite alternate; }
  .ts-tile[data-sel] { z-index: 2; border-color: #fff08a; background: linear-gradient(145deg, #7a6a1c, #2b2508); box-shadow: 0 0 0 2px #ffe477, 0 0 14px #ffe477; animation: ts-lift 420ms ease-out forwards; }
  .ts-fx { position: absolute; inset: 0; pointer-events: none; }
  .ts-fx u { position: absolute; inset: -30%; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 12px #ffe477, inset 0 0 8px #7dffea; animation: ts-ring 420ms ease-out forwards; }
  .ts-fx b { position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; margin: -3px; border-radius: 2px; background: hsl(var(--h) 100% 68%); box-shadow: 0 0 6px hsl(var(--h) 100% 68%); animation: ts-shard 420ms ease-out forwards; }
  .ts-line { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; z-index: 3; }
  .ts-line path { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1; animation: ts-beam 300ms ease-out forwards; }
  .ts-line .b { stroke: url(#ts-beam); stroke-width: 9; }
  .ts-line .g { stroke: #fff8; stroke-width: 22; filter: blur(5px); }
  .ts-line .o { fill: #fff; filter: drop-shadow(0 0 6px #ffe477) drop-shadow(0 0 12px #7dffea); }
  .ts-line[data-out] path { stroke-dashoffset: 0; animation: ts-fade 300ms ease-in forwards; }
  .ts-combo { position: absolute; z-index: 4; transform: translate(-50%, -50%); padding: 1px 7px; border-radius: 999px; color: #3b1d00; font: 900 11px/1.4 inherit; white-space: nowrap; background: linear-gradient(90deg, #ffe477, #ff9be0); box-shadow: 0 0 12px #ffe477; animation: ts-combo 420ms ease-out forwards; }
  @keyframes ts-echo { to { transform: scale(1.05); } }
  @keyframes ts-lift { from { transform: scale(1); } 50% { transform: scale(1.14); } to { transform: scale(1.08); } }
  @keyframes ts-ring { from { transform: scale(.2); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }
  @keyframes ts-shard { from { transform: rotate(var(--a)) translateX(0) scale(1); opacity: 1; } 60% { opacity: 1; } to { transform: rotate(var(--a)) translateX(26px) scale(.3); opacity: 0; } }
  @keyframes ts-beam { to { stroke-dashoffset: 0; } }
  @keyframes ts-fade { to { opacity: 0; } }
  @keyframes ts-combo { from { transform: translate(-50%, -30%) scale(.3); opacity: 0; } 30% { transform: translate(-50%, -90%) scale(1.1); opacity: 1; } to { transform: translate(-50%, -160%) scale(1); opacity: 0; } }

  /* xếp khối screen */
  .bs { position: relative; display: grid; place-items: stretch; width: 100%; height: 100%; padding: 0; background: radial-gradient(ellipse at 50% 0, #653e57, #10152f 70%); }
  .bs-field { position: relative; width: 100%; height: 100%; overflow: hidden; }
  .bs-grid { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(10, 1fr); grid-template-rows: repeat(11, 1fr); }
  .bs-cell { position: relative; display: grid; place-items: center; min-width: 0; min-height: 0; margin: 1px; border-radius: 3px; }
  .bs-cell[data-on] { background: linear-gradient(150deg, color-mix(in srgb, var(--c) 70%, #fff), var(--c)); box-shadow: inset 0 0 0 1px #fff6; }
  .bs-cell[data-ghost] { outline: 1px dashed color-mix(in srgb, var(--c) 85%, #fff); outline-offset: -1px; }
  .bs-cell[data-new] { animation: bs-land 240ms var(--spring) both; }
  .bs-cell img { width: 90%; height: 90%; object-fit: contain; }
  .bs-fx { position: absolute; inset: 0; pointer-events: none; }
  .bs-fx b { position: absolute; left: 50%; top: 50%; width: 3px; height: 3px; margin: -1.5px; background: #ffe477; animation: bs-shard 380ms ease-out both; }
  .bs-sweep { position: absolute; left: 0; width: 100%; height: 5%; background: linear-gradient(90deg, transparent, #fff, #ffe477, #fff, transparent); transform-origin: 0 50%; animation: bs-sweep 260ms ease-out both; }
  .bs-spark { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: hsl(var(--h) 95% 62%); animation: bs-spark 520ms ease-out both; }
  .bs-call { position: absolute; left: 50%; top: 36%; translate: -50% -50%; white-space: nowrap; color: #fff; font: 900 16px/1 inherit; -webkit-text-stroke: 1.5px #b84a00; paint-order: stroke fill; animation: bs-call 700ms var(--spring) both; }
  @keyframes bs-land { from { transform: translateY(-70%); opacity: .5; } }
  @keyframes bs-shard { from { transform: rotate(var(--a)) translateX(0); opacity: 1; } to { transform: rotate(var(--a)) translateX(14px); opacity: 0; } }
  @keyframes bs-sweep { from { transform: scaleX(0); opacity: 1; } to { transform: scaleX(1); opacity: .2; } }
  @keyframes bs-spark { from { transform: translate(0, 0) scale(1); opacity: 1; } to { transform: translate(var(--dx, 14px), -18px) scale(0); opacity: 0; } }
  @keyframes bs-call { from { transform: scale(.3); opacity: 0; } 30% { transform: scale(1.15); opacity: 1; } to { opacity: 0; } }


  /* ghép mảnh screen: pieces fly from the tray, spin upright and lock */
  .ss { display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; overflow: hidden; container-type: size; justify-items: center; gap: 4px; width: 100%; height: 100%; padding: 6px; box-sizing: border-box; background: radial-gradient(ellipse at center, #1d3b5c, #0a1626 80%); }
  .ss-frame { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap: 2px; align-self: center; width: min(100cqw - 4px, (100cqh - 34px) * 1.5); aspect-ratio: 3 / 2; padding: 3px; border: 1px solid #6ce9ff66; border-radius: 8px; background: #0a1a2e; box-sizing: border-box; }
  .ss-slot { position: relative; border: 1px dashed #6ce9ff40; border-radius: 4px; }
  .ss-piece { position: absolute; inset: 0; border-radius: 4px; background-repeat: no-repeat; box-shadow: inset 0 0 0 1px #d9f7ff55; transition: transform 380ms var(--spring); }
  .ss-piece[data-locked] { box-shadow: inset 0 0 0 2px #72f0d0; }
  .ss-tray { display: flex; justify-content: center; gap: 3px; min-height: 20px; max-width: 100%; overflow: hidden; }
  .ss-tray i { flex: none; width: 20px; height: 20px; border-radius: 4px; background-repeat: no-repeat; box-shadow: inset 0 0 0 1px #d9f7ff55; transition: transform 380ms var(--spring); }
  .ss[data-solved] .ss-frame { border-color: #ffe477; box-shadow: 0 0 16px #ffd844; gap: 0; }
  .ss[data-solved] .ss-slot { border-color: transparent; }

  /* vòng quay screen: 5 x 3 reels, full width */
  .ls { width: 100%; height: 100%; padding: 6px; box-sizing: border-box; background: radial-gradient(ellipse at 50% 0, #763b70, #121638 70%); }
  .ls-reels { display: grid; grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(3, 1fr); gap: 3px; width: 100%; height: 100%; padding: 4px; border: 2px solid #f8d274; border-radius: 8px; background: #171433; box-sizing: border-box; }
  .ls-reels i { display: grid; place-items: center; min-height: 0; border-radius: 5px; background: linear-gradient(145deg, #fff2d1, #d9b8ff); overflow: hidden; }
  .ls-reels i[data-spin] img { filter: blur(1.2px); animation: ls-roll 180ms linear infinite; }
  .ls-reels i[data-lit] { background: linear-gradient(145deg, #fffbe0, #ffcf5a); animation: cs-pop 420ms calc(var(--c) * 60ms) var(--spring) both; }
  .ls-reels img { width: auto; height: 86%; max-width: 90%; object-fit: contain; }
  .ls[data-win] .ls-reels { box-shadow: 0 0 14px #ffd844; }
  .ls[data-swept] .ls-reels { box-shadow: 0 0 22px #ff9bd0, 0 0 0 1px #fff6a8; }
  @keyframes ls-roll { from { transform: translateY(-30%); } to { transform: translateY(30%); } }

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
    .cs-fx u,
    .cs-fx b,
    .cs-gain,
    .cs-call,
    .bs-cell,
    .bs-fx b,
    .bs-sweep,
    .bs-spark,
    .bs-call,
    .ls-reels img,
    .ls-reels i,
    .ts-tile,
    .ts-fx u,
    .ts-fx b,
    .ts-line path,
    .ts-combo,
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
