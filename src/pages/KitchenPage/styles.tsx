import styled from 'styled-components'

/**
 * A pastel patisserie: cream and strawberry, a marble counter, warm wood,
 * ink outlines like the quiz's; dishes in their flavours' colours.
 */
export const KitchenStyle = styled.div`
  --ink: #172d45;
  --cream: #fff8ef;
  --rose: #ffb3c9;
  --berry: #e8587d;
  --wood: #c98b5a;
  --mint: #bfeede;
  min-height: 100%;
  padding: 24px 16px 120px;
  background:
    radial-gradient(
      circle at 12% 8%,
      rgba(255, 179, 201, 0.55),
      transparent 32%
    ),
    radial-gradient(
      circle at 92% 18%,
      rgba(191, 238, 222, 0.6),
      transparent 30%
    ),
    #fff6ee;
  color: var(--ink);

  > * {
    max-width: 1100px;
    margin-inline: auto;
  }

  /* ── the hero: Alcremie at the counter ── */
  .kitchen-hero {
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    align-items: center;
    gap: 20px;
    padding: 18px 20px;
    border: 3px solid var(--ink);
    border-radius: 28px;
    background:
      linear-gradient(
        160deg,
        rgba(255, 255, 255, 0.85),
        rgba(255, 240, 246, 0.9)
      ),
      linear-gradient(
        115deg,
        #f4eef0 25%,
        #fff 26% 48%,
        #f1e9ec 49% 70%,
        #fff 71%
      );
    box-shadow: 6px 6px 0 var(--ink);
  }
  .chef {
    position: relative;
    display: grid;
    justify-items: center;
  }
  .chef img {
    width: 150px;
    height: 150px;
    object-fit: contain;
    filter: drop-shadow(0 8px 0 rgba(23, 45, 69, 0.15));
    animation: chef-wave 2.6s ease-in-out infinite;
  }
  .chef-line {
    position: relative;
    width: 180px;
    min-height: 46px;
    display: grid;
    place-items: center;
    margin: 4px 0 0;
    padding: 6px 10px;
    border: 2px solid var(--ink);
    border-radius: 14px;
    background: #fff;
    font-size: 10px;
    font-weight: 700;
    text-align: center;
  }
  .kitchen-kicker {
    margin: 0;
    color: var(--berry);
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .kitchen-title {
    margin: 16px 0;
    font-family: var(--font-display);
    font-size: clamp(26px, 4.2vw, 54px);
    line-height: 1.15 !important;
    text-wrap: balance;
    color: var(--berry);
    -webkit-text-stroke: 1.5px var(--ink);
    paint-order: stroke fill;
    text-shadow: 0 4px 0 var(--ink);
  }
  .kitchen-lede {
    margin: 0 0 10px;
    font-size: 14px;
    line-height: 1.5;
  }
  .flavor-key {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0 0 8px;
    padding: 0;
    list-style: none;
  }
  .flavor-key li {
    padding: 3px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--c) 18%, #fff);
    box-shadow: inset 0 0 0 1.5px var(--c);
    font-size: 12px;
    font-weight: 700;
  }
  .kitchen-found {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
  }
  .kitchen-found b {
    display: inline-block;
    min-width: 2.6em;
    text-align: left;
    font-variant-numeric: tabular-nums;
    color: var(--berry);
    font-size: 18px;
  }

  /* a tab panel takes the focus back from the cooking dialog: no ring */
  [role='tabpanel']:focus {
    outline: none;
  }
  /* ── tabs ── */
  .kitchen-tabs {
    display: flex;
    gap: 8px;
    margin-top: 22px;
    margin-bottom: 14px;
  }
  .kitchen-tabs button {
    flex: 1 1 0;
    min-height: 48px;
    border: 3px solid var(--ink);
    border-radius: 16px;
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-family: var(--font-display);
    font-size: 17px;
    box-shadow: 4px 4px 0 var(--ink);
    cursor: pointer;
  }
  .kitchen-tabs button[aria-selected='true'] {
    background: var(--rose);
  }
  .kitchen-tabs button:focus-visible,
  .menu-filter button:focus-visible {
    outline: 3px solid var(--berry);
    outline-offset: 3px;
  }
  .kitchen-note,
  .kitchen-guest {
    margin-bottom: 12px;
    padding: 10px 14px;
    border: 2px solid var(--ink);
    border-radius: 14px;
    background: #fff;
    font-weight: 700;
  }
  .sign-in-cook {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 16px;
    border: 3px solid var(--ink);
    border-radius: 14px;
    background: var(--berry);
    color: #fff;
    font-family: var(--font-display);
    box-shadow: 3px 3px 0 var(--ink);
  }

  /* ── the menu ── */
  .menu-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
  }
  .menu-filter button {
    min-height: 36px;
    padding: 0 12px;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .menu-filter button[aria-pressed='true'] {
    background: color-mix(in srgb, var(--c, var(--rose)) 35%, #fff);
    box-shadow: inset 0 0 0 2px var(--c, var(--berry));
  }
  .menu-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
    gap: 14px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .menu-card {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    align-content: start;
    gap: 6px 12px;
    padding: 14px;
    border: 3px solid var(--ink);
    border-radius: 22px;
    background: #fff;
    box-shadow: 5px 5px 0 var(--ink);
  }
  .menu-card[data-offscreen] * {
    animation-play-state: paused !important;
  }
  .menu-card[data-ready] {
    background: linear-gradient(160deg, #fff, #fff1f6);
  }
  /* a secret: a lilac card, a little starlight behind its silhouette */
  .menu-card[data-secret] {
    background:
      radial-gradient(
        circle at 18% 30%,
        rgba(176, 124, 255, 0.18),
        transparent 40%
      ),
      #f7f3ff;
  }
  .menu-card .dish-art {
    grid-row: 1 / 3;
    align-self: start;
  }
  /* Recipe slip: artwork and title share the masthead; ingredients use
     the whole counter rather than squeezing beside an 88px illustration. */
  .menu-body {
    display: contents;
  }
  .menu-body > .menu-kicker,
  .menu-body > .dish-name {
    grid-column: 2;
  }
  .menu-body > .stat-chips,
  .menu-body > .recipe,
  .menu-body > .menu-hint {
    grid-column: 1 / -1;
  }
  .menu-body > .stat-chips {
    margin-top: 8px;
  }
  .menu-kicker {
    margin: 0;
    color: var(--tier);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    filter: brightness(0.75);
  }
  .menu-kicker .cooked {
    color: var(--ink);
    text-transform: none;
    letter-spacing: 0;
  }
  .dish-name {
    margin: 2px 0 16px;
    font-family: var(--font-display);
    font-size: 18px;
    line-height: 1.15 !important;
  }
  .dish-unknown {
    color: #6b5aa8;
  }
  .menu-hint {
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
  }
  .recipe {
    display: grid;
    gap: 10px;
    margin: 12px 0 4px;
    padding: 0;
    list-style: none;
    font-size: 12px;
  }
  .recipe li {
    --portion-tone: #286a51;
    --portion-paper: #d9f4de;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 72px;
    grid-template-rows: minmax(40px, auto);
    align-items: center;
    gap: 3px 8px;
    min-width: 0;
  }
  .recipe li[data-short] {
    --portion-tone: #9c3554;
    --portion-paper: #ffe0e9;
  }
  .portion-name {
    font-weight: 700;
    overflow-wrap: break-word;
  }
  /* A little ceramic mise-en-place tray: one hollow per portion, not
     a progress bar. The ghost sprite makes the missing ingredient literal. */
  .portion-tray {
    display: flex;
    align-items: center;
    gap: 2px;
    width: fit-content;
    max-width: 100%;
    padding: 2px 5px 5px;
    border-radius: 9px 9px 15px 15px;
    background: #e7eef4;
    box-shadow:
      inset 0 2px 0 #fff,
      0 3px 0 #a9bccb;
  }
  .portion-slot {
    display: grid;
    place-items: center;
    width: 29px;
    height: 27px;
    border-radius: 50%;
    background: radial-gradient(ellipse, #b8cbd6, #d9e5ec 70%);
    box-shadow: inset 0 2px 2px #172d4520;
  }
  .portion-slot img {
    width: 28px;
    height: 28px;
    image-rendering: pixelated;
    filter: drop-shadow(0 2px 0 #172d4529);
    transform: translateY(-3px) rotate(-9deg);
  }
  .portion-slot:nth-child(even) img {
    transform: translateY(-3px) rotate(9deg);
  }
  .portion-slot[data-empty] img {
    opacity: 0.24;
    filter: grayscale(1);
    transform: none;
  }
  .portion-ticket {
    position: relative;
    display: grid;
    justify-items: center;
    align-content: center;
    width: 72px;
    height: 36px;
    background: var(--portion-paper);
    color: var(--portion-tone);
    border-radius: 3px 3px 0 3px;
    box-shadow: -2px 2px 0 #172d4518;
    transform: rotate(-3deg);
    font-variant-numeric: tabular-nums;
  }
  .portion-ticket::after {
    content: '';
    position: absolute;
    right: 0;
    bottom: 0;
    width: 8px;
    height: 8px;
    background: linear-gradient(135deg, #172d4530 50%, #fff 51%);
  }
  .portion-ticket b {
    font-family: var(--font-display);
    font-size: 13px;
    line-height: 1.2;
  }
  .portion-ticket > span {
    font-size: 10px;
    line-height: 1.2;
  }
  .menu-body {
    min-width: 0;
  }
  @media (max-width: 359px) {
    .recipe li {
      grid-template-columns: minmax(0, 1fr) auto 66px;
      column-gap: 4px;
    }
    .portion-ticket {
      width: 66px;
    }
    .portion-slot {
      width: 24px;
    }
  }
  .try {
    grid-column: 2;
    justify-self: end;
  }
  .cook,
  .try {
    min-height: 42px;
    padding: 0 18px;
    border: 3px solid var(--ink);
    border-radius: 14px;
    background: var(--rose);
    color: var(--ink);
    font: inherit;
    font-family: var(--font-display);
    font-size: 15px;
    box-shadow: 3px 3px 0 var(--ink);
    cursor: pointer;
  }
  .try {
    background: #e6ddff;
    font-size: 13px;
  }
  .cook:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .cook:not(:disabled):active,
  .try:active {
    translate: 2px 2px;
    box-shadow: 1px 1px 0 var(--ink);
  }

  @keyframes chef-wave {
    50% {
      transform: rotate(-4deg) translateY(-4px);
    }
  }

  .flavor-key li,
  .menu-filter button,
  .portion-ticket b,
  .portion-ticket > span {
    white-space: nowrap;
  }
  @media (max-width: 679px) {
    padding-top: 16px;
    .kitchen-hero {
      grid-template-columns: 1fr;
      text-align: center;
    }
    .flavor-key {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      text-align: center;
    }
    .flavor-key li {
      padding-inline: 4px;
      font-size: 11px;
    }
    .flavor-key li:last-child {
      grid-column: 1 / -1;
      justify-self: center;
      padding-inline: 12px;
    }
    .kitchen-title {
      font-size: clamp(26px, 6.8vw, 44px);
    }
    .kitchen-hero {
      padding-inline: 14px;
    }
    .chef img {
      width: 110px;
      height: 110px;
    }
  }
  /* Shared geometry for the route's loading and loaded states: each text
     row reserves its line boxes (min-height, never a fixed box, so a longer
     line grows instead of overlapping), and cards size to their recipe. */
  .chef-line {
    min-height: 46px;
    line-height: 14px;
  }
  .kitchen-kicker {
    min-height: 18px;
    line-height: 18px;
  }
  .kitchen-title {
    min-height: 62px;
    margin: 6px 0 8px;
    line-height: 62px !important;
  }
  .kitchen-lede {
    min-height: 42px;
    margin-bottom: 12px;
    line-height: 21px;
  }
  .flavor-key {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-height: 26px;
    margin-bottom: 10px;
  }
  .flavor-key li {
    display: flex;
    align-items: center;
    justify-content: center;
    /* a flex row drops the spaces around the arrow: the gap puts them back */
    gap: 0.3em;
    height: 26px;
    padding-inline: 10px;
    font-size: 12px;
  }
  .kitchen-found {
    min-height: 28px;
    line-height: 28px;
  }
  .kitchen-tabs {
    margin-top: 18px;
    margin-bottom: 12px;
  }
  .menu-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
  }
  .menu-filter button {
    flex: 1 1 auto;
    min-height: 40px;
    padding-inline: 14px;
  }
  /* kicker, name, stats, recipe, then the button pinned to the bottom of a
     row-mate that is taller */
  .menu-card {
    grid-template-columns: 88px minmax(0, 1fr);
    grid-template-rows: auto auto auto auto 1fr;
    align-content: stretch;
    gap: 4px 12px;
    padding: 12px 14px 14px;
  }
  .menu-kicker {
    align-self: end;
    min-height: 18px;
    margin-top: 10px;
    line-height: 16px;
  }
  .dish-name {
    align-self: start;
    min-height: 46px;
    margin: 0;
    line-height: 23px !important;
    text-wrap: balance;
  }
  .menu-body > .stat-chips {
    align-content: flex-start;
    align-items: flex-start;
    min-height: 46px;
    margin: 6px 0 0;
  }
  .stat-chips li {
    white-space: nowrap;
    line-height: 16px;
  }
  .menu-body > .recipe {
    gap: 4px;
    margin: 6px 0 0;
  }
  .recipe li {
    height: 40px;
    line-height: 16px;
  }
  .menu-body > .menu-hint {
    min-height: 60px;
    margin-top: 6px;
    line-height: 20px;
  }
  /* the card's foot: the batch (when the bag makes 2 or more), then Nấu.
     44px for every card, stepper or not, so the menu never jumps */
  .cook-row,
  .try {
    grid-row: 5;
    align-self: end;
    margin-top: 6px;
  }
  .cook-row {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    min-width: 0;
  }
  .cook,
  .try {
    height: 44px;
    min-height: 44px;
    white-space: nowrap;
  }
  .cook {
    min-width: 84px;
  }
  .batch {
    display: flex;
    align-items: stretch;
    height: 44px;
    margin-right: auto;
    border: 3px solid var(--ink);
    border-radius: 14px;
    background: #fff;
    box-shadow: 3px 3px 0 var(--ink);
    overflow: hidden;
  }
  .batch button {
    border: 0;
    background: none;
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }
  .batch button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .batch button:focus-visible {
    outline: 3px solid var(--berry);
    outline-offset: -4px;
  }
  .batch-step {
    width: 38px;
    font-family: var(--font-display);
    font-size: 20px;
    line-height: 1;
  }
  .batch-step:not(:disabled):active {
    background: var(--rose);
  }
  /* the count, and the most the bag makes: tap it to cook them all */
  .batch-count {
    display: grid;
    place-content: center;
    min-width: 54px;
    padding: 0 4px;
    border-inline: 2px solid var(--ink) !important;
    font-variant-numeric: tabular-nums;
  }
  .batch-count b {
    font-family: var(--font-display);
    font-size: 15px;
    line-height: 17px;
  }
  .batch-count small {
    font-size: 9px;
    font-weight: 800;
    line-height: 11px;
    color: #8a5a6b;
    white-space: nowrap;
  }
  .batch-count[aria-pressed='true'] {
    background: var(--rose);
  }
  .batch-count[aria-pressed='true'] small {
    color: var(--ink);
  }
  @media (min-width: 1200px) {
    .kitchen-lede {
      min-height: 21px;
    }
  }
  @media (max-width: 679px) {
    .kitchen-title {
      min-height: 52px;
      line-height: 52px !important;
    }
    .kitchen-lede {
      min-height: 63px;
    }
    .flavor-key {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-auto-rows: 26px;
      justify-items: stretch;
    }
    .flavor-key li {
      padding-inline: 4px;
      font-size: 11px;
    }
    .menu-filter {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .menu-filter button {
      padding-inline: 4px;
    }
    .menu-body > .stat-chips {
      min-height: 52px;
    }
  }
  @media (max-width: 420px) {
    .kitchen-lede {
      min-height: 84px;
    }
    .menu-body > .menu-hint {
      min-height: 80px;
    }
  }
  @media (max-width: 359px) {
    .kitchen-lede {
      min-height: 105px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .chef img {
      animation: none;
    }
  }
`
