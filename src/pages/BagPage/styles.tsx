import styled from 'styled-components'

/*
 * The trainer's bag, as the games draw it: a big backpack that takes the
 * colour of the pocket opened (HeartGold/SoulSilver), pockets as tabs, a
 * menu list with the red ▶ cursor and a steady count column, the chosen
 * item's card beside it (from 900px) or in a dialog (phones). Items not
 * yet found are silhouettes, as in "Who's That Pokémon?".
 */
export const BagStyle = styled.section`
  --ink: #172d45;
  --shadow-ink: #050f1c;
  --sun: #ffda55;
  --lose: #e5483b;
  --dim-text: rgba(255, 255, 255, 0.66);
  --pocket: #ffda55;
  display: grid;
  gap: 16px;
  max-width: 1160px;
  margin: 0 auto;
  padding: 14px 12px 40px;
  color: #fff;

  /* ── the hero: the bag and its numbers ── */
  .bag-hero {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 14px;
    padding: 16px 14px;
    overflow: hidden;
    border: 3px solid var(--shadow-ink);
    border-radius: 24px;
    background:
      radial-gradient(
        90% 120% at 0% 50%,
        color-mix(in srgb, var(--pocket) 38%, transparent),
        transparent 65%
      ),
      linear-gradient(160deg, #1d3a66, #0a1830);
    box-shadow: 5px 5px 0 var(--shadow-ink);
    isolation: isolate;
    transition: background 400ms ease-out;
  }
  /* sunburst behind the bag */
  .bag-hero::before {
    content: '';
    position: absolute;
    left: -30%;
    top: -60%;
    z-index: -1;
    width: 90%;
    aspect-ratio: 1;
    background: repeating-conic-gradient(
      from 0deg,
      color-mix(in srgb, var(--pocket) 22%, transparent) 0 7deg,
      transparent 7deg 18deg
    );
    -webkit-mask: radial-gradient(circle, #000 15%, transparent 62%);
    mask: radial-gradient(circle, #000 15%, transparent 62%);
    animation: bag-spin 40s linear infinite;
  }
  .bag-art {
    position: relative;
    width: clamp(104px, 30vw, 200px);
    aspect-ratio: 1;
  }
  .bag-art svg {
    width: 100%;
    height: 100%;
    overflow: visible;
    filter: drop-shadow(0 10px 10px rgba(0, 0, 0, 0.45));
    transform-origin: 50% 90%;
    animation: bag-hop 620ms cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  .bag-body {
    fill: var(--pocket);
    transition: fill 400ms ease-out;
  }
  .bag-shade {
    fill: color-mix(in srgb, var(--pocket) 70%, #000);
    transition: fill 400ms ease-out;
  }
  .bag-light {
    fill: color-mix(in srgb, var(--pocket) 60%, #fff);
    transition: fill 400ms ease-out;
  }
  .bag-flap {
    transform-box: fill-box;
    transform-origin: 50% 0%;
    animation: bag-flap 620ms cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  /* sparkles thrown as a pocket opens */
  .bag-art i {
    position: absolute;
    width: 14px;
    height: 14px;
    background: #fff;
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
    animation: bag-spark 900ms ease-out both;
  }
  .bag-art i:nth-of-type(1) {
    left: 6%;
    top: 12%;
  }
  .bag-art i:nth-of-type(2) {
    right: 4%;
    top: 4%;
    animation-delay: 120ms;
  }
  .bag-art i:nth-of-type(3) {
    right: 0;
    top: 46%;
    width: 10px;
    height: 10px;
    animation-delay: 220ms;
  }
  .bag-intro {
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  .bag-kicker {
    margin: 0;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--pocket);
  }
  .bag-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(30px, 9vw, 56px);
    line-height: 0.95 !important;
    text-transform: uppercase;
    color: var(--sun);
    -webkit-text-stroke: 1.5px #2a4c8f;
    paint-order: stroke fill;
    text-shadow: 0 3px 0 #2a4c8f;
    white-space: nowrap;
  }
  .bag-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin: 0;
  }
  .bag-stats div {
    display: grid;
  }
  .bag-stats dt {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--dim-text);
  }
  .bag-stats dd {
    margin: 0;
    font-family: var(--font-display);
    font-size: 20px;
    line-height: 1.1 !important;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .bag-stats small {
    font-size: 13px;
    color: var(--dim-text);
  }
  /* units per tier, as one bar */
  .tier-bar {
    display: flex;
    height: 10px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  }
  .tier-bar i {
    flex: var(--share) 0 0;
    min-width: 3px;
    background: var(--tier);
    box-shadow: inset -1px 0 0 rgba(0, 0, 0, 0.35);
  }
  .tier-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 11px;
    font-weight: 700;
    color: var(--dim-text);
  }
  .tier-legend li {
    white-space: nowrap;
  }
  .tier-legend b {
    color: var(--tier);
  }

  /* ── pockets ── */
  .pockets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pocket {
    --c: #ffda55;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 40px;
    padding: 0 12px 0 8px;
    border: 2px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color 160ms ease-out,
      translate 120ms ease-out;
  }
  .pocket::before {
    content: '';
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--c);
    box-shadow: 0 0 8px var(--c);
  }
  .pocket b {
    min-width: 20px;
    padding: 1px 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    font-size: 11px;
    text-align: center;
  }
  .pocket[aria-pressed='true'] {
    border-color: var(--shadow-ink);
    background: var(--c);
    color: var(--ink);
    box-shadow: 3px 3px 0 var(--shadow-ink);
    translate: -1px -1px;
  }
  .pocket[aria-pressed='true']::before {
    background: #fff;
    box-shadow: 0 0 0 2px var(--ink);
  }
  .pocket[aria-pressed='true'] b {
    background: rgba(5, 15, 28, 0.18);
  }
  .pocket:focus-visible,
  .sort button:focus-visible,
  .toggle:focus-visible,
  .bag-row:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }

  /* ── toolbar ── */
  .bag-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .sort {
    display: inline-grid;
    grid-auto-flow: column;
    padding: 3px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.28);
  }
  .sort button {
    min-height: 36px;
    padding: 0 12px;
    border: none;
    border-radius: 9px;
    background: none;
    color: var(--dim-text);
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }
  .sort button[aria-pressed='true'] {
    background: #fff;
    color: var(--ink);
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 4px;
    border: none;
    background: none;
    color: var(--dim-text);
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }
  .toggle span {
    position: relative;
    width: 38px;
    height: 22px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
    transition: background-color 160ms ease-out;
  }
  .toggle span::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    transition: translate 160ms ease-out;
  }
  .toggle[aria-pressed='true'] {
    color: #fff;
  }
  .toggle[aria-pressed='true'] span {
    background: var(--pocket);
  }
  .toggle[aria-pressed='true'] span::after {
    translate: 16px 0;
  }

  /* ── the list, the games' menu ── */
  .bag-body {
    display: grid;
    gap: 16px;
    align-items: start;
  }
  .bag-list {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .bag-row {
    position: relative;
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    width: 100%;
    height: 68px;
    padding: 8px 12px 8px 26px;
    border: none;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.05);
    box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.08);
    color: #fff;
    font: inherit;
    text-align: left;
    cursor: pointer;
    animation: bag-row-in 360ms cubic-bezier(0.3, 1.4, 0.5, 1)
      calc(min(var(--i), 12) * 28ms) both;
    transition:
      background-color 140ms ease-out,
      box-shadow 140ms ease-out;
  }
  /* the cursor */
  .bag-row::before {
    content: '';
    position: absolute;
    left: 9px;
    top: 50%;
    width: 0;
    height: 0;
    margin-top: -7px;
    border: 7px solid transparent;
    border-left: 10px solid var(--lose);
    border-right: none;
    opacity: 0;
    translate: -4px 0;
    transition:
      opacity 140ms ease-out,
      translate 140ms ease-out;
  }
  .bag-row:hover,
  .bag-row[aria-current='true'] {
    background: rgba(255, 255, 255, 0.1);
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--tier) 70%, transparent);
  }
  .bag-row:hover::before,
  .bag-row:focus-visible::before,
  .bag-row[aria-current='true']::before {
    opacity: 1;
    translate: 0 0;
  }
  .bag-row[aria-current='true']::before {
    animation: bag-cursor 900ms ease-in-out infinite;
  }
  .slot {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background:
      radial-gradient(
        circle,
        color-mix(in srgb, var(--tier) 45%, transparent),
        transparent 70%
      ),
      #0a1628;
    box-shadow: inset 0 0 0 2px var(--tier);
  }
  .slot img {
    width: 40px;
    height: 40px;
    image-rendering: pixelated;
    filter: drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff)
      drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff);
  }
  .row-text {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  /* the whole name, on two lines if it must (the row keeps its height) */
  .row-name {
    display: -webkit-box;
    overflow: hidden;
    font-size: 15px;
    font-weight: 800;
    line-height: 1.15;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  .row-meta {
    overflow: hidden;
    font-size: 11px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--dim-text);
  }
  .row-meta b {
    color: var(--tier);
  }
  .row-count {
    min-width: 54px;
    padding: 4px 9px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.3);
    font-family: var(--font-display);
    font-size: 17px;
    line-height: 1.1 !important;
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .row-count small {
    font-size: 11px;
    color: var(--dim-text);
  }
  /* not found yet: a silhouette, who's that item? */
  .bag-row[data-missing] {
    background: rgba(255, 255, 255, 0.025);
  }
  .bag-row[data-missing] .slot {
    background: #0a1628;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.12);
  }
  .bag-row[data-missing] .slot img {
    filter: brightness(0) drop-shadow(0 0 1px rgba(160, 230, 255, 0.9));
    opacity: 0.7;
  }
  .bag-row[data-missing] .row-name {
    color: var(--dim-text);
  }
  .bag-row[data-missing] .row-count {
    background: none;
    color: var(--dim-text);
    font-family: inherit;
    font-size: 11px;
    font-weight: 800;
  }

  /* the chosen item's commands: a drawer that slides out of its row, the
     row and the drawer one card; inside, tiles in the style of the DS
     games' touch battle menu (glossy, colour-coded, ink-rimmed) */
  .bag-list li[data-open] .bag-row {
    border-radius: 16px 16px 0 0;
  }
  .row-actions {
    position: relative;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    gap: 10px;
    margin-top: -2px;
    padding: 14px 12px 12px;
    border-radius: 0 0 18px 18px;
    background:
      linear-gradient(
        color-mix(in srgb, var(--tier) 16%, transparent),
        transparent 70%
      ),
      rgba(255, 255, 255, 0.06);
    box-shadow:
      inset 2px 0 0 color-mix(in srgb, var(--tier) 70%, transparent),
      inset -2px 0 0 color-mix(in srgb, var(--tier) 70%, transparent),
      inset 0 -2px 0 color-mix(in srgb, var(--tier) 70%, transparent);
    transform-origin: 50% 0;
    animation: bag-drawer 300ms cubic-bezier(0.2, 1.2, 0.4, 1);
  }
  /* a notch pointing up at the row */
  .row-actions::before {
    content: '';
    position: absolute;
    left: 36px;
    top: -1px;
    width: 14px;
    height: 8px;
    background: var(--tier);
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }
  .command {
    --c: #4aa8ff;
    --c-dark: #1d5fae;
    position: relative;
    display: grid;
    justify-items: center;
    gap: 6px;
    min-height: 82px;
    padding: 12px 6px 10px;
    overflow: hidden;
    border: 3px solid var(--shadow-ink);
    border-radius: 18px;
    background:
      linear-gradient(rgba(255, 255, 255, 0.38), transparent 46%),
      linear-gradient(var(--c), var(--c-dark));
    color: #fff;
    font: inherit;
    box-shadow:
      inset 0 -4px 0 rgba(0, 0, 0, 0.22),
      0 4px 0 var(--shadow-ink);
    cursor: pointer;
    animation: bag-command 380ms cubic-bezier(0.3, 1.6, 0.5, 1) both;
    transition:
      translate 120ms ease-out,
      box-shadow 120ms ease-out,
      filter 160ms ease-out;
  }
  .command:nth-child(2) {
    animation-delay: 60ms;
  }
  .command:nth-child(3) {
    animation-delay: 120ms;
  }
  .command[data-command='use'] {
    --c: #4fd18b;
    --c-dark: #1f8f52;
  }
  .command[data-command='drop'] {
    --c: #ff6a4a;
    --c-dark: #b8321f;
  }
  .command:hover:not(:disabled) {
    filter: brightness(1.08);
  }
  .command:active:not(:disabled) {
    translate: 0 3px;
    box-shadow:
      inset 0 -2px 0 rgba(0, 0, 0, 0.22),
      0 1px 0 var(--shadow-ink);
  }
  .command:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .command-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: #fff;
    color: var(--c-dark);
    box-shadow:
      0 0 0 3px var(--shadow-ink),
      inset 0 -3px 0 rgba(0, 0, 0, 0.12);
  }
  .command-icon svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
  }
  /* a label sized for a tile, with room on both sides */
  .command-label {
    max-width: 100%;
    padding: 0 6px;
    font-size: 12px;
    font-weight: 900;
    line-height: 1.1;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
    white-space: nowrap;
  }

  /* not yet: drained of colour, a ribbon across the corner */
  .command:disabled {
    --c: #7d8796;
    --c-dark: #4a5361;
    cursor: not-allowed;
  }
  .command:disabled .command-label {
    opacity: 0.75;
  }
  .command-soon {
    position: absolute;
    right: -26px;
    top: 9px;
    width: 92px;
    padding: 2px 0;
    background: var(--sun);
    color: var(--ink);
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-align: center;
    text-transform: uppercase;
    rotate: 40deg;
    box-shadow: 0 1px 0 var(--shadow-ink);
  }

  .bag-detail {
    display: none;
  }
  .bag-detail .card {
    max-height: none;
  }

  /* ── empty ── */
  .bag-empty {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 28px 16px;
    border: 2px dashed rgba(255, 255, 255, 0.16);
    border-radius: 22px;
    text-align: center;
  }
  .bag-empty strong {
    font-family: var(--font-display);
    font-size: 22px;
  }
  .bag-empty p {
    max-width: 36ch;
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--dim-text);
  }
  .play {
    display: inline-flex;
    align-items: center;
    min-height: 52px;
    padding: 0 20px;
    border: 3px solid var(--shadow-ink);
    border-radius: 16px;
    background: var(--sun);
    color: var(--ink);
    font-family: var(--font-display);
    font-size: 16px;
    text-transform: uppercase;
    text-decoration: none;
    box-shadow: 4px 4px 0 var(--shadow-ink);
  }
  .play:active {
    translate: 3px 3px;
    box-shadow: 1px 1px 0 var(--shadow-ink);
  }
  .bag-guest-play {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    color: var(--dim-text);
    font-size: 13px;
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .bag-note {
    margin: 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 359px) {
    .bag-hero {
      gap: 10px;
      padding: 14px 10px;
    }
    .bag-row {
      grid-template-columns: 46px minmax(0, 1fr) auto;
      gap: 10px;
      padding-right: 10px;
    }
    .slot {
      width: 46px;
      height: 46px;
    }
    .slot img {
      width: 34px;
      height: 34px;
    }
    .row-count {
      min-width: 0;
      font-size: 15px;
    }
    .command-label {
      font-size: 11px;
      letter-spacing: 0.04em;
    }
    /* the stars say it; the tier's name is on the item's card */
    .row-tier {
      display: none;
    }
    .sort button {
      padding: 0 9px;
    }
  }

  @media (min-width: 900px) {
    gap: 20px;
    padding: 28px 24px 56px;

    .bag-hero {
      gap: 28px;
      padding: 22px 28px;
      border-radius: 32px;
    }
    .bag-stats dd {
      font-size: 30px;
    }
    .bag-body {
      grid-template-columns: minmax(0, 1fr) 400px;
    }
    .bag-detail {
      position: sticky;
      top: 90px;
      display: block;
    }
    /* the card is already beside the list */
    .command[data-command='info'] {
      display: none;
    }
    /* tiles keep a tile's size on a wide list */
    .row-actions {
      grid-template-columns: repeat(auto-fit, 150px);
    }
  }

  @keyframes bag-spin {
    to {
      rotate: 360deg;
    }
  }
  @keyframes bag-hop {
    0% {
      scale: 1;
    }
    30% {
      scale: 1.12 0.86;
    }
    60% {
      scale: 0.94 1.08;
      translate: 0 -8%;
      rotate: -4deg;
    }
  }
  @keyframes bag-flap {
    40% {
      rotate: -22deg;
      translate: 0 -6%;
    }
  }
  @keyframes bag-spark {
    0% {
      opacity: 0;
      scale: 0.2;
    }
    40% {
      opacity: 1;
      scale: 1.2;
    }
    100% {
      opacity: 0;
      scale: 0.6;
      rotate: 90deg;
    }
  }
  @keyframes bag-row-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
  }
  @keyframes bag-drawer {
    from {
      opacity: 0;
      transform: scaleY(0.6);
    }
  }
  @keyframes bag-command {
    from {
      opacity: 0;
      transform: translateY(-10px) scale(0.8);
    }
  }
  @keyframes bag-cursor {
    50% {
      translate: 3px 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }
`
