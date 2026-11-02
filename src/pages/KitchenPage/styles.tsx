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
    grid-template-columns: auto 1fr;
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
    font-size: clamp(32px, 7vw, 54px);
    line-height: 1 !important;
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
    grid-template-rows: 1fr auto;
    gap: 6px 12px;
    padding: 14px;
    border: 3px solid var(--ink);
    border-radius: 22px;
    background: #fff;
    box-shadow: 5px 5px 0 var(--ink);
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
  .menu-body {
    min-width: 0;
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
    grid-template-columns: minmax(0, 1fr) 72px;
    grid-template-rows: auto 36px;
    align-items: center;
    gap: 3px 8px;
    min-width: 0;
  }
  .recipe li[data-short] {
    --portion-tone: #9c3554;
    --portion-paper: #ffe0e9;
  }
  .portion-name {
    grid-column: 1 / -1;
    font-weight: 700;
    overflow-wrap: anywhere;
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
      grid-template-columns: minmax(0, 1fr) 66px;
      column-gap: 4px;
    }
    .portion-ticket {
      width: 66px;
    }
    .portion-slot {
      width: 24px;
    }
  }
  .cook,
  .try {
    grid-column: 2;
    justify-self: end;
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

  @media (max-width: 599px) {
    padding-top: 16px;
    .kitchen-hero {
      grid-template-columns: 1fr;
      text-align: center;
    }
    .flavor-key {
      justify-content: center;
    }
    .chef img {
      width: 110px;
      height: 110px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .chef img {
      animation: none;
    }
  }
`
