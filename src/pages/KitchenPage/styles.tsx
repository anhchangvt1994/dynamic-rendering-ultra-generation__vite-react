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

  /* the way back to the room the cook came from */
  .kitchen-back {
    display: flex;
    width: fit-content;
    margin-inline: max(0px, calc((100% - 1100px) / 2)) auto;
    align-items: center;
    min-height: 44px;
    margin-bottom: 12px;
    padding: 0 16px;
    border: 3px solid var(--ink);
    border-radius: 999px;
    color: var(--ink);
    background: var(--rose);
    box-shadow: 3px 3px 0 var(--ink);
    font-weight: 900;
    text-decoration: none;
  }
  .kitchen-back:focus-visible {
    outline: 3px solid var(--berry);
    outline-offset: 3px;
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
  /* Tất cả + the 5 flavour stats = 6 chips, even rows (3×2, then 6×1). No
     "Thân thiện" chip: every dish gives it, so it would filter nothing */
  /* filter + sort are ONE toolbar: stacked below 960px, a single row after
     (the sort is a separated control at the end, never a lone wrapped pill) */
  .menu-tools {
    display: grid;
    gap: 10px;
    margin-bottom: 14px;
  }
  @media (min-width: 960px) {
    .menu-tools {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      column-gap: 0;
    }
    .menu-tools::after {
      display: none;
    }
  }
  .menu-filter {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
  @media (min-width: 680px) {
    .menu-filter {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }
  .menu-filter button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 8px;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  /* the stat's colour, as in the key above ("Tất cả": all five) */
  .menu-filter button::before {
    content: '';
    flex: none;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(
      --c,
      conic-gradient(#e5483b, #e8c022, #3fa463, #3b7be5, #f07cb4, #e5483b)
    );
  }
  .menu-filter button[aria-pressed='true'] {
    background: color-mix(in srgb, var(--c, var(--rose)) 35%, #fff);
    box-shadow: inset 0 0 0 2px var(--c, var(--berry));
  }
  /* a fixed row under the filter (always there: nothing shifts) */
  .menu-sort {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    min-width: 0;
    min-height: 44px;
    margin: 0;
    padding: 0 12px;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
  }
  .menu-sort::before {
    content: '';
    flex: none;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #ff9f43;
  }
  .menu-sort[aria-pressed='true'] {
    background: color-mix(in srgb, #ff9f43 35%, #fff);
    box-shadow: inset 0 0 0 2px #ff9f43;
  }
  .menu-sort:focus-visible {
    outline: 3px solid var(--berry);
    outline-offset: 3px;
  }
  @media (min-width: 960px) {
    .menu-sort {
      width: 196px;
      margin-left: 16px;
      position: relative;
    }
    /* a divider sets it apart from the six filter chips */
    .menu-sort::after {
      content: '';
      position: absolute;
      left: -10px;
      top: 8px;
      bottom: 8px;
      border-left: 2px dashed color-mix(in srgb, var(--ink) 35%, transparent);
    }
  }
  .menu-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
    gap: 18px 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* A patisserie order card: a frosted band in the dish's own flavour, the
     dish on its cake stand, then the recipe as ingredient capsules. */
  .menu-card {
    --dish-soft: color-mix(in srgb, var(--dish) 26%, #fff);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 3px solid var(--ink);
    border-radius: 24px;
    background: #fff;
    box-shadow: 5px 5px 0 var(--ink);
  }
  .menu-card[data-offscreen] * {
    animation-play-state: paused !important;
  }
  .menu-head {
    position: relative;
    display: grid;
    grid-template-columns: 84px minmax(0, 1fr);
    align-items: center;
    gap: 16px;
    padding: 14px 16px 22px;
    background: linear-gradient(
      150deg,
      var(--dish-soft),
      color-mix(in srgb, var(--dish) 9%, #fff)
    );
    isolation: isolate;
  }
  /* sprinkles: thick around the dish, gone under the name */
  .menu-head::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(
          circle,
          color-mix(in srgb, var(--dish) 72%, #fff) 0 2px,
          transparent 2.6px
        )
        0 0 / 24px 20px,
      radial-gradient(circle, #fff 0 1.8px, transparent 2.4px) 12px 10px / 24px
        20px;
    -webkit-mask-image: radial-gradient(
      circle at 58px 50%,
      #000 18%,
      transparent 60%
    );
    mask-image: radial-gradient(circle at 58px 50%, #000 18%, transparent 60%);
  }
  /* the frosting's scalloped edge, melting into the white of the card */
  .menu-head::after {
    content: '';
    position: absolute;
    right: 0;
    bottom: -1px;
    left: 0;
    height: 10px;
    background: radial-gradient(
        circle at 10px 10px,
        #fff 0 7px,
        transparent 7.5px
      ) -2px
      0 / 20px 10px repeat-x;
  }
  .dish-stage {
    position: relative;
    display: grid;
    place-items: center;
    width: 84px;
    height: 84px;
    border-radius: 50%;
    background: radial-gradient(
      circle at 50% 38%,
      #fff 0 56%,
      var(--dish-soft) 100%
    );
    box-shadow:
      0 0 0 3px #fff,
      0 0 0 5px var(--ink),
      3px 4px 0 5px var(--ink);
  }
  .dish-stage .dish-art {
    margin-top: -6px;
  }
  /* cookable now: a green tick on the stand */
  .menu-card[data-ready] .dish-stage::after {
    content: '';
    position: absolute;
    top: -4px;
    right: -4px;
    width: 22px;
    height: 22px;
    border: 2.5px solid var(--ink);
    border-radius: 50%;
    background: #4cc38a
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 12.5l4 4 8-9' fill='none' stroke='%23fff' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")
      center / 15px no-repeat;
  }
  .menu-titles {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .menu-kicker {
    display: inline-flex;
    align-items: center;
    justify-self: start;
    gap: 5px;
    height: 22px;
    margin: 0;
    padding: 0 9px;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: #fff;
    color: var(--ink);
    font-size: 11px;
    font-weight: 800;
    line-height: 1;
    white-space: nowrap;
  }
  .menu-kicker .stars {
    color: var(--tier);
    letter-spacing: -1px;
    filter: brightness(0.85);
  }
  .menu-kicker .cooked {
    color: #5b6b7d;
    font-weight: 700;
  }
  .dish-name {
    display: flex;
    align-items: center;
    min-height: 46px;
    margin: 0;
    font-family: var(--font-display);
    font-size: 19px;
    line-height: 23px !important;
    color: var(--ink);
    text-wrap: balance;
  }
  /* a secret: a starry night band, the silhouette on a dark stand */
  .menu-card[data-secret] .menu-head {
    background: radial-gradient(circle at 20% 30%, #5b3f99, #2a1b4b 72%);
  }
  .menu-card[data-secret] .menu-head::before {
    background:
      radial-gradient(circle, #fff 0 1.4px, transparent 2px) 0 0 / 26px 22px,
      radial-gradient(circle, #c9b6ff 0 1px, transparent 1.6px) 13px 11px / 26px
        22px;
    -webkit-mask-image: none;
    mask-image: none;
    opacity: 0.6;
  }
  .menu-card[data-secret] .dish-stage {
    background: radial-gradient(circle at 50% 40%, #46317a, #1c1234);
    box-shadow:
      0 0 0 3px #b9a3ff,
      0 0 0 5px var(--ink),
      3px 4px 0 5px var(--ink);
  }
  .menu-card[data-secret] .dish-name {
    color: #fff;
    letter-spacing: 0.12em;
  }
  .menu-card[data-secret] .menu-kicker {
    border-color: #c9b6ff;
    background: #2a1b4b;
    color: #efe8ff;
  }
  .menu-card[data-secret] .menu-kicker .stars {
    filter: none;
  }

  .menu-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    padding: 6px 16px 16px;
  }
  .menu-body > .stat-chips {
    align-content: flex-start;
    margin: 0;
  }
  /* 4 stats wrap to 2 rows at every card width: held, never measured */
  .menu-body > .stat-chips:has(> :nth-child(4)) {
    min-height: 46px;
  }
  .stat-chips li {
    line-height: 16px;
    white-space: nowrap;
  }
  .menu-hint {
    min-height: 60px;
    margin: 0;
    color: #4b3d73;
    font-size: 13px;
    line-height: 20px;
  }
  /* the recipe: one capsule per ingredient, its token, its name, its count */
  .recipe {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 12.5px;
  }
  .recipe li {
    --tone: #23845b;
    --paper: #dcf4e5;
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    height: 40px;
    padding: 0 4px 0 2px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--paper) 45%, #fff);
    box-shadow: inset 0 0 0 1.5px
      color-mix(in srgb, var(--tone) 22%, transparent);
  }
  .recipe li[data-short] {
    --tone: #b23a5c;
    --paper: #ffe2eb;
  }
  .portion-badge {
    position: relative;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #fff;
    box-shadow:
      inset 0 0 0 2px var(--tone),
      0 2px 0 color-mix(in srgb, var(--tone) 35%, transparent);
  }
  .portion-badge img {
    width: 28px;
    height: 28px;
    image-rendering: pixelated;
  }
  li[data-short] .portion-badge img {
    opacity: 0.45;
    filter: grayscale(1);
  }
  .portion-n {
    position: absolute;
    right: -6px;
    bottom: -3px;
    min-width: 20px;
    height: 16px;
    padding: 0 3px;
    border-radius: 999px;
    background: var(--ink);
    color: #fff;
    font-size: 9.5px;
    font-style: normal;
    font-weight: 800;
    line-height: 16px;
    text-align: center;
  }
  .portion-name {
    min-width: 0;
    color: var(--ink);
    font-weight: 700;
    line-height: 15px;
  }
  .portion-ticket {
    display: inline-flex;
    align-items: center;
    line-height: 1;
    justify-content: center;
    gap: 6px;
    min-width: 98px;
    height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    background: var(--paper);
    color: var(--tone);
    font-variant-numeric: tabular-nums;
  }
  .portion-ticket b {
    font-family: var(--font-display);
    font-size: 13px;
    line-height: 1;
  }
  .portion-ticket > span {
    font-size: 10.5px;
    font-weight: 700;
    line-height: 1;
    opacity: 0.85;
  }
  @media (max-width: 359px) {
    .recipe li {
      gap: 8px;
    }
    .portion-ticket {
      min-width: 88px;
      padding: 0 8px;
    }
  }

  /* the card's foot: the batch (when the bag makes 2 or more), then Nấu */
  .cook-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    min-width: 0;
    margin-top: auto;
  }
  .try {
    align-self: flex-end;
    margin-top: auto;
  }
  .cook,
  .try {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    min-height: 44px;
    padding: 0 20px;
    border: 3px solid var(--ink);
    border-radius: 14px;
    background: var(--rose);
    color: var(--ink);
    font: inherit;
    font-family: var(--font-display);
    font-size: 15px;
    white-space: nowrap;
    box-shadow: 3px 3px 0 var(--ink);
    cursor: pointer;
  }
  .cook {
    min-width: 96px;
    background: color-mix(in srgb, var(--dish) 42%, #fff);
  }
  .try {
    background: #e6ddff;
    font-size: 14px;
  }
  .cook:disabled {
    border-color: #a9b5c2;
    background: #eef2f6;
    color: #8593a3;
    box-shadow: 3px 3px 0 #a9b5c2;
    opacity: 1;
    cursor: default;
  }
  .cook:not(:disabled):active,
  .try:active {
    translate: 2px 2px;
    box-shadow: 1px 1px 0 var(--ink);
  }
  .cook:focus-visible,
  .try:focus-visible {
    outline: 3px solid var(--berry);
    outline-offset: 3px;
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
  /* 6 chips in even rows (3×2), one row only where all six fit: never a
     lone chip dropped on its own line */
  .flavor-key {
    display: grid;
    grid-template-columns: repeat(3, max-content);
    justify-content: start;
    gap: 6px;
    margin-bottom: 10px;
  }
  @media (min-width: 1100px) {
    .flavor-key {
      grid-template-columns: repeat(6, max-content);
    }
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
  .menu-filter button {
    min-height: 40px;
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
    width: 44px;
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
