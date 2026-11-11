import styled from 'styled-components'

export const AmberStyle = styled.span`
  --amber-light: #fff1a8;
  --amber: #fbc54e;
  --amber-deep: #873304;
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1;
  isolation: isolate;
  filter: drop-shadow(0 7px 5px #0a0f1d55) drop-shadow(0 0 10px #ffb43a30);
  transition: filter 350ms ease;

  .amber-fan {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
  }
  .amber-still {
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
    user-select: none;
  }
  .amber-fan .amber-still {
    position: absolute;
    top: 0;
    height: 100%;
  }
  > .amber-body {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    transform: perspective(500px) rotateX(6deg) rotateY(-8deg) rotateZ(-5deg);
    transition: transform 650ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .amber-piece {
    transform: translate(calc(var(--dx) * 1px), calc(var(--dy) * 1px));
    transition: transform 820ms cubic-bezier(0.2, 0.9, 0.25, 1.15);
  }
  /* the shard that just fell out of an answer drops into its place */
  .amber-piece[data-fresh] {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    animation: amber-fall 900ms cubic-bezier(0.3, 1.2, 0.5, 1) 450ms both;
  }
  @keyframes amber-fall {
    0% {
      opacity: 0;
      transform: translate(0, -90px) rotate(-40deg) scale(1.5);
      filter: brightness(2.4);
    }
    45% {
      opacity: 1;
    }
    70% {
      transform: translate(calc(var(--dx) * 1px), calc(var(--dy) * 1px + 5px))
        rotate(6deg) scale(1.08);
      filter: brightness(1.6);
    }
    100% {
      transform: translate(calc(var(--dx) * 1px), calc(var(--dy) * 1px));
      filter: none;
    }
  }
  .amber-piece[data-joined] {
    transform: none;
  }
  .amber-whole .amber-hairline {
    opacity: 0;
  }
  /* a rough, matte stone: dull rim, no mirror glints */
  .amber-whole .amber-edge {
    opacity: 0;
  }
  .amber-whole .amber-glint {
    display: none;
  }
  .amber-whole {
    animation: amber-fuse 700ms ease-out both;
  }
  @keyframes amber-fuse {
    0% {
      opacity: 0;
      filter: brightness(2.2);
    }
    100% {
      opacity: 1;
      filter: none;
    }
  }
  .amber-ghost {
    fill: #e9a93106;
    stroke: #ffd98a40;
    stroke-width: 0.35;
    stroke-linejoin: bevel;
  }
  .amber-depth {
    fill: #6a2c05;
    opacity: 0.85;
  }
  .amber-art {
    opacity: 1;
  }
  .amber-edge {
    fill: none;
    stroke-width: 0.45;
    stroke-linejoin: round;
    opacity: 0.45;
  }
  .amber-hairline {
    fill: none;
    stroke: #fff8d6;
    stroke-width: 0.3;
    opacity: 0.5;
  }
  .amber-facets,
  .amber-ripples,
  .amber-edge,
  .amber-hairline,
  .amber-depth {
    transition: opacity 650ms ease 280ms;
  }
  [data-joined] .amber-ripples,
  [data-joined] .amber-facets,
  [data-joined] .amber-hairline,
  [data-joined] .amber-depth {
    opacity: 0;
  }
  .amber-spark {
    fill: #fffbe8;
    pointer-events: none;
    opacity: 0;
    animation: amber-twinkle 3600ms ease-in-out var(--t) infinite;
  }
  [data-joined] .amber-edge {
    opacity: 0.55;
  }
  .amber-sweep {
    pointer-events: none;
    mix-blend-mode: screen;
    animation: amber-sweep 1800ms cubic-bezier(0.2, 0.7, 0.3, 1) var(--delay)
      both;
  }
  .amber-glint {
    fill: #fff7d7;
    opacity: 0;
    pointer-events: none;
    animation: amber-glint 2100ms ease-in-out var(--delay) both;
  }
  .amber-fallback {
    font: 700 30px/1 sans-serif;
    fill: #572b0c;
    text-anchor: middle;
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      filter: drop-shadow(0 12px 9px #090e1890) drop-shadow(0 0 12px #e5a12630);
    }
    &:hover > .amber-body {
      transform: perspective(500px) rotateX(-5deg) rotateY(9deg) rotateZ(2deg);
    }
  }
  /* — three looks — */
  .amber-aura,
  .amber-orbit,
  .amber-burst {
    position: absolute;
    pointer-events: none;
  }
  .amber-slot {
    position: absolute;
    top: 0;
    height: 100%;
    pointer-events: none;
  }
  .amber-aura {
    inset: -24%;
    z-index: -1;
    border-radius: 50%;
    opacity: 0;
  }
  /* partial: dim, waiting for its pieces */
  &[data-state='partial'] > .amber-body {
    filter: saturate(0.74) brightness(0.93);
  }
  &[data-state='partial'] .amber-ghost {
    animation: amber-wait 2600ms ease-in-out infinite;
  }
  &[data-state='partial'] .amber-spark {
    display: none;
  }
  /* ready: every piece is here — they strain toward one another, glowing */
  &[data-state='ready'] .amber-aura {
    background: radial-gradient(
      circle,
      #ffc24ac4 0%,
      #ff9a2a55 42%,
      transparent 70%
    );
    animation: amber-breathe 1500ms ease-in-out infinite;
  }
  &[data-state='ready'] .amber-piece {
    animation: amber-yearn 1100ms ease-in-out var(--delay) infinite alternate;
  }
  &[data-state='ready'] .amber-sweep {
    animation: amber-gleam 2200ms ease-in-out var(--delay) infinite;
  }
  &[data-state='ready'] .amber-spark {
    animation-duration: 1500ms;
  }
  /* whole: one finished stone — a turning ring of light, orbiting motes */
  &[data-state='whole'] .amber-aura {
    opacity: 1;
    background: conic-gradient(
      from 0deg,
      transparent 0%,
      #ffd366aa 10%,
      transparent 28%,
      #fff1b0aa 48%,
      transparent 64%,
      #ffb23caa 82%,
      transparent 100%
    );
    -webkit-mask: radial-gradient(
      circle,
      transparent 54%,
      #000 60%,
      transparent 72%
    );
    mask: radial-gradient(circle, transparent 54%, #000 60%, transparent 72%);
    animation: amber-turn 7s linear infinite;
  }
  &[data-state='whole'] .amber-sweep {
    animation: amber-gleam 4200ms ease-in-out calc(var(--delay) + 600ms)
      infinite;
  }
  .amber-orbit {
    left: 50%;
    top: 50%;
    width: 5%;
    height: 5%;
    margin: -2.5% 0 0 -2.5%;
    border-radius: 50%;
    background: radial-gradient(#fff, #ffe48a 55%, transparent 72%);
    box-shadow: 0 0 6px 1px #ffd45acc;
    animation: amber-orbit 5200ms linear calc(var(--o) * -1733ms) infinite;
  }
  /* a finished stone lands */
  &[data-arrive] {
    animation: amber-land 900ms cubic-bezier(0.2, 1.3, 0.3, 1) both;
  }
  .amber-burst {
    inset: 0;
    z-index: 3;
  }
  .amber-ring {
    position: absolute;
    inset: 12%;
    border-radius: 50%;
    border: 2px solid #fff0b0;
    box-shadow:
      0 0 16px 2px #ffc24a,
      inset 0 0 14px #ffd45a99;
    opacity: 0;
    animation: amber-ring 900ms ease-out var(--bd) both;
  }
  .amber-burst i {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 3px;
    height: 16%;
    margin: -8% 0 0 -1.5px;
    border-radius: 3px;
    background: linear-gradient(#fff, #ffd25a, transparent);
    opacity: 0;
    animation: amber-ray 900ms ease-out var(--bd) both;
  }
  @keyframes amber-wait {
    50% {
      opacity: 0.55;
    }
  }
  @keyframes amber-breathe {
    0%,
    100% {
      opacity: 0.45;
      transform: scale(0.92);
    }
    50% {
      opacity: 1;
      transform: scale(1.06);
    }
  }
  @keyframes amber-yearn {
    to {
      transform: translate(calc(var(--dx) * 0.55px), calc(var(--dy) * 0.55px));
    }
  }
  @keyframes amber-gleam {
    0% {
      transform: translateX(-45px) skewX(-18deg);
      opacity: 0;
    }
    12% {
      opacity: 1;
    }
    45%,
    100% {
      transform: translateX(160px) skewX(-18deg);
      opacity: 0;
    }
  }
  @keyframes amber-turn {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes amber-orbit {
    from {
      transform: rotate(0deg) translateX(62%) scale(1);
    }
    50% {
      transform: rotate(180deg) translateX(62%) scale(0.5);
    }
    to {
      transform: rotate(360deg) translateX(62%) scale(1);
    }
  }
  @keyframes amber-land {
    0% {
      opacity: 0;
      transform: scale(0.3) rotate(-24deg);
    }
    55% {
      opacity: 1;
      transform: scale(1.22) rotate(5deg);
    }
    100% {
      transform: none;
    }
  }
  @keyframes amber-ring {
    0% {
      opacity: 0.95;
      transform: scale(0.35);
    }
    100% {
      opacity: 0;
      transform: scale(1.75);
    }
  }
  @keyframes amber-ray {
    0% {
      opacity: 0;
      transform: rotate(var(--a)) translateY(-30%) scaleY(0.3);
    }
    22% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: rotate(var(--a)) translateY(calc(var(--r) * -190%)) scaleY(1);
    }
  }
  @keyframes amber-sweep {
    0% {
      transform: translateX(-45px) skewX(-18deg);
      opacity: 0;
    }
    18% {
      opacity: 1;
    }
    100% {
      transform: translateX(160px) skewX(-18deg);
      opacity: 0;
    }
  }
  @keyframes amber-twinkle {
    0%,
    55%,
    100% {
      opacity: 0;
    }
    70% {
      opacity: 1;
    }
    82% {
      opacity: 0.2;
    }
  }
  @keyframes amber-glint {
    0%,
    100% {
      opacity: 0.12;
    }
    42% {
      opacity: 1;
    }
    60% {
      opacity: 0.22;
    }
    73% {
      opacity: 0.7;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &,
    > .amber-body,
    .amber-piece,
    .amber-facets,
    .amber-edge,
    .amber-hairline,
    .amber-depth {
      transition: none;
    }
    .amber-sweep,
    .amber-orbit,
    .amber-burst {
      animation: none;
      display: none;
    }
    .amber-aura,
    .amber-whole,
    .amber-piece,
    .amber-ghost,
    &[data-arrive],
    .amber-piece[data-fresh] {
      animation: none !important;
    }
    .amber-spark {
      animation: none;
      opacity: 0.55;
    }
    .amber-glint {
      animation: none;
      opacity: 0.65;
    }
    &:hover > .amber-body {
      transform: perspective(500px) rotateX(6deg) rotateY(-8deg) rotateZ(-5deg);
    }
  }
`
