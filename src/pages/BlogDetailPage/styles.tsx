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
    gap: 18px;
    max-width: 1180px;
    height: 68px;
    margin-inline: auto;
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
  /* the trail: a dashed path, inked where the ball has been. At its end a
     random animated Pokémon waits in a 72px slot, a "Who's that Pokémon?"
     silhouette that shows its colours as the ball nears; the ball catches it
     (flash, drawn in, three shakes, click, stars). --p is the way travelled */
  .read-trail {
    --slot: 72px;
    position: relative;
    flex: 1;
    height: 60px;
    margin-inline: 14px 0;
  }
  .read-trail::before,
  .trail-fill {
    content: '';
    position: absolute;
    top: 50%;
    right: 0;
    left: 0;
    height: 0;
    border-top: 3px dashed rgba(23, 45, 69, 0.3);
    translate: 0 -50%;
  }
  .trail-fill {
    right: auto;
    width: calc(var(--p, 0) * (100% - var(--slot)) + 15px);
    border-top: 4px solid var(--berry);
    border-radius: 2px;
  }
  .ball-rig {
    position: absolute;
    z-index: 3;
    top: 50%;
    left: calc(var(--p, 0) * (100% - var(--slot)));
    width: 30px;
    height: 30px;
    margin-top: -15px;
  }
  .read-ball {
    display: block;
    width: 100%;
    height: 100%;
    rotate: var(--r, 0deg);
    filter: drop-shadow(0 3px 3px rgba(23, 45, 69, 0.3));
  }
  .ball-led {
    transition: fill 120ms;
  }
  .trail-mon {
    position: absolute;
    z-index: 2;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--slot);
    opacity: 0;
    transition: opacity 240ms ease-out;
  }
  .trail-mon[data-ready='true'] {
    opacity: 1;
  }
  .mon-body {
    display: flex;
    align-items: center;
    justify-content: center;
    transform-origin: 50% 80%;
    /* "Who's that Pokémon?": the dex's silhouette until the ball is near */
    filter: brightness(0) drop-shadow(0 0 1px rgba(255, 255, 255, 0.55))
      drop-shadow(0 0 10px rgba(80, 170, 255, 0.5));
    transition: filter 600ms ease-out;
  }
  [data-reveal='1'] .mon-body {
    filter: drop-shadow(0 3px 3px rgba(23, 45, 69, 0.25));
  }
  .mon-body img {
    display: block;
    max-width: none;
  }
  [data-pixel='true'] .mon-body img {
    image-rendering: pixelated;
  }
  .mon-shadow {
    position: absolute;
    bottom: 4px;
    left: 50%;
    width: 44px;
    height: 8px;
    margin-left: -22px;
    border-radius: 50%;
    background: radial-gradient(
      closest-side,
      rgba(23, 45, 69, 0.28),
      rgba(23, 45, 69, 0)
    );
    transition: opacity 240ms;
  }
  .fx-flash,
  .fx-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;
  }
  .fx-flash {
    width: 84px;
    height: 84px;
    margin: -42px 0 0 -42px;
    background: radial-gradient(
      circle,
      #fff 0,
      rgba(255, 244, 205, 0.9) 28%,
      rgba(255, 150, 110, 0.4) 55%,
      transparent 72%
    );
  }
  .fx-ring {
    width: 30px;
    height: 30px;
    margin: -15px 0 0 -15px;
    border: 3px solid #ffd23f;
  }
  .sparks i {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 11px;
    height: 11px;
    margin: -5.5px;
    background: linear-gradient(135deg, #fff7c2, #ffb800);
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
    opacity: 0;
    pointer-events: none;
  }
  .catch-star {
    position: absolute;
    top: -17px;
    left: 50%;
    width: 26px;
    height: 26px;
    margin-left: -13px;
    opacity: 0;
    scale: 0;
    pointer-events: none;
    filter: drop-shadow(0 2px 2px rgba(23, 45, 69, 0.3));
  }
  /* the end states, whatever the motion: caught = the Pokémon is in the ball,
     the star is out and the ball's light is on */
  [data-state='caught'] .read-ball {
    rotate: 0deg;
  }
  [data-state='caught'] .ball-led {
    fill: #7dffb0;
  }
  [data-state='caught'] .trail-mon {
    opacity: 0;
  }
  [data-state='caught'] .catch-star {
    opacity: 1;
    scale: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    .read-ball {
      rotate: 0deg;
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    /* the Pokémon: flashes white, goes red, is pulled into the ball */
    [data-state='caught'] .mon-body {
      animation: mon-in 560ms cubic-bezier(0.55, 0, 0.8, 0.5) both;
    }
    [data-state='caught'] .mon-shadow {
      opacity: 0;
    }
    [data-state='caught'] .fx-flash {
      animation: fx-flash 420ms 120ms ease-out both;
    }
    /* the ball: closes with a squash, shakes three times, light blinks,
       clicks shut (ring + sparks + star) */
    [data-state='caught'] .read-ball {
      animation: ball-shake 1200ms 620ms ease-in-out both;
    }
    [data-state='caught'] .ball-led {
      animation: led 1200ms 620ms steps(1, end) both;
    }
    [data-state='caught'] .fx-ring {
      animation: fx-ring 560ms 1840ms ease-out both;
    }
    [data-state='caught'] .sparks i {
      animation: spark 640ms 1840ms cubic-bezier(0.1, 0.8, 0.3, 1) both;
    }
    [data-state='caught'] .catch-star {
      animation: star-pop 700ms 1840ms cubic-bezier(0.3, 1.6, 0.5, 1) both;
    }
    /* let out */
    [data-state='release'] .read-ball {
      animation: ball-open 460ms ease-out both;
    }
    [data-state='release'] .fx-flash {
      animation: fx-flash 520ms 140ms ease-out both;
    }
    [data-state='release'] .mon-body {
      animation: mon-out 640ms 160ms cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
    }
    [data-state='release'] .sparks i {
      animation: spark 520ms 160ms cubic-bezier(0.1, 0.8, 0.3, 1) both;
    }
  }
  @keyframes mon-in {
    0% {
      filter: none;
    }
    30% {
      filter: brightness(4) saturate(0);
      scale: 1.08;
    }
    62% {
      filter: brightness(1.6) sepia(1) hue-rotate(-50deg) saturate(8);
      scale: 0.7;
      opacity: 1;
    }
    100% {
      filter: brightness(1.6) sepia(1) hue-rotate(-50deg) saturate(8);
      translate: -26px 2px;
      scale: 0;
      opacity: 0;
    }
  }
  @keyframes mon-out {
    0% {
      filter: brightness(4) saturate(0) drop-shadow(0 0 8px #fff);
      translate: -26px 2px;
      scale: 0;
      opacity: 0;
    }
    45% {
      filter: brightness(1.6) sepia(1) hue-rotate(-50deg) saturate(8);
      scale: 1.12;
      translate: 0 0;
      opacity: 1;
    }
    100% {
      filter: drop-shadow(0 3px 3px rgba(23, 45, 69, 0.25));
      scale: 1;
      translate: 0 0;
      opacity: 1;
    }
  }
  /* three shakes, each smaller, then still */
  @keyframes ball-shake {
    0%,
    100% {
      rotate: 0deg;
      translate: 0 0;
      scale: 1;
    }
    6% {
      scale: 1.18 0.86;
    }
    12% {
      scale: 1;
    }
    24% {
      rotate: -28deg;
      translate: -2px 0;
    }
    38% {
      rotate: 24deg;
      translate: 2px 0;
    }
    52% {
      rotate: -18deg;
      translate: -1px 0;
    }
    64% {
      rotate: 14deg;
      translate: 1px 0;
    }
    76% {
      rotate: -7deg;
    }
    88% {
      rotate: 2deg;
    }
    94% {
      scale: 1.12;
    }
  }
  @keyframes led {
    0%,
    24% {
      fill: #fff;
    }
    25%,
    36% {
      fill: #ff5a3c;
    }
    37%,
    52% {
      fill: #fff;
    }
    53%,
    64% {
      fill: #ff5a3c;
    }
    65%,
    100% {
      fill: #fff;
    }
  }
  @keyframes fx-flash {
    0% {
      opacity: 0;
      scale: 0.3;
    }
    35% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      scale: 1.3;
    }
  }
  @keyframes fx-ring {
    0% {
      opacity: 0.9;
      scale: 0.6;
    }
    100% {
      opacity: 0;
      scale: 2.6;
    }
  }
  @keyframes spark {
    0% {
      opacity: 0;
      transform: rotate(var(--a)) translateY(0) scale(0.4);
    }
    25% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: rotate(var(--a)) translateY(calc(var(--d) * -1)) scale(1);
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
      scale: 1.3;
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
  @keyframes ball-open {
    0% {
      translate: 0 0;
      scale: 1;
    }
    30% {
      translate: 0 -7px;
      scale: 1.12;
    }
    100% {
      translate: 0 0;
      scale: 1;
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
    scroll-margin-top: 92px; /* clears the sticky reading rail */
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
