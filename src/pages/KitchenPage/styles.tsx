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
    repeating-linear-gradient(90deg, #fff3e4 0 22px, #fff8ef 22px 44px);
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
    max-width: 180px;
    margin: 4px 0 0;
    padding: 6px 10px;
    border: 2px solid var(--ink);
    border-radius: 14px;
    background: #fff;
    font-size: 12px;
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
    margin: 2px 0 6px;
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
  .menu-card[data-secret] {
    background: repeating-linear-gradient(
      -45deg,
      #f6f2ff 0 10px,
      #fff 10px 20px
    );
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
    margin: 2px 0 6px;
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
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
  }
  .recipe li {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .recipe img {
    image-rendering: pixelated;
  }
  /* fixed widths, text from the left: a count that changes moves nothing
     (the display font has no even-width digits) */
  .recipe b {
    min-width: 3.4em;
    margin-left: auto;
    text-align: left;
    font-variant-numeric: tabular-nums;
    color: #1f8f52;
  }
  .recipe li[data-short] b {
    color: var(--berry);
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

  /* ── free cooking: the shelf and the pot ── */
  .pot-area {
    display: grid;
    gap: 14px;
  }
  .shelf {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
    margin: 0;
    padding: 14px;
    border: 3px solid var(--ink);
    border-radius: 22px;
    background:
      linear-gradient(transparent 92%, rgba(120, 72, 40, 0.25) 92%) 0 0 / 100%
        108px,
      linear-gradient(#f6dcc2, #edc8a5);
    list-style: none;
  }
  /* a jar: its sprite, name and count on a row, its flavours under them
     across the jar (a name wraps rather than being cut) */
  .jar {
    display: grid;
    grid-template-columns: 30px 1fr auto;
    grid-template-areas:
      'img name count'
      'flavors flavors flavors';
    align-items: center;
    gap: 4px 6px;
    width: 100%;
    height: 100%;
    min-height: 74px;
    padding: 8px;
    border: 2px solid var(--ink);
    border-radius: 16px 16px 12px 12px;
    background: linear-gradient(
      160deg,
      rgba(255, 255, 255, 0.95),
      rgba(230, 245, 255, 0.85)
    );
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .jar img {
    grid-area: img;
    image-rendering: pixelated;
  }
  .jar-name {
    grid-area: name;
    min-width: 0;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
  /* fixed widths, text from the left: a count that changes moves nothing */
  .jar-count {
    grid-area: count;
    min-width: 2.6em;
    font-size: 12px;
    text-align: left;
    font-variant-numeric: tabular-nums;
  }
  .jar-flavors {
    grid-area: flavors;
  }
  .jar-flavors > span {
    padding: 0 5px;
    font-size: 10px;
  }
  .jar:disabled {
    cursor: default;
    opacity: 0.45;
  }
  .jar:not(:disabled):hover {
    translate: 0 -2px;
  }
  .pot-bar {
    position: sticky;
    bottom: 12px;
    z-index: 5;
    display: grid;
    gap: 10px;
    padding: 14px;
    border: 3px solid var(--ink);
    border-radius: 22px;
    background: linear-gradient(160deg, #fff, #ffeef4);
    box-shadow: 5px 5px 0 var(--ink);
  }
  .pot-slots {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .slot {
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 1;
    max-height: 64px;
    border: 2px solid var(--ink);
    border-radius: 50%;
    background: radial-gradient(circle at 50% 35%, #ffd6b0, #d98a4e);
    cursor: pointer;
  }
  .slot[data-empty] {
    border-style: dashed;
    background: #fff;
    cursor: default;
  }
  .slot img {
    image-rendering: pixelated;
    animation: slot-drop 300ms cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .flavor-meter {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    margin: 0;
  }
  .flavor-meter div {
    display: grid;
    gap: 2px;
  }
  .flavor-meter dt {
    font-size: 11px;
    font-weight: 800;
    text-align: center;
  }
  .flavor-meter dd {
    height: 8px;
    margin: 0;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(23, 45, 69, 0.1);
  }
  .flavor-meter i {
    display: block;
    height: 100%;
    width: calc(var(--v) * 100%);
    border-radius: inherit;
    background: var(--c);
    transition: width 300ms ease-out;
  }
  .pot-warning {
    margin: 0;
    color: var(--berry);
    font-size: 13px;
    font-weight: 800;
  }
  .pot-actions {
    display: flex;
    gap: 8px;
  }
  .pot-clear,
  .pot-cook {
    min-height: 48px;
    padding: 0 16px;
    border: 3px solid var(--ink);
    border-radius: 14px;
    font: inherit;
    font-family: var(--font-display);
    font-size: 16px;
    box-shadow: 3px 3px 0 var(--ink);
    cursor: pointer;
  }
  .pot-clear {
    background: #fff;
    color: var(--ink);
  }
  .pot-cook {
    flex: 1;
    background: var(--berry);
    color: #fff;
  }
  .pot-actions .sign-in-cook {
    flex: 1;
  }
  .pot-clear:disabled,
  .pot-cook:disabled {
    opacity: 0.45;
    cursor: default;
  }

  @keyframes chef-wave {
    50% {
      transform: rotate(-4deg) translateY(-4px);
    }
  }
  @keyframes slot-drop {
    from {
      transform: translateY(-20px) scale(1.4);
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
    .shelf {
      grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
      padding: 10px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .chef img,
    .slot img {
      animation: none;
    }
    .flavor-meter i {
      transition: none;
    }
  }
`
