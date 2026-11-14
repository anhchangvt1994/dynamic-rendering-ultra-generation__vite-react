import { css } from 'styled-components'

// Candy Rush: 6 columns of berries. Tap two neighbours or swipe. Slides, bursts,
// chain banners, quakes and light beams dress what the engine decided.
export const candyCss = css`
  .mg-candy {
    --cell: calc(128% + 5px);
    padding: 8px;
  }
  .mg-candy-head {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    padding: 2px 4px 6px;
  }
  .mg-candy-head b {
    font-variant-numeric: tabular-nums;
  }
  .mg-candy-score {
    display: inline-block;
    transform-origin: left center;
    animation: mg-candy-bump 360ms cubic-bezier(0.3, 1.8, 0.5, 1);
  }
  .mg-candy-head [data-low] b {
    color: #ff8a8a;
    display: inline-block;
    animation: mg-candy-low 700ms ease-in-out infinite alternate;
  }
  .mg-candy-bar {
    position: relative;
    display: block;
    height: 10px;
    margin: 0 4px 12px;
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.14);
  }
  .mg-candy-bar i {
    position: relative;
    display: block;
    height: 100%;
    border-radius: inherit;
    overflow: hidden;
    background: linear-gradient(90deg, #5fe0d0, #ffd95a 55%, #ff9fd0);
    box-shadow: 0 0 10px #ffd95a88;
    transition: width 520ms cubic-bezier(0.2, 0.9, 0.3, 1);
  }
  .mg-candy-bar i::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 30%, #fff9 50%, transparent 70%);
    transform: translateX(-100%);
    animation: mg-candy-shine 2.4s ease-in-out infinite;
  }
  .mg-candy-bar em {
    position: absolute;
    top: 50%;
    translate: -50% -50%;
    font-style: normal;
    font-size: 15px;
    line-height: 1;
    color: rgba(255, 255, 255, 0.3);
    text-shadow: 0 0 0 transparent;
  }
  .mg-candy-bar em[data-on] {
    color: #ffe477;
    text-shadow: 0 0 8px #ffb300, 0 0 16px #ff9fd0;
    animation: mg-candy-star 700ms cubic-bezier(0.3, 1.8, 0.5, 1);
  }
  .mg-candy-hint {
    margin: 8px 4px 0;
    font-size: 13px;
    opacity: 0.8;
    text-align: center;
  }
  .mg-candy-field {
    will-change: translate;
    position: relative;
    border-radius: 16px;
    padding: 3px;
  }
  .mg-candy-field[data-tier='1'] { box-shadow: 0 0 0 2px #ffe477aa, 0 0 22px #ffe47766; }
  .mg-candy-field[data-tier='2'] { box-shadow: 0 0 0 2px #ff9fd0cc, 0 0 30px #ff9fd099; }
  .mg-candy-field[data-tier='3'] { box-shadow: 0 0 0 3px #5fe0d0, 0 0 40px #5fe0d0aa; background: rgba(95, 224, 208, 0.08); }
  .mg-candy-field[data-tier='4'] {
    box-shadow: 0 0 0 3px #fff, 0 0 36px #ffd95a;
    background: rgba(255, 255, 255, 0.1);
  }
  /* the whole board must fit without scrolling: width follows the height left under the sheet's header */
  .mg-body:has(.mg-candy) .mg-sub {
    display: none;
  }
  @media (min-width: 640px) {
    .mg-candy-grid {
      width: min(100%, calc((min(92dvh, 860px) - 290px) * 6 / 7)) !important;
    }
  }
  .mg-candy-grid {
    width: min(100%, calc((100dvh - 330px) * 6 / 7));
    margin-inline: auto !important;
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .mg-candy-cell {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 1;
    min-height: 0;
    padding: 0;
    border: 0;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    transition: transform 160ms ease;
  }
  .mg-candy-cell:disabled {
    cursor: default;
  }
  .mg-candy-cell img {
    width: 78%;
    height: 78%;
    object-fit: contain;
    image-rendering: pixelated;
    pointer-events: none;
  }
  .mg-candy-cell:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .mg-candy-cell[data-near]::after {
    content: '';
    position: absolute;
    inset: 3px;
    border-radius: 10px;
    border: 2px dashed #ffffffaa;
    animation: mg-candy-near 600ms ease-in-out infinite alternate;
  }
  .mg-candy-cell[data-sel] {
    z-index: 2;
    background: radial-gradient(circle, var(--c) 0%, transparent 85%), rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
    box-shadow: 0 0 0 2px #fff, 0 0 18px var(--c);
  }
  .mg-candy-cell[data-sel] img {
    animation: mg-candy-wiggle 420ms ease-in-out infinite;
  }
  .mg-candy-cell[data-hint] img {
    animation: mg-candy-hint 900ms ease-in-out infinite;
  }
  .mg-candy-cell[data-hint] {
    box-shadow: 0 0 0 2px #ffe477, 0 0 14px #ffe477;
  }
  .mg-candy-cell[data-slide] {
    z-index: 3;
  }
  .mg-candy-cell[data-slide] img {
    animation: mg-candy-slide 170ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .mg-candy-cell[data-miss] {
    z-index: 3;
    background: rgba(255, 90, 90, 0.3);
  }
  .mg-candy-cell[data-miss] img {
    animation: mg-candy-nudge 420ms ease-in-out;
  }
  .mg-candy-cell[data-pop] {
    z-index: 4;
    background: radial-gradient(circle, #fff 0%, var(--c) 45%, transparent 80%);
    transition: none;
  }
  .mg-candy-cell[data-pop] img {
    animation: mg-candy-pop 380ms cubic-bezier(0.5, -0.4, 0.7, 1) forwards;
  }
  .mg-candy-cell[data-drop] img {
    animation: mg-candy-drop calc(240ms + var(--f) * 55ms) cubic-bezier(0.3, 0.7, 0.4, 1) both;
    animation-delay: calc(var(--col) * 12ms);
  }
  .mg-candy-fx {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .mg-candy-fx u {
    position: absolute;
    inset: -20%;
    border-radius: 50%;
    border: 3px solid #fff;
    animation: mg-candy-ring 380ms ease-out forwards;
  }
  .mg-candy-fx b {
    position: absolute;
    left: 50%;
    top: 50%;
    width: var(--s);
    height: var(--s);
    margin: calc(var(--s) / -2);
    border-radius: 50% 50% 50% 0;
    background: var(--c);
    animation: mg-candy-shard 460ms cubic-bezier(0.1, 0.7, 0.3, 1) forwards;
  }
  .mg-candy-fx[data-big] b {
    background: #fff;
    animation-duration: 560ms;
  }
  .mg-candy-fxlayer {
    contain: layout paint;
    position: absolute;
    inset: 3px;
    z-index: 5;
    pointer-events: none;
  }
  .mg-candy-beam {
    position: absolute;
    border-radius: 12px;
    background: linear-gradient(90deg, transparent, #fff, #ffe477, #fff, transparent);
    will-change: transform, opacity;
    animation: mg-candy-beam-x 420ms ease-out forwards;
  }
  .mg-candy-beam[data-dir='col'] {
    background: linear-gradient(180deg, transparent, #fff, #ffe477, #fff, transparent);
    animation-name: mg-candy-beam-y;
  }
  .mg-candy-wave {
    will-change: scale, opacity;
    position: absolute;
    width: 30%;
    aspect-ratio: 1;
    translate: -50% -50%;
    border-radius: 50%;
    border: 4px solid #fff;
    animation: mg-candy-wave 560ms ease-out forwards;
  }
  .mg-candy-fxlayer[data-tier='0'] .mg-candy-wave {
    border-width: 2px;
    opacity: 0.7;
  }
  .mg-candy-gain {
    will-change: transform, opacity;
    position: absolute;
    translate: -50% -50%;
    font: 900 20px/1 inherit;
    color: #fff;
    text-shadow: 0 2px 0 #b84a00;
    -webkit-text-stroke: 1px #b84a00;
    animation: mg-candy-gain 800ms ease-out forwards;
  }
  .mg-candy-callout {
    will-change: transform, opacity;
    position: absolute;
    left: 50%;
    top: 42%;
    display: grid;
    justify-items: center;
    gap: 2px;
    translate: -50% -50%;
    white-space: nowrap;
    text-align: center;
    animation: mg-candy-callout 900ms cubic-bezier(0.2, 1.4, 0.4, 1) forwards;
  }
  .mg-candy-callout strong {
    font: 900 clamp(22px, 8vw, 34px) / 1 inherit;
    letter-spacing: 0.02em;
    color: #fff;
    -webkit-text-stroke: 2px #b84a00;
    paint-order: stroke fill;
    text-shadow: 0 4px 0 #b84a00;
  }
  .mg-candy-callout small {
    padding: 2px 12px;
    border-radius: 99px;
    font: 800 14px/1.5 inherit;
    color: #3b1d00;
    background: linear-gradient(90deg, #ffe477, #ff9fd0);
  }
  .mg-candy-callout[data-tier='2'] strong { color: #ffe1f2; text-shadow: 0 4px 0 #8a1f5a; -webkit-text-stroke-color: #8a1f5a; }
  .mg-candy-callout[data-tier='3'] strong { color: #d8fff9; text-shadow: 0 4px 0 #0a5b52; -webkit-text-stroke-color: #0a5b52; scale: 1.15; }
  .mg-candy-callout[data-tier='4'] strong {
    scale: 1.3;
    color: #fff6b0;
    -webkit-text-stroke-color: #8a1f5a;
    text-shadow: 0 4px 0 #8a1f5a;
  }
  .mg-candy-flash {
    position: absolute;
    inset: -3px;
    border-radius: 16px;
    background: radial-gradient(circle, #fff 0%, #ffffff00 70%);
    will-change: opacity;
    animation: mg-candy-flash 420ms ease-out forwards;
  }
  @keyframes mg-candy-wiggle { 25% { transform: rotate(-9deg) scale(1.08); } 75% { transform: rotate(9deg) scale(1.08); } }
  @keyframes mg-candy-hint { 50% { transform: scale(1.22) rotate(-6deg); } }
  @keyframes mg-candy-near { to { opacity: 0.35; transform: scale(0.94); } }
  @keyframes mg-candy-slide { from { translate: calc(var(--dx) * var(--cell)) calc(var(--dy) * var(--cell)); } }
  @keyframes mg-candy-nudge {
    35% { translate: calc(var(--dx) * 55%) calc(var(--dy) * 55%); }
    55% { translate: calc(var(--dx) * 8%) calc(var(--dy) * 8%); }
    75% { translate: calc(var(--dx) * 20%) calc(var(--dy) * 20%); }
  }
  @keyframes mg-candy-pop {
    25% { transform: scale(1.45) rotate(8deg); }
    to { transform: scale(0) rotate(-40deg); opacity: 0; }
  }
  @keyframes mg-candy-drop {
    from { translate: 0 calc(var(--f) * var(--cell) * -1); opacity: 0.2; }
    55% { translate: 0 0; opacity: 1; }
    70% { translate: 0 -9%; scale: 1.06 0.94; }
    85% { translate: 0 0; scale: 0.94 1.06; }
    to { scale: 1; }
  }
  @keyframes mg-candy-ring { from { transform: scale(0.2); opacity: 1; } to { transform: scale(1.7); opacity: 0; } }
  @keyframes mg-candy-shard {
    from { transform: rotate(var(--a)) translateX(0) scale(1); opacity: 1; }
    70% { opacity: 1; }
    to { transform: rotate(var(--a)) translateX(var(--d)) scale(0.2); opacity: 0; }
  }
  @keyframes mg-candy-beam-x { from { transform: scaleX(0); opacity: 1; } 40% { transform: scaleX(1); opacity: 1; } to { transform: scaleX(1.05) scaleY(0.2); opacity: 0; } }
  @keyframes mg-candy-beam-y { from { transform: scaleY(0); opacity: 1; } 40% { transform: scaleY(1); opacity: 1; } to { transform: scaleY(1.05) scaleX(0.2); opacity: 0; } }
  @keyframes mg-candy-wave { from { scale: 0.1; opacity: 1; } to { scale: 2.6; opacity: 0; } }
  @keyframes mg-candy-gain {
    from { transform: translateY(8px) scale(0.4); opacity: 0; }
    20% { transform: translateY(-6px) scale(1.3); opacity: 1; }
    to { transform: translateY(-46px) scale(1); opacity: 0; }
  }
  @keyframes mg-candy-callout {
    from { transform: scale(0.2) rotate(-8deg); opacity: 0; }
    22% { transform: scale(1.18) rotate(2deg); opacity: 1; }
    40% { transform: scale(1) rotate(0); }
    75% { opacity: 1; }
    to { transform: scale(1.1) translateY(-26px); opacity: 0; }
  }
  @keyframes mg-candy-flash { from { opacity: 0.9; } to { opacity: 0; } }
  @keyframes mg-candy-bump { from { transform: scale(1.25); } to { transform: scale(1); } }
  @keyframes mg-candy-low { to { transform: scale(1.3); } }
  @keyframes mg-candy-shine { 60%, 100% { transform: translateX(100%); } }
  @keyframes mg-candy-star { from { transform: scale(0.2) rotate(-90deg); } 60% { transform: scale(1.9) rotate(20deg); } to { transform: scale(1); } }
  @media (prefers-reduced-motion: reduce) {
    .mg-candy-cell,
    .mg-candy-bar i,
    .mg-candy-field {
      transition: none;
    }
    .mg-candy-cell img,
    .mg-candy-cell[data-sel] img,
    .mg-candy-cell[data-hint] img,
    .mg-candy-cell[data-slide] img,
    .mg-candy-cell[data-miss] img,
    .mg-candy-cell[data-drop] img,
    .mg-candy-cell[data-near]::after,
    .mg-candy-bar i::after,
    .mg-candy-bar em,
    .mg-candy-score,
    .mg-candy-head [data-low] b,
    .mg-candy-field[data-tier='4'] {
      animation: none;
    }
    .mg-candy-cell[data-pop] img {
      animation: none;
      opacity: 0.2;
    }
    .mg-candy-fxlayer,
    .mg-candy-fx {
      display: none;
    }
    .mg-candy-cell[data-sel] {
      transform: none;
    }
  }
`
