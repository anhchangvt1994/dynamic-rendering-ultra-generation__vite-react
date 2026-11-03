import { BlogStyle } from 'pages/BlogPage/styles'

/**
 * /blogs/:slug: one page of the notebook. The cover runs edge to edge, the
 * title sits on a paper strip over its bottom edge. The rules of the desk
 * (cover, stamp, specimen) come from BlogStyle.
 */
export const BlogDetailStyle = styled(BlogStyle)`
  padding-top: 0;

  > * {
    max-width: none;
  }
  /* ── the rail: back and the reading trail, pinned above the page ── */
  .read-rail {
    position: sticky;
    z-index: 6;
    top: 0;
    margin: 0 -16px;
    padding: 0 16px;
    border-bottom: 2px solid var(--ink);
    background: rgba(255, 253, 247, 0.94);
    backdrop-filter: blur(6px);
  }
  .read-inner {
    display: flex;
    align-items: center;
    gap: 8px;
    /* starts with the 1180px column, runs on to the rail's right edge */
    height: 76px;
    margin-left: max(0px, calc((100% - 1180px) / 2));
  }
  .rail-back {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 16px 0 12px;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 2px 2px 0 var(--ink);
    transition:
      translate 120ms ease-out,
      box-shadow 120ms ease-out;
  }
  .rail-back:hover {
    translate: -1px -1px;
    box-shadow: 3px 3px 0 var(--ink);
  }
  .rail-back:active {
    translate: 2px 2px;
    box-shadow: none;
  }
  .rail-back .chev {
    width: 8px;
    height: 8px;
    margin-left: 3px;
    border: solid var(--ink);
    border-width: 0 2.5px 2.5px 0;
    rotate: 135deg;
  }
  /* the trail: a dashed path, inked where the ball has been. A random
     animated Pokémon waits at its end, a "Who's that Pokémon?" silhouette
     that shows its colours as the ball nears. The ball opens, catches it, goes
     on to the end. --p is the way read (0 to 1) */
  .read-trail {
    position: relative;
    flex: 1;
    height: 68px;
    margin-inline: 8px;
  }
  .read-trail::before,
  .trail-fill {
    content: '';
    position: absolute;
    top: 50%;
    left: 2px;
    height: 0;
    border-top: 3px dashed rgba(23, 45, 69, 0.3);
    width: calc(100% - 4px);
    transform: translateY(-50%);
  }
  .trail-fill {
    right: auto;
    width: calc(var(--p, 0) * (100% - 30px) + 15px);
    border-top: 4px solid var(--berry);
    border-radius: 2px;
  }
  /* the ball rolls the whole trail, on past the Pokémon once it is caught */
  .ball-rig {
    position: absolute;
    z-index: 3;
    top: 50%;
    left: calc(var(--p, 0) * (100% - 30px));
    width: 30px;
    height: 30px;
    margin-top: -15px;
  }
  .ball-roll {
    display: block;
    width: 100%;
    height: 100%;
    rotate: var(--r, 0deg);
  }
  .ball-fx {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 3px 3px rgba(23, 45, 69, 0.3));
  }
  .bh {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  /* the cap flips open on a hinge at its left end */
  .bh--cap {
    transform-origin: 6% 50%;
  }
  .ball-led {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5px;
    height: 5px;
    margin: -2.5px;
    border-radius: 50%;
    background: #fff;
    transition: background 120ms;
  }
  /* the Pokémon stands on the trail, large, towards its end */
  .trail-mon {
    position: absolute;
    z-index: 2;
    top: 0;
    bottom: 0;
    left: calc(100% - 4px);
    margin-left: -48px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 96px;
    opacity: 0;
    transition: opacity 240ms ease-out;
  }
  .trail-mon[data-ready='true'] {
    opacity: 1;
  }
  .mon-ripple {
    position: relative;
    display: flex;
  }
  /* the white Pokémon is filled with a flowing seven-colour gradient: the
     artwork itself is the mask, so the rainbow takes its exact shape */
  .mon-ripple::after {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
    background: linear-gradient(
      115deg,
      #ff3b5c,
      #ff9f1c,
      #ffe14d,
      #3ddc84,
      #2ec4ff,
      #5b6cff,
      #c158ff,
      #ff3b5c
    );
    background-size: 220% 220%;
    -webkit-mask: var(--art) center / 100% 100% no-repeat;
    mask: var(--art) center / 100% 100% no-repeat;
  }
  .fx {
    position: absolute;
    top: 50%;
    left: 50%;
    opacity: 0;
    pointer-events: none;
  }
  .fx-flash,
  .fx-ring {
    border-radius: 50%;
  }
  .fx-flash {
    width: 90px;
    height: 90px;
    margin: -45px 0 0 -45px;
    background: radial-gradient(
      circle,
      #fff 0 30%,
      rgba(255, 246, 200, 0.85) 45%,
      rgba(255, 255, 255, 0) 70%
    );
  }
  .fx-ring {
    width: 30px;
    height: 30px;
    margin: -15px 0 0 -15px;
    border: 3px solid #ffd23f;
  }
  .fx-ring--b {
    border-color: #ff6fb5;
    border-width: 2px;
  }
  .fx-rays {
    width: 150px;
    height: 150px;
    margin: -75px 0 0 -75px;
    border-radius: 50%;
    background: repeating-conic-gradient(
      rgba(255, 214, 90, 0.95) 0 6deg,
      rgba(255, 214, 90, 0) 6deg 30deg
    );
    -webkit-mask-image: radial-gradient(circle, #000 12%, transparent 68%);
    mask-image: radial-gradient(circle, #000 12%, transparent 68%);
  }
  .sparks {
    position: absolute;
    top: 50%;
    left: 50%;
    pointer-events: none;
  }
  /* i flies sideways, svg goes up and falls: together, an arc */
  .sparks i {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
  }
  .sparks svg {
    position: absolute;
    top: 0;
    left: 0;
    width: calc(22px * var(--s, 1));
    height: calc(22px * var(--s, 1));
    margin: calc(-11px * var(--s, 1)) 0 0 calc(-11px * var(--s, 1));
    overflow: visible;
    fill: currentColor;
    stroke: #172d45;
    stroke-width: 2.4;
    stroke-linejoin: round;
    paint-order: stroke;
    opacity: 0;
  }
  .catch-star {
    position: absolute;
    top: -19px;
    left: 50%;
    width: 22px;
    height: 22px;
    margin-left: -11px;
    opacity: 0;
    scale: 0;
    pointer-events: none;
    filter: drop-shadow(0 2px 2px rgba(23, 45, 69, 0.3));
  }
  /* the end states, whatever the motion: caught = the Pokémon is in the ball
     (the ball carries a star and its light is on) */
  [data-state='caught'] .mon-body,
  [data-state='caught'] .mon-shadow {
    opacity: 0;
  }
  [data-state='caught'] .ball-led {
    background: #7dffb0;
  }
  [data-state='caught'] .catch-star {
    opacity: 1;
    scale: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    .ball-roll {
      rotate: 0deg;
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    /* caught: the Pokémon turns white, the water ripples through it (as in
       "Who's that Pokémon?"), then it is slowly drawn into the ball, which
       swells, shakes three times, clicks and throws a fountain of stars */
    [data-state='caught'] .trail-mon .mon-body {
      animation: mon-in 1400ms both;
    }
    [data-state='caught'] .mon-ripple {
      animation: mon-ripple-in 1400ms both;
    }
    [data-state='caught'] .mon-shadow {
      animation: shadow-out 1400ms both;
    }
    [data-state='caught'] .mon-ripple img {
      animation: img-in 1400ms both;
    }
    [data-state='caught'] .mon-ripple::after {
      animation:
        rainbow-in 1400ms both,
        rainbow-flow 1100ms linear infinite;
    }
    [data-state='caught'] .ball-fx {
      animation: ball-catch 2300ms ease-in-out both;
    }
    [data-state='caught'] .fx-flash {
      animation: fx-flash 520ms 1300ms ease-out both;
    }
    [data-state='caught'] .ball-led {
      animation: led 700ms 1400ms steps(1, end) both;
    }
    [data-state='caught'] .fx-rays {
      animation: rays 1000ms 2100ms ease-out both;
    }
    [data-state='caught'] .fx-ring {
      animation: fx-ring 640ms 2100ms ease-out both;
    }
    [data-state='caught'] .fx-ring--b {
      animation: fx-ring 760ms 2240ms ease-out both;
    }
    [data-state='caught'] .catch-star {
      animation: star-pop 700ms 2160ms cubic-bezier(0.3, 1.6, 0.5, 1) both;
    }
    [data-state='caught'] .sparks i {
      animation: spark-x 1000ms cubic-bezier(0.15, 0.6, 0.35, 1)
        calc(2100ms + var(--t)) both;
    }
    [data-state='caught'] .sparks svg {
      animation: spark-y 1000ms linear calc(2100ms + var(--t)) both;
    }
    /* let out: the ball swells and throws its stars, the Pokémon rises from
       it white, the water ripples, its colours come back */
    [data-state='release'] .trail-mon .mon-body {
      animation: mon-out 1300ms both;
    }
    [data-state='release'] .mon-ripple {
      animation: mon-ripple-out 1300ms both;
    }
    [data-state='release'] .mon-shadow {
      animation: shadow-in 1300ms both;
    }
    [data-state='release'] .mon-ripple img {
      animation: img-out 1300ms both;
    }
    [data-state='release'] .mon-ripple::after {
      animation:
        rainbow-out 1300ms both,
        rainbow-flow 1100ms linear infinite;
    }
    [data-state='release'] .ball-fx {
      animation: ball-release 900ms ease-in-out both;
    }
    [data-state='release'] .fx-flash {
      animation: fx-flash 520ms ease-out both;
    }
    [data-state='release'] .fx-rays {
      animation: rays 800ms ease-out both;
    }
    [data-state='release'] .fx-ring {
      animation: fx-ring 640ms ease-out both;
    }
    [data-state='release'] .sparks i {
      animation: spark-x-b 1000ms cubic-bezier(0.15, 0.6, 0.35, 1)
        calc(60ms + var(--t)) both;
    }
    [data-state='release'] .sparks svg {
      animation: spark-y-b 1000ms linear calc(60ms + var(--t)) both;
    }
  }
  @keyframes ball-catch {
    0%,
    24% {
      scale: 1;
    }
    40%,
    56% {
      scale: 1.22;
    }
    61% {
      scale: 1.12;
      rotate: 0deg;
    }
    66% {
      rotate: -26deg;
    }
    73% {
      rotate: 22deg;
    }
    80% {
      rotate: -14deg;
    }
    86% {
      rotate: 8deg;
    }
    90% {
      rotate: 0deg;
      scale: 1.1;
    }
    94% {
      scale: 1.6 1.25;
    }
    100% {
      scale: 1;
    }
  }
  @keyframes ball-release {
    0% {
      scale: 1;
    }
    18% {
      scale: 1.55 1.3;
    }
    50% {
      scale: 1.2;
    }
    100% {
      scale: 1;
    }
  }
  /* white at once, held while the water ripples, then slowly drawn in */
  @keyframes mon-in {
    0% {
      filter: brightness(1) invert(0)
        drop-shadow(0 3px 3px rgba(23, 45, 69, 0.25));
      scale: 1;
      opacity: 1;
    }
    11%,
    50% {
      filter: brightness(1) invert(0)
        drop-shadow(0 0 10px rgba(255, 140, 230, 0.75));
      scale: 1.06;
      opacity: 1;
    }
    100% {
      filter: brightness(1) invert(0)
        drop-shadow(0 0 10px rgba(255, 140, 230, 0.75));
      translate: var(--dx, 0px) var(--dy, 0px);
      scale: 0.06 0.2;
      opacity: 0;
      animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
    }
  }
  @keyframes mon-out {
    0% {
      filter: brightness(1) invert(0)
        drop-shadow(0 0 10px rgba(255, 140, 230, 0.75));
      translate: var(--dx, 0px) var(--dy, 0px);
      scale: 0.06 0.2;
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    30%,
    74% {
      filter: brightness(1) invert(0)
        drop-shadow(0 0 10px rgba(255, 140, 230, 0.75));
      translate: 0 0;
      scale: 1.06;
      opacity: 1;
    }
    100% {
      filter: brightness(1) invert(0)
        drop-shadow(0 3px 3px rgba(23, 45, 69, 0.25));
      translate: 0 0;
      scale: 1;
      opacity: 1;
    }
  }
  /* the water: a wavy displacement (the SVG filter) while it is white */
  @keyframes mon-ripple-in {
    0%,
    9% {
      filter: none;
    }
    10%,
    49% {
      filter: url(#rr-ripple);
    }
    50%,
    100% {
      filter: none;
    }
  }
  @keyframes mon-ripple-out {
    0%,
    23% {
      filter: none;
    }
    24%,
    78% {
      filter: url(#rr-ripple);
    }
    79%,
    100% {
      filter: none;
    }
  }
  @keyframes rainbow-in {
    0% {
      opacity: 0;
    }
    11%,
    100% {
      opacity: 1;
    }
  }
  @keyframes rainbow-out {
    0%,
    74% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  /* the sprite itself steps aside while the rainbow wears its shape */
  @keyframes img-in {
    0%,
    11% {
      opacity: 1;
    }
    12%,
    100% {
      opacity: 0;
    }
  }
  @keyframes img-out {
    0%,
    74% {
      opacity: 0;
    }
    75%,
    100% {
      opacity: 1;
    }
  }
  @keyframes rainbow-flow {
    from {
      background-position: 0% 0%;
    }
    to {
      background-position: 220% 220%;
    }
  }
  @keyframes shadow-out {
    0%,
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  @keyframes shadow-in {
    0%,
    30% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
  @keyframes led {
    0%,
    24% {
      background: #fff;
    }
    25%,
    36% {
      background: #ff5a3c;
    }
    37%,
    52% {
      background: #fff;
    }
    53%,
    64% {
      background: #ff5a3c;
    }
    65%,
    100% {
      background: #fff;
    }
  }
  @keyframes fx-flash {
    0% {
      opacity: 0;
      scale: 0.2;
    }
    25% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      scale: 1.8;
    }
  }
  @keyframes fx-ring {
    0% {
      opacity: 0.95;
      scale: 0.6;
    }
    100% {
      opacity: 0;
      scale: 3.4;
    }
  }
  @keyframes rays {
    0% {
      opacity: 0;
      scale: 0.3;
      rotate: 0deg;
    }
    22% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      scale: 1.35;
      rotate: 70deg;
    }
  }
  /* the stars use their own names in each state: a state change must restart
     the fountain, every time the end is reached or left */
  @keyframes spark-x {
    to {
      translate: var(--x) 0;
    }
  }
  @keyframes spark-x-b {
    to {
      translate: var(--x) 0;
    }
  }
  @keyframes spark-y {
    0% {
      opacity: 0;
      scale: 0.2;
      rotate: 0deg;
      translate: 0 0;
      animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1);
    }
    10% {
      opacity: 1;
    }
    36% {
      opacity: 1;
      scale: 1.25;
      translate: 0 var(--h);
      animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.6);
    }
    72% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      scale: 0.55;
      rotate: var(--rot);
      translate: 0 var(--f);
    }
  }
  @keyframes spark-y-b {
    0% {
      opacity: 0;
      scale: 0.2;
      rotate: 0deg;
      translate: 0 0;
      animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1);
    }
    10% {
      opacity: 1;
    }
    36% {
      opacity: 1;
      scale: 1.25;
      translate: 0 var(--h);
      animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.6);
    }
    72% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      scale: 0.55;
      rotate: var(--rot);
      translate: 0 var(--f);
    }
  }
  @keyframes star-pop {
    0% {
      opacity: 0;
      scale: 0;
      rotate: -120deg;
      translate: 0 20px;
    }
    55% {
      opacity: 1;
      scale: 1.5;
      rotate: 14deg;
      translate: 0 -4px;
    }
    100% {
      opacity: 1;
      scale: 1;
      rotate: 0deg;
      translate: 0 0;
    }
  }
  .blog-article {
    max-width: 1180px;
    margin-inline: auto;
  }
  @media (min-width: 1100px) {
    /* the sheet: a column for the contents, the text beside it */
    .blog-article {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      column-gap: 48px;
    }
    .blog-article > .blog-cover,
    .blog-article > .blog-head {
      grid-column: 1 / -1;
    }
    .blog-article > script {
      display: none;
    }
  }
  .blog-cover {
    position: relative;
    aspect-ratio: 4 / 3;
    margin-inline: -16px;
    border-bottom: 3px solid var(--ink);
  }
  .blog-cover.cover img {
    object-fit: contain;
  }
  @media (min-width: 700px) {
    .blog-cover {
      aspect-ratio: 21 / 9;
      margin: 24px 0 0;
      border: 3px solid var(--ink);
      border-radius: 6px;
    }
    .blog-head {
      width: min(100%, 920px);
      margin-inline: 24px;
    }
  }
  .blog-head {
    position: relative;
    z-index: 2;
    display: grid;
    gap: 10px;
    margin: -44px 0 0;
    padding: 16px 16px 18px;
    border: 3px solid var(--ink);
    border-radius: 6px;
    background: var(--paper);
    box-shadow: 5px 5px 0 var(--ink);
  }
  .blog-tagrow {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 28px;
  }
  .blog-no {
    padding: 2px 9px;
    border-radius: 4px;
    background: var(--ink);
    color: var(--paper);
    font-family: var(--font-display);
    font-size: 12px;
    line-height: 1.6;
  }
  .blog-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(22px, 6vw, 42px);
    font-weight: 400;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
  .blog-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    margin: 0;
    font-size: 14px;
    line-height: 24px;
    color: var(--muted);
  }

  /* ── the body: a readable measure ── */
  .blog-body {
    max-width: 68ch;
    margin: 32px auto 0;
    font-size: 17px;
    line-height: 1.75;
    overflow-wrap: anywhere;
  }
  .blog-body > :first-child {
    margin-top: 0;
  }
  .blog-body p,
  .blog-body ul,
  .blog-body ol {
    margin: 0 0 1.1em;
  }
  .blog-body > p:first-child::first-letter {
    float: left;
    margin: 0.06em 0.12em 0 0;
    font-family: var(--font-display);
    font-size: 3.6em;
    line-height: 0.85;
    color: var(--berry);
  }
  .blog-body h2,
  .blog-body h3 {
    scroll-margin-top: 100px; /* clears the sticky reading rail */
    margin: 1.6em 0 0.5em;
    font-family: var(--font-display);
    font-weight: 400;
    line-height: 1.4;
  }
  .blog-body h2 {
    font-size: 24px;
  }
  .blog-body h3 {
    font-size: 19px;
  }
  .blog-body ul,
  .blog-body ol {
    padding-left: 1.4em;
  }
  .blog-body ul {
    list-style: none;
  }
  .blog-body ul > li {
    position: relative;
  }
  .blog-body ul > li::before {
    content: '';
    position: absolute;
    top: 0.72em;
    left: -1.1em;
    width: 8px;
    height: 8px;
    border: 2px solid var(--ink);
    border-radius: 50%;
    background: linear-gradient(var(--berry) 50%, #fff 50%);
  }
  .blog-body ol {
    list-style: decimal;
  }
  .blog-body ol > li::marker {
    color: var(--berry);
    font-weight: 800;
  }
  .blog-body li + li {
    margin-top: 0.3em;
  }
  .blog-body a {
    color: #2a4d8f;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .blog-body code {
    padding: 1px 6px;
    border-radius: 4px;
    background: rgba(23, 45, 69, 0.09);
    font-size: 0.9em;
  }
  .blog-body pre {
    margin: 0 0 1.2em;
    padding: 14px 16px;
    overflow-x: auto;
    border: 2px solid var(--ink);
    border-radius: 6px;
    background: #fff;
    line-height: 1.5;
  }
  .blog-body pre code {
    padding: 0;
    background: none;
    font-size: 14px;
  }
  .blog-body figure {
    margin: 1.4em 0;
  }
  .blog-body figure img {
    display: block;
    width: 100%;
    height: auto;
    border: 2px solid var(--ink);
    border-radius: 6px;
    background: var(--paper);
  }
  .blog-body figcaption {
    margin-top: 6px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--muted);
  }
  .blog-body hr {
    margin: 2em 0;
    border: 0;
    border-top: 2px dashed rgba(23, 45, 69, 0.35);
  }
  /* a quote is a sticky note */
  .blog-body blockquote {
    margin: 1.4em 0;
    padding: 14px 18px;
    background: #fff0a6;
    box-shadow: 3px 4px 0 rgba(23, 45, 69, 0.25);
    rotate: -0.8deg;
  }
  .blog-body blockquote p {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
  }
  @media (min-width: 1100px) {
    .blog-body {
      max-width: 700px;
      margin: 40px 0 0;
    }
  }

  /* ── the contents, beside the text on a wide screen ── */
  .blog-aside {
    display: none;
  }
  @media (min-width: 1100px) {
    .blog-aside {
      display: block;
      margin-top: 40px;
    }
  }
  .blog-outline {
    position: sticky;
    top: 24px;
    padding: 14px 0 14px 16px;
    border-left: 2px dashed rgba(23, 45, 69, 0.35);
  }
  .blog-outline p {
    margin: 0 0 6px;
    font-size: 13px;
    font-weight: 800;
    color: var(--muted);
  }
  .blog-outline ol {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .blog-outline button {
    position: relative;
    width: 100%;
    min-height: 40px;
    padding: 6px 10px;
    border: 0;
    border-radius: 6px;
    background: none;
    color: var(--muted);
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.35;
    text-align: left;
    cursor: pointer;
    transition:
      background 140ms ease-out,
      color 140ms ease-out;
  }
  .blog-outline button:hover {
    background: rgba(23, 45, 69, 0.07);
    color: var(--ink);
  }
  .blog-outline button[aria-current='true'] {
    background: rgba(255, 203, 5, 0.35);
    color: var(--ink);
  }
  .blog-outline button[aria-current='true']::before {
    content: '';
    position: absolute;
    top: 8px;
    bottom: 8px;
    left: -19px;
    width: 4px;
    border-radius: 2px;
    background: var(--berry);
  }

  /* ── the end of the page ── */
  .blog-end {
    display: grid;
    gap: 14px;
    margin-top: 48px;
    padding: 18px;
    border: 2px dashed rgba(23, 45, 69, 0.4);
    border-radius: 8px;
    background: rgba(255, 253, 247, 0.7);
  }
  .blog-end p {
    margin: 0;
    font-weight: 700;
    line-height: 1.5;
  }
  .blog-end div {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .blog-copy,
  .blog-all {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 22px;
    border-radius: 999px;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
    transition:
      translate 120ms ease-out,
      box-shadow 120ms ease-out,
      background 160ms ease-out;
  }
  .blog-copy {
    border: 0;
    background: var(--berry);
    color: #fff;
    box-shadow: 0 3px 0 #a52a4b;
  }
  .blog-copy[data-state='done'] {
    background: #2f7a4f;
    box-shadow: 0 3px 0 #1f5636;
  }
  .blog-copy[data-state='failed'] {
    background: #b8372e;
    box-shadow: 0 3px 0 #7d241d;
  }
  .blog-all {
    border: 2px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    box-shadow: 2px 2px 0 var(--ink);
  }
  .blog-copy:active,
  .blog-all:active {
    translate: 0 3px;
    box-shadow: none;
  }

  /* ── Đọc tiếp ── */
  .blog-related {
    max-width: 1100px;
    margin: 56px auto 0;
  }
  .blog-related h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 400;
    line-height: 1.5;
  }
  .blog-related .blog-grid {
    margin-top: 22px;
  }
`
