import styled, { css } from 'styled-components'

const FLY_MS = 480

const noScrollbar = css`
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

/** The prompt: a full-screen "chamber" lit in the colour of the form to come. */
export const EvolveDialogStyle = styled.dialog`
  /* the scene is on top (its backdrop is opaque): nothing here runs unseen */
  &[data-away] * {
    animation-play-state: paused !important;
  }
  width: 100vw;
  max-width: none;
  height: 100dvh;
  max-height: none;
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  color: #fff;
  overflow: hidden;
  &::backdrop {
    background: #04070f;
  }
  &[open] {
    animation: ch-in 420ms cubic-bezier(0.2, 1, 0.3, 1);
  }
  .ch {
    --s: min(86vw, 50dvh, 400px);
    --a: #7dd3fc;
    --b: #ffffff;
    position: relative;
    isolation: isolate;
    display: grid;
    grid-template-rows: auto auto auto auto;
    grid-template-areas: 'head' 'stage' 'why' 'cta';
    justify-items: center;
    align-content: center;
    gap: 6px;
    width: 100%;
    height: 100%;
    padding: 52px 14px 14px;
    overflow: hidden auto;
    text-align: center;
    ${noScrollbar}
  }
  .ch-bg {
    position: absolute;
    inset: 0;
    z-index: -2;
    overflow: hidden;
    background:
      radial-gradient(60% 46% at 50% 44%, color-mix(in srgb, var(--a) calc(18% + var(--h, 0) * 40%), transparent), transparent 72%),
      radial-gradient(90% 60% at 50% 110%, color-mix(in srgb, var(--b) 22%, transparent), transparent 70%),
      #070b16;
  }
  .ch-bg::before {
    content: '';
    position: absolute;
    inset: -40%;
    background: conic-gradient(
      from 0deg at 50% 46%,
      transparent 0 8%,
      color-mix(in srgb, var(--a) 16%, transparent) 12%,
      transparent 18% 40%,
      color-mix(in srgb, var(--b) 14%, transparent) 46%,
      transparent 52% 78%,
      color-mix(in srgb, var(--a) 12%, transparent) 84%,
      transparent 90%
    );
    animation: ch-spin 40s linear infinite;
  }
  .ch-sparks {
    position: absolute;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
  }
  .ch-sparks i {
    position: absolute;
    bottom: -12px;
    border-radius: 50%;
    background: var(--a);
    box-shadow: 0 0 8px 1px var(--a);
    opacity: 0;
    animation: ch-spark linear infinite;
  }
  .ch-later {
    position: absolute;
    top: 8px;
    right: 8px;
    min-height: 44px;
    padding: 0 14px;
    border: none;
    border-radius: 99px;
    background: none;
    color: rgba(255, 255, 255, 0.62);
    font: 700 13px system-ui, sans-serif;
    cursor: pointer;
  }
  .ch-later:hover {
    color: #fff;
  }
  .ch-head {
    grid-area: head;
    outline: none;
  }
  .ch-head h2 {
    margin: 0;
    font-size: clamp(18px, 5vw, 24px);
    font-weight: 800;
    text-shadow: 0 0 18px color-mix(in srgb, var(--a) 70%, transparent);
  }
  .ch-sub {
    margin: 2px 0 0;
    font-size: 12px;
    color: color-mix(in srgb, var(--a) 60%, #fff);
    opacity: 0.85;
  }
  .ch-stage {
    grid-area: stage;
    position: relative;
    width: var(--s);
    height: var(--s);
  }
  .ch-ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    fill: none;
  }
  .r-dots {
    stroke: rgba(255, 255, 255, 0.3);
    stroke-width: 0.6;
    stroke-dasharray: 0.4 2.2;
    stroke-linecap: round;
    transform-origin: 50px 50px;
    animation: ch-spin 90s linear infinite;
  }
  .r-inner {
    stroke: color-mix(in srgb, var(--a) 40%, transparent);
    stroke-width: 0.5;
    stroke-dasharray: 8 5;
    transform-origin: 50px 50px;
    animation: ch-spin 60s linear infinite reverse;
  }
  .r-arc {
    stroke: rgba(255, 255, 255, 0.2);
    stroke-width: 3.2;
    stroke-linecap: round;
    stroke-dasharray: 0.1 4.6;
  }
  .r-arc[data-ok] {
    stroke: var(--a);
    stroke-dasharray: none;
    filter: drop-shadow(0 0 2.4px var(--a));
    animation: ch-lit 2.6s ease-in-out infinite;
  }
  .r-charge {
    stroke: var(--b);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-dasharray: 100;
    stroke-dashoffset: calc(100 - var(--h, 0) * 100);
    transform: rotate(-90deg);
    transform-origin: 50px 50px;
    filter: drop-shadow(0 0 2px var(--b));
  }
  .ch-pad {
    position: absolute;
    left: 25%;
    right: 25%;
    top: 62%;
    height: 14%;
    pointer-events: none;
  }
  .ch-pad i {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1.5px solid color-mix(in srgb, var(--a) 70%, transparent);
    background: radial-gradient(closest-side, color-mix(in srgb, var(--a) 42%, transparent), transparent);
    animation: ch-pad 3.2s ease-out infinite;
  }
  .ch-pad i + i {
    animation-delay: -1.6s;
  }
  .ch-me,
  .ch-ghost {
    position: absolute;
    left: 50%;
    top: 50%;
    display: block;
    pointer-events: none;
  }
  .ch-me {
    width: 40%;
    aspect-ratio: 1;
    margin: -22% 0 0 -20%;
    animation: ch-float 3.6s ease-in-out infinite;
    filter: drop-shadow(0 0 calc(4px + var(--h, 0) * 34px) var(--a))
      brightness(calc(1 + var(--h, 0) * 1.3));
  }
  [data-charging='on'] .ch-me > img {
    animation: ch-shake 0.08s linear infinite alternate;
  }
  .ch-ghost {
    width: 58%;
    aspect-ratio: 1;
    margin: -34% 0 0 -29%;
    opacity: calc(0.16 + var(--p, 0) * 0.3 + var(--h, 0) * 0.5);
    filter: brightness(var(--h, 0)) blur(calc(1.5px - var(--h, 0) * 1.5px))
      drop-shadow(0 0 10px var(--a));
    transform: scale(calc(1.02 + var(--h, 0) * 0.1));
    animation: ch-ghost 4.2s ease-in-out infinite;
  }
  .ch-ghost[data-ready] {
    opacity: calc(0.5 + var(--h, 0) * 0.5);
  }
  .ch-me img,
  .ch-ghost img,
  .ch-node img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .ch-node {
    position: absolute;
    z-index: 2;
    aspect-ratio: 1;
    padding: 0;
    translate: -50% -50%;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 2px solid color-mix(in srgb, var(--a) 70%, transparent);
    background: radial-gradient(circle at 35% 30%, #ffffff30, #0a1226e6 70%);
    box-shadow: 0 0 14px -2px color-mix(in srgb, var(--a) 70%, transparent);
    cursor: pointer;
    animation: ch-bob 3.4s ease-in-out infinite;
    transition:
      border-color 0.2s,
      box-shadow 0.2s,
      opacity 0.2s;
  }
  .ch-node img {
    width: 76%;
    height: 76%;
  }
  .ch-node[data-lock] {
    border-style: dashed;
    opacity: 0.55;
    cursor: default;
  }
  .ch-node[data-lock] img {
    filter: brightness(0) opacity(0.8);
  }
  .ch-node[data-on] {
    border-color: #fff;
    box-shadow:
      0 0 24px var(--a),
      inset 0 0 14px color-mix(in srgb, var(--a) 60%, transparent);
    scale: 1.14;
  }
  .ch-node[data-stone] {
    border-style: solid;
    animation: ch-bob 3.4s ease-in-out infinite, ch-call 1.6s ease-in-out infinite;
  }
  .ch-node .stone {
    width: 82%;
    height: 82%;
    image-rendering: pixelated;
  }
  .ch-node[data-fly] {
    z-index: 5;
    animation: ch-fly ${FLY_MS}ms cubic-bezier(0.5, 0, 0.9, 0.6) forwards;
  }
  .ch[data-fly] .ch-me {
    animation: ch-float 3.6s ease-in-out infinite, ch-charge ${FLY_MS}ms ease-in forwards;
  }
  .ch-flash {
    position: absolute;
    inset: 22%;
    z-index: 3;
    border-radius: 50%;
    background: radial-gradient(closest-side, #fff, var(--a) 55%, transparent);
    opacity: 0;
    pointer-events: none;
  }
  .ch[data-fly] .ch-flash {
    animation: ch-boom ${FLY_MS}ms ease-in forwards;
  }
  .ch-why {
    grid-area: why;
    display: grid;
    gap: 3px;
    width: min(100%, 360px);
    min-height: 22px;
    margin: 2px 0 0;
    padding: 0;
    list-style: none;
    font-size: 12px;
    line-height: 1.35;
    color: #f4a6a6;
  }
  .ch-why li {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 6px;
  }
  .ch-why li[data-ok] {
    color: #7ee0a3;
  }
  .ch-why b {
    flex: none;
  }
  .ch-err {
    grid-area: why;
    align-self: end;
    margin: 0;
    font-size: 12px;
    color: #ffb4b4;
  }
  .ch-err:empty {
    display: none;
  }
  .ch-cta {
    grid-area: cta;
    display: grid;
    justify-items: center;
    gap: 6px;
    padding-top: 4px;
  }
  .ch-label {
    margin: 0;
    font: 800 13px system-ui, sans-serif;
    letter-spacing: 0.04em;
    color: color-mix(in srgb, var(--a) 55%, #fff);
  }
  .ch-hold {
    position: relative;
    isolation: isolate;
    width: 88px;
    height: 88px;
    padding: 0;
    border: none;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #fff;
    font-size: 30px;
    background: conic-gradient(var(--b) calc(var(--h, 0) * 360deg), color-mix(in srgb, var(--a) 38%, #0b1226) 0);
    box-shadow: 0 0 calc(10px + var(--h, 0) * 40px) color-mix(in srgb, var(--a) 70%, transparent);
    cursor: pointer;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    animation: ch-call 1.6s ease-in-out infinite;
  }
  .ch-hold::before {
    content: '';
    position: absolute;
    inset: 6px;
    z-index: -1;
    border-radius: 50%;
    background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--a) 45%, #0b1226), #070b16);
  }
  .ch-hold span {
    transform: scale(calc(1 + var(--h, 0) * 0.5));
    text-shadow: 0 0 12px var(--a);
  }
  .ch-hold[aria-disabled='true'] {
    opacity: 0.4;
    cursor: default;
    animation: none;
  }
  button:focus-visible {
    outline: 3px solid #ffda55;
    outline-offset: 3px;
  }
  /* short landscape: stage on the left, the rest on the right */
  @media (orientation: landscape) and (max-height: 520px) {
    .ch {
      --s: min(calc(100dvh - 36px), 44vw);
      grid-template-columns: auto minmax(0, 1fr);
      grid-template-rows: 1fr auto auto 1fr;
      grid-template-areas: 'stage head' 'stage why' 'stage cta' 'stage .';
      column-gap: 20px;
      align-content: center;
      padding: 14px 20px;
    }
    .ch-head {
      align-self: end;
      margin-top: 30px;
    }
    .ch-head h2 {
      font-size: 17px;
    }
    .ch-stage {
      grid-row: 1 / -1;
      align-self: center;
    }
    .ch-cta {
      align-self: start;
    }
    .ch-hold {
      width: 64px;
      height: 64px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &[open],
    .ch *,
    .ch *::before {
      animation: none !important;
    }
    .ch-sparks {
      display: none;
    }
  }
  @keyframes ch-in {
    from {
      opacity: 0;
      transform: scale(1.04);
    }
  }
  @keyframes ch-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes ch-spark {
    0% {
      opacity: 0;
      transform: translateY(0) scale(0.6);
    }
    15% {
      opacity: 0.9;
    }
    100% {
      opacity: 0;
      transform: translateY(-105dvh) scale(1.2);
    }
  }
  @keyframes ch-lit {
    50% {
      opacity: 0.65;
    }
  }
  @keyframes ch-pad {
    from {
      opacity: 0.9;
      transform: scale(0.5);
    }
    to {
      opacity: 0;
      transform: scale(1.5);
    }
  }
  @keyframes ch-float {
    50% {
      transform: translateY(-3%);
    }
  }
  @keyframes ch-ghost {
    50% {
      translate: 0 -2%;
    }
  }
  @keyframes ch-bob {
    50% {
      transform: translateY(-3px);
    }
  }
  @keyframes ch-call {
    50% {
      filter: brightness(1.35);
    }
  }
  @keyframes ch-shake {
    from {
      translate: calc(var(--h, 0) * -4px) 0;
    }
    to {
      translate: calc(var(--h, 0) * 4px) calc(var(--h, 0) * -2px);
    }
  }
  @keyframes ch-fly {
    to {
      transform: translate(var(--dx), var(--dy)) scale(0.25);
      opacity: 0.2;
    }
  }
  @keyframes ch-charge {
    to {
      filter: drop-shadow(0 0 40px var(--a)) brightness(2.4);
    }
  }
  @keyframes ch-boom {
    60% {
      opacity: 0.9;
    }
    to {
      opacity: 1;
      transform: scale(2.2);
    }
  }
`

/** The effect: dark scrim, water warp, the ticket. Moving parts are written per frame; the scene is laid out in px by fxLayout. */
export const EvolveFxStyle = styled.dialog`
  width: min(100vw - 16px, 760px);
  max-width: none;
  max-height: 100svh;
  margin: auto;
  padding: 0;
  border: none;
  background: none;
  color: #e8ecff;
  overflow: visible;
  &::backdrop {
    background: #070b16;
  }
  .fx-stage {
    position: relative;
    height: min(640px, 100svh - 16px);
    overflow: hidden;
    border-radius: 16px;
    /* the prompt's own ground, so the hand-over shows no seam */
    background: none;
  }
  /* the form's animation box: HERO px square, moved and scaled per frame */
  .fx-box {
    position: absolute;
    left: 0;
    top: 0;
    width: 300px;
    height: 300px;
    transform-origin: 50% 50%;
  }
  .abs {
    position: absolute;
    left: 50%;
    top: 50%;
  }
  .mon {
    width: 180px;
    height: 180px;
    margin: -90px 0 0 -90px;
    object-fit: contain;
    will-change: filter, opacity, transform;
  }
  .ring {
    width: 230px;
    height: 230px;
    margin: -115px 0 0 -115px;
    border-radius: 50%;
    border: 6px dashed var(--ring, #ffd23f);
    opacity: 0;
  }
  .ring2 {
    width: 250px;
    height: 250px;
    margin: -125px 0 0 -125px;
    border-radius: 50%;
    border: 6px solid #7dd3fc;
    box-shadow:
      0 0 30px #7dd3fc,
      inset 0 0 24px #7dd3fc55;
    opacity: 0;
  }
  .scan {
    left: 0;
    right: 0;
    margin: 0;
    height: 3px;
    background: #5eead4;
    box-shadow: 0 0 16px 5px #5eead4;
    opacity: 0;
    z-index: 1;
  }
  .wv {
    width: 140px;
    height: 140px;
    margin: -70px 0 0 -70px;
    border-radius: 50%;
    border: 3px solid rgba(190, 235, 255, 0.9);
    box-shadow:
      0 0 14px 2px rgba(125, 211, 252, 0.6),
      inset 0 0 14px rgba(125, 211, 252, 0.35);
    opacity: 0;
  }
  .orb {
    width: 60px;
    height: 60px;
    margin: -30px 0 0 -30px;
    border-radius: 50%;
    background: #fff;
    opacity: 0;
  }
  .ray {
    width: 4px;
    height: 220px;
    margin: 0 0 0 -2px;
    background: linear-gradient(#fff, transparent);
    transform-origin: top;
    opacity: 0;
  }
  .sh {
    width: 12px;
    height: 12px;
    margin: -6px 0 0 -6px;
    background: #7dd3fc;
    opacity: 0;
  }
  /* "phiếu ghi nhận": a holo ticket with notched sides and a prismatic edge */
  .tk {
    position: absolute;
    left: 0;
    top: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 18px 12px;
    border-radius: 14px;
    background:
      linear-gradient(#0d1530, #0a1126) padding-box,
      conic-gradient(from 200deg, #7dd3fc, #c4b5fd, #ffd23f, #5eead4, #7dd3fc)
        border-box;
    border: 2px solid transparent;
    box-shadow: 0 18px 40px -12px #000c;
    --n: radial-gradient(circle 9px at 0 50%, #0000 98%, #000) left / 51% 100%
        no-repeat,
      radial-gradient(circle 9px at 100% 50%, #0000 98%, #000) right / 51% 100%
        no-repeat;
    -webkit-mask: var(--n);
    mask: var(--n);
    opacity: 0;
    overflow: hidden;
  }
  .tk h4 {
    display: flex;
    justify-content: space-between;
    margin: 0;
    font: 800 10px system-ui, sans-serif;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #9fb4ff;
  }
  .tk-form {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 8px;
    margin: 0;
    font: 700 13px/1.2 system-ui, sans-serif;
    color: #b8c4e8;
  }
  .tk-form em {
    font-style: normal;
    color: #ffd23f;
  }
  .tk-form b {
    font-size: 19px;
    color: #fff;
  }
  .tk ul {
    display: grid;
    gap: 5px;
    margin: 2px 0 0;
    padding: 0;
    list-style: none;
  }
  .tk li {
    display: grid;
    grid-template-columns: 74px 1fr 34px;
    align-items: center;
    gap: 8px;
    font: 700 12px system-ui, sans-serif;
  }
  .tk li u {
    display: block;
    height: 6px;
    overflow: hidden;
    border-radius: 6px;
    background: #ffffff1f;
  }
  .tk li i {
    display: block;
    height: 100%;
    border-radius: 6px;
    background: linear-gradient(90deg, #5eead4, #7dd3fc);
    transform: scaleX(0);
    transform-origin: left;
  }
  .tk li b {
    text-align: right;
    color: #7ee0a3;
  }
  .tk-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: auto;
  }
  .tk-first {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 3px 10px;
    border-radius: 99px;
    background: #ffd23f;
    color: #3a2a00;
    font: 800 11px system-ui, sans-serif;
    opacity: 0;
  }
  .stamp {
    flex: none;
    margin: 4px 6px 4px 0;
    transform-origin: center;
    padding: 2px 6px;
    border: 2px solid #ff6b6b;
    border-radius: 3px;
    color: #ff6b6b;
    font: 800 11px system-ui, sans-serif;
    letter-spacing: 0.12em;
    opacity: 0;
    background: #0a1126cc;
  }
  .flash {
    position: absolute;
    inset: 0;
    background: #fff;
    opacity: 0;
    pointer-events: none;
  }
  .fx-skip {
    position: absolute;
    right: 10px;
    top: 10px;
    z-index: 3;
    min-width: 88px;
    min-height: 44px;
    padding: 8px 16px;
    border: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
    color: #fff;
    font: 700 13px system-ui, sans-serif;
    cursor: pointer;
  }
  .fx-skip:focus-visible {
    outline: 3px solid #ffda55;
    outline-offset: 2px;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
`

/** Water-drop badge on a card; the glow is written per frame as --g (0..1). */
export const EvolveBadgeStyle = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  isolation: isolate;
  /* a 44px target around the 36px badge */
  &::after {
    content: '';
    position: absolute;
    inset: -4px;
  }
  .eb-disc {
    position: absolute;
    inset: 2px;
    z-index: -2;
    border-radius: 50%;
    background: #0b1a2f;
    opacity: calc(0.55 + var(--g, 0.3) * 0.35);
  }
  .eb-aura {
    position: absolute;
    inset: -6px;
    z-index: -1;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(34, 184, 255, 0.85),
      rgba(34, 184, 255, 0) 68%
    );
    opacity: var(--g, 0.3);
    transform: scale(calc(0.85 + var(--g, 0.3) * 0.35));
  }
  .eb-drop {
    width: 18px;
    height: 24px;
    background: linear-gradient(160deg, #e6f7ff, #4cc3ff 55%, #1f7fe0);
    border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%;
    clip-path: path('M9 0 C9 0 18 11 18 16 A9 8 0 0 1 0 16 C0 11 9 0 9 0 Z');
    filter: drop-shadow(0 0 3px rgba(190, 235, 255, 0.9));
  }
  .eb-star {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 14px;
    height: 14px;
    background: #22b8ff;
    clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
    filter: drop-shadow(0 0 1.5px #0b1a3d) drop-shadow(0 0 1.5px #0b1a3d);
    opacity: calc(0.3 + var(--g, 0.3) * 0.7);
    transform: scale(calc(0.7 + var(--g, 0.3) * 0.6)) rotate(calc(var(--g, 0.3) * 40deg));
  }
  &[data-inline] {
    position: relative;
    top: auto;
    right: auto;
    display: inline-grid;
    vertical-align: middle;
  }
  &:focus-visible {
    outline: 3px solid #ffda55;
    outline-offset: 2px;
    border-radius: 50%;
  }
`

const rim = css`
  position: absolute;
  z-index: 4;
  left: 50%;
  top: 50%;
`

/** The ready ripple: a water ring breathing around the whole disc. */
export const EvolveRippleStyle = styled.span`
  ${rim}
  z-index: 0;
  width: calc(var(--R) * 2);
  height: calc(var(--R) * 2);
  margin: calc(var(--R) * -1) 0 0 calc(var(--R) * -1);
  border-radius: 50%;
  pointer-events: none;
  border: 3px solid rgba(125, 211, 252, 0.9);
  box-shadow:
    0 0 24px rgba(34, 184, 255, 0.55),
    inset 0 0 22px rgba(34, 184, 255, 0.3);
  opacity: calc(0.25 + var(--g, 0.3) * 0.55);
  transform: scale(calc(1.03 + var(--g, 0.3) * 0.06));
  &[data-calm] {
    opacity: 0.25;
    transform: none;
  }
`

/** The bubble at 12 o'clock on the disc's rim. --g (0..1) is the ready glow, --p the level progress. */
export const EvolveSatelliteStyle = styled.button`
  ${rim}
  --s: clamp(44px, calc(var(--R) * 0.5), 56px);
  width: var(--s);
  height: var(--s);
  margin: calc(var(--s) / -2) 0 0 calc(var(--s) / -2);
  padding: 0;
  border: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  isolation: isolate;
  color: #fff;
  background: conic-gradient(#4cc3ff var(--p, 100%), rgba(255, 255, 255, 0.22) 0);
  transform: translateY(calc(var(--R) * -1));
  box-shadow: 0 10px 22px -8px rgba(0, 0, 0, 0.7);
  /* a 44px+ target around the bubble */
  &::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
  }
  &::before {
    content: '';
    position: absolute;
    inset: 3px;
    z-index: -1;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #1d4f86, #0b1a2f);
  }
  .es-aura {
    position: absolute;
    inset: -10px;
    z-index: -2;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(34, 184, 255, 0.85),
      rgba(34, 184, 255, 0) 68%
    );
    opacity: 0;
  }
  .es-art {
    width: 74%;
    height: 74%;
    object-fit: contain;
    pointer-events: none;
  }
  small {
    position: absolute;
    left: 50%;
    bottom: -9px;
    padding: 0 7px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: #0b1a2f;
    box-shadow: 0 0 0 1.5px #4cc3ff;
    font: 800 10px/16px system-ui, sans-serif;
    white-space: nowrap;
  }
  .es-drop {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 14px;
    height: 14px;
    background: #22b8ff;
    clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
    filter: drop-shadow(0 0 1.5px #0b1a3d) drop-shadow(0 0 1.5px #0b1a3d);
    opacity: 0;
  }
  &[data-state='ready'] {
    background: conic-gradient(#fff, #7dd3fc, #fff);
    transform: translateY(calc(var(--R) * -1 - 6px))
      scale(calc(1 + var(--g, 0.3) * 0.08));
    box-shadow:
      0 0 calc(10px + var(--g, 0.3) * 22px) #4cc3ff,
      0 10px 22px -8px rgba(0, 0, 0, 0.7);
  }
  &[data-state='ready'] .es-aura {
    opacity: var(--g, 0.3);
  }
  &[data-state='ready'] .es-drop {
    opacity: 1;
  }
  &[data-state='soon'] .es-art {
    filter: brightness(0) opacity(0.75);
  }
  &:focus-visible {
    outline: 3px solid #ffda55;
    outline-offset: 3px;
  }
`
