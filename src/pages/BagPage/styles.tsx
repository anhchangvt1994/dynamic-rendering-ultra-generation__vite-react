import styled from 'styled-components'
import { boneCss } from 'components/PageSkeleton/bone'

/*
 * Inside the trainer's backpack. The hero is the bag with its stats as
 * stickers slapped on; the pockets are luggage tags hung on a zip, the
 * open one drops on its string; the open pocket is a canvas panel and the
 * items sit in it as an inventory grid of glossy wells, each with its
 * count sticker. Phones: the chosen item's commands dock at the bottom,
 * the DS games' touch screen; wide: its card stands beside the grid.
 *
 * No jump on load: every text sits in a box of fixed height (line-height
 * in px, nowrap, overflow hidden) inside a grid of fixed or fractional
 * columns, so neither the data nor the web fonts arriving move a thing.
 * The skeleton draws these same boxes with bones in place of the words.
 */
export const BagStyle = styled.section`
  --ink: #172d45;
  --shadow-ink: #050f1c;
  --sun: #ffda55;
  --lose: #e5483b;
  --dim-text: rgba(255, 255, 255, 0.66);
  --pocket: #ffda55;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  max-width: 1160px;
  margin: 0 auto;
  padding: 14px 12px 40px;
  color: #fff;
  ${boneCss}

  &[data-docked] {
    padding-bottom: 210px;
  }

  /* ── the hero: the bag, its name, its stickers ── */
  .bag-hero {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-areas:
      'art name'
      'stickers stickers'
      'tiers tiers';
    align-items: center;
    gap: 14px 14px;
    padding: 14px 14px 16px;
    overflow: hidden;
    border: 3px solid var(--shadow-ink);
    border-radius: 24px;
    background:
      radial-gradient(
        90% 120% at 0% 0%,
        color-mix(in srgb, var(--pocket) 38%, transparent),
        transparent 65%
      ),
      linear-gradient(160deg, #1d3a66, #0a1830);
    box-shadow: 5px 5px 0 var(--shadow-ink);
    isolation: isolate;
    transition: background 400ms ease-out;
  }
  .bag-hero::before {
    content: '';
    position: absolute;
    left: -38%;
    top: -70%;
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
    grid-area: art;
    position: relative;
    width: clamp(84px, 24vw, 120px);
    aspect-ratio: 1;
  }
  .bag-art svg,
  .bag-empty-art svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .bag-art svg {
    filter: drop-shadow(0 10px 10px rgba(0, 0, 0, 0.45));
    transform-origin: 50% 90%;
  }
  .bag-art .bag-body,
  .bag-empty-art .bag-body {
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
  }
  .bag-art[data-moved] svg {
    animation: bag-hop 620ms cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  .bag-art[data-moved] .bag-flap {
    animation: bag-flap 620ms cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  .bag-art i {
    position: absolute;
    width: 14px;
    height: 14px;
    background: #fff;
    clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
    opacity: 0;
  }
  .bag-art[data-moved] i {
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
  .bag-name {
    grid-area: name;
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  .bag-kicker {
    display: block;
    height: 16px;
    margin: 0;
    overflow: hidden;
    font-size: 12px;
    font-weight: 800;
    line-height: 16px !important;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--pocket);
    transition: color 400ms ease-out;
  }
  .bag-kicker .bone {
    width: 78%;
    height: 12px;
    margin-top: 2px;
  }
  .bag-title {
    display: block;
    width: 100%;
    height: 0.95em;
    overflow: visible;
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(36px, 11vw, 72px);
    line-height: 0.95 !important;
    text-transform: uppercase;
    color: var(--sun);
    -webkit-text-stroke: 1.5px #2a4c8f;
    paint-order: stroke fill;
    text-shadow: 0 4px 0 #2a4c8f;
    white-space: nowrap;
  }
  .bag-title .bone {
    width: 86%;
    max-width: 320px;
    height: 100%;
    border-radius: 12px;
  }

  /* the numbers: die-cut stickers, each its colour and its tilt */
  .stickers {
    grid-area: stickers;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin: 0;
    padding: 0 2px;
  }
  .sticker {
    --c: #ffda55;
    display: grid;
    align-content: center;
    gap: 2px;
    height: 64px;
    min-width: 0;
    padding: 0 10px;
    border-radius: 16px;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.5), transparent 40%),
      var(--c);
    color: var(--ink);
    box-shadow:
      0 0 0 3px #fff,
      0 0 0 5px var(--shadow-ink),
      4px 6px 0 2px var(--shadow-ink);
    rotate: -3deg;
  }
  .sticker:nth-child(2) {
    rotate: 2deg;
    translate: 0 3px;
  }
  .sticker:nth-child(3) {
    rotate: -1.5deg;
  }
  .sticker dt,
  .sticker-dt {
    display: block;
    height: 14px;
    overflow: hidden;
    font-size: 11px;
    font-weight: 900;
    line-height: 14px !important;
    white-space: nowrap;
    text-overflow: ellipsis;
    opacity: 0.8;
  }
  .sticker dd,
  .sticker-dd {
    display: block;
    height: 30px;
    margin: 0;
    overflow: hidden;
    font-family: var(--font-display);
    font-size: 24px;
    line-height: 30px !important;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .sticker small {
    font-size: 13px;
    opacity: 0.7;
  }
  .sticker .bone {
    --bone: rgba(23, 45, 69, 0.18);
    --shine: rgba(23, 45, 69, 0.06);
  }
  .sticker-dt .bone {
    width: 70%;
    height: 9px;
    margin-top: 3px;
  }
  .sticker-dd .bone {
    width: 55%;
    height: 20px;
    margin-top: 5px;
  }
  .bag-tiers {
    grid-area: tiers;
    display: grid;
    gap: 6px;
    min-width: 0;
  }
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
    gap: 10px;
    height: 16px;
    margin: 0;
    padding: 0;
    overflow: hidden;
    list-style: none;
    font-size: 11px;
    font-weight: 700;
    line-height: 16px !important;
    white-space: nowrap;
    color: var(--dim-text);
  }
  .tier-legend > .bone {
    width: 70%;
    height: 10px;
    margin-top: 3px;
  }
  .tier-legend li:nth-child(1) b {
    color: #ffcf3a;
  }
  .tier-legend li:nth-child(2) b {
    color: #c38bff;
  }
  .tier-legend li:nth-child(3) b {
    color: #4fb4ff;
  }
  .tier-legend li:nth-child(4) b {
    color: #7fdcae;
  }

  /* ── the pockets: luggage tags on the bag's zip ── */
  .pockets {
    position: relative;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 4px;
    height: 96px;
    padding: 0 4px;
  }
  /* the zip: a dark tape with its teeth */
  .pockets::before {
    content: '';
    position: absolute;
    inset: 6px -2px auto;
    height: 14px;
    border-radius: 999px;
    background:
      repeating-linear-gradient(90deg, #c8d3e2 0 3px, #6d7d93 3px 4px, transparent 4px 7px)
        center / 100% 6px no-repeat,
      #0a1628;
    box-shadow:
      0 0 0 2px var(--shadow-ink),
      0 3px 0 2px var(--shadow-ink);
  }
  .tag {
    --c: #ffda55;
    position: relative;
    display: block;
    height: 96px;
    min-width: 0;
    padding: 0;
    border: none;
    background: none;
    color: var(--ink);
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  /* the string from the zip to the tag's eyelet */
  .tag::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 12px;
    width: 2px;
    height: 16px;
    margin-left: -1px;
    background: #e9eef5;
    box-shadow: 0 0 0 1px var(--shadow-ink);
    transition: height 260ms cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  .tag-card {
    position: absolute;
    left: 0;
    right: 0;
    top: 26px;
    display: grid;
    justify-items: center;
    align-content: start;
    gap: 3px;
    height: 58px;
    padding: 12px 2px 0;
    border-radius: 10px 10px 14px 14px;
    background:
      linear-gradient(rgba(255, 255, 255, 0.35), transparent 50%),
      color-mix(in srgb, var(--c) 30%, #20324a);
    box-shadow:
      0 0 0 2px var(--shadow-ink),
      0 3px 0 2px var(--shadow-ink);
    clip-path: none;
    transform-origin: 50% -2px;
    rotate: 4deg;
    transition:
      translate 260ms cubic-bezier(0.3, 1.5, 0.5, 1),
      rotate 260ms cubic-bezier(0.3, 1.5, 0.5, 1),
      background-color 200ms ease-out;
  }
  .tag:nth-child(even) .tag-card {
    rotate: -4deg;
  }
  /* the eyelet */
  .tag-card::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 4px;
    width: 7px;
    height: 7px;
    margin-left: -3.5px;
    border-radius: 50%;
    background: #0a1628;
    box-shadow: 0 0 0 2px #e9eef5;
  }
  .tag-glyph {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--shadow-ink);
  }
  .tag-glyph svg {
    width: 14px;
    height: 14px;
    fill: var(--c);
  }
  .tag-label {
    display: none;
  }
  .tag-count {
    display: block;
    width: 100%;
    height: 14px;
    overflow: hidden;
    font-size: 11px;
    font-weight: 900;
    line-height: 14px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: #fff;
  }
  .tag-count .bone {
    width: 60%;
    height: 8px;
    margin: 3px auto 0;
  }
  .tag:hover .tag-card {
    rotate: 0deg;
  }
  .tag[aria-pressed='true']::before {
    height: 26px;
  }
  .tag[aria-pressed='true'] .tag-card {
    translate: 0 10px;
    rotate: 0deg;
    background:
      linear-gradient(rgba(255, 255, 255, 0.45), transparent 55%),
      var(--c);
  }
  .tag[aria-pressed='true'] .tag-count {
    color: var(--ink);
  }
  .tag[aria-pressed='true'] .tag-glyph {
    box-shadow: 0 0 0 2px #fff;
  }
  .pockets[data-moved] .tag[aria-pressed='true'] .tag-card {
    animation: tag-swing 900ms cubic-bezier(0.3, 1.2, 0.5, 1);
  }
  .tag:focus-visible {
    outline: none;
  }
  .tag:focus-visible .tag-card,
  .slot:focus-visible .slot-well,
  .sort button:focus-visible,
  .seek:focus-visible,
  .bag-tool-link:focus-visible,
  .bag-empty-more:focus-visible,
  .dock-close:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }

  /* ── the open pocket: a canvas panel in the pocket's colour ── */
  .pocket-panel {
    display: grid;
    gap: 14px;
    min-width: 0;
    padding: 14px 12px 16px;
    border: 3px solid var(--shadow-ink);
    border-radius: 24px;
    background:
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.025) 0 2px, transparent 2px 6px),
      repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.08) 0 2px, transparent 2px 6px),
      linear-gradient(
        color-mix(in srgb, var(--pocket) 24%, #0d1c33),
        color-mix(in srgb, var(--pocket) 8%, #0a1628) 260px
      );
    box-shadow:
      inset 0 0 0 2px color-mix(in srgb, var(--pocket) 45%, transparent),
      inset 0 10px 18px rgba(0, 0, 0, 0.35),
      5px 5px 0 var(--shadow-ink);
    transition: background 400ms ease-out;
  }
  .bag-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
  .bag-pocket {
    display: flex;
    align-items: baseline;
    gap: 10px;
    height: 32px;
    margin: 0;
    overflow: hidden;
    font-family: var(--font-display);
    font-size: 26px;
    line-height: 32px !important;
    white-space: nowrap;
  }
  .bag-pocket > .bone {
    width: 46%;
    height: 24px;
    align-self: center;
  }
  .bag-pocket-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bag-pocket-count {
    flex: none;
    font-size: 16px;
    color: var(--pocket);
    font-variant-numeric: tabular-nums;
  }
  .bag-tools {
    display: flex;
    gap: 8px;
    height: 44px;
    min-width: 0;
  }
  /* the sort: a switch where the chosen order spells its name and the
     others show their sign; its width comes from the row, not the words */
  .sort {
    display: flex;
    flex: 1 1 0;
    gap: 2px;
    min-width: 0;
    padding: 3px;
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.35);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  }
  .sort > .bone,
  .seek > .bone {
    width: 100%;
    height: 100%;
    border-radius: 11px;
  }
  .sort button {
    display: flex;
    flex: 0 0 40px;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 0;
    height: 38px;
    padding: 0 8px;
    overflow: hidden;
    border: none;
    border-radius: 11px;
    background: none;
    color: var(--dim-text);
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    line-height: 16px;
    white-space: nowrap;
    cursor: pointer;
    transition:
      flex-grow 240ms cubic-bezier(0.3, 1.3, 0.5, 1),
      background-color 160ms ease-out;
  }
  .sort-glyph {
    flex: none;
    width: 18px;
    height: 18px;
    fill: currentColor;
  }
  .sort-label {
    display: none;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sort button[aria-pressed='true'] {
    flex: 1 1 0;
    background: #fff;
    color: var(--ink);
    box-shadow: 0 2px 0 var(--shadow-ink);
  }
  .sort button[aria-pressed='true'] .sort-label {
    display: block;
  }
  .sort button:not([aria-pressed='true']):hover {
    color: #fff;
  }
  /* the catalogue's silhouettes, on or off */
  .seek {
    display: flex;
    flex: 0 0 104px;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 44px;
    padding: 0 8px;
    overflow: hidden;
    border: 2px solid rgba(255, 255, 255, 0.16);
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.25);
    color: var(--dim-text);
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    line-height: 16px;
    white-space: nowrap;
    cursor: pointer;
  }
  span.seek {
    padding: 0;
    border: none;
  }
  .seek-glyph {
    flex: none;
    width: 20px;
    height: 20px;
    fill: currentColor;
  }
  .seek[aria-pressed='true'] {
    border-color: var(--shadow-ink);
    background: var(--pocket);
    color: var(--ink);
    box-shadow: 0 3px 0 var(--shadow-ink);
  }
  .bag-tool-link {
    display: inline-flex;
    justify-self: start;
    align-items: center;
    height: 44px;
    padding: 0 16px;
    border: 3px solid var(--shadow-ink);
    border-radius: 14px;
    background: var(--pocket);
    color: var(--ink);
    font-size: 13px;
    font-weight: 900;
    line-height: 16px;
    text-decoration: none;
    white-space: nowrap;
    box-shadow: 3px 3px 0 var(--shadow-ink);
  }

  /* ── the inventory: a grid of wells, count stickers on them ── */
  .bag-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  .bag-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .bag-grid > li {
    min-width: 0;
  }
  .slot {
    --tier: #7fdcae;
    display: grid;
    gap: 6px;
    width: 100%;
    padding: 0;
    border: none;
    background: none;
    color: #fff;
    font: inherit;
    text-align: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .slot[data-bone] {
    cursor: default;
  }
  .slot-well {
    position: relative;
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    border-radius: 22px;
    background:
      radial-gradient(
        circle at 50% 42%,
        color-mix(in srgb, var(--tier) 55%, transparent),
        transparent 62%
      ),
      linear-gradient(rgba(255, 255, 255, 0.12), transparent 45%),
      #0a1628;
    box-shadow:
      inset 0 0 0 2px color-mix(in srgb, var(--tier) 80%, transparent),
      inset 0 -6px 0 rgba(0, 0, 0, 0.35),
      0 0 0 2px var(--shadow-ink),
      0 4px 0 2px var(--shadow-ink);
    transition:
      translate 160ms cubic-bezier(0.3, 1.5, 0.5, 1),
      box-shadow 160ms ease-out;
  }
  .slot[data-bone] .slot-well {
    background: #0a1628;
    box-shadow:
      inset 0 0 0 2px rgba(255, 255, 255, 0.08),
      0 0 0 2px var(--shadow-ink),
      0 4px 0 2px var(--shadow-ink);
  }
  .slot-well .catch-ball {
    width: 38%;
    opacity: 0.55;
  }
  .slot-well img {
    width: 62%;
    height: 62%;
    image-rendering: pixelated;
    filter: drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff)
      drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff)
      drop-shadow(0 4px 3px rgba(0, 0, 0, 0.5));
  }
  .slot-stars {
    position: absolute;
    left: 9px;
    top: 7px;
    font-size: 9px;
    line-height: 10px;
    letter-spacing: -0.06em;
    color: var(--tier);
    text-shadow: 0 1px 0 var(--shadow-ink);
  }
  /* the count: a white sticker stuck on the corner */
  .slot-count {
    position: absolute;
    right: -6px;
    bottom: -4px;
    min-width: 30px;
    height: 24px;
    padding: 0 7px;
    border-radius: 9px;
    background: #fff;
    color: var(--ink);
    font-family: var(--font-display);
    font-size: 13px;
    line-height: 24px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    box-shadow:
      0 0 0 2px var(--shadow-ink),
      2px 3px 0 1px var(--shadow-ink);
    rotate: -6deg;
  }
  .slot-name {
    display: -webkit-box;
    height: 28px;
    overflow: hidden;
    font-size: 12px;
    font-weight: 800;
    line-height: 14px !important;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow-wrap: anywhere;
  }
  .slot-name .bone {
    width: 72%;
    height: 9px;
    margin: 3px auto 0;
  }
  .slot:hover .slot-well {
    translate: 0 -3px;
  }
  .slot[aria-current='true'] .slot-well {
    translate: 0 -4px;
    box-shadow:
      inset 0 0 0 3px var(--tier),
      inset 0 -6px 0 rgba(0, 0, 0, 0.35),
      0 0 0 3px #fff,
      0 0 0 6px var(--shadow-ink),
      0 7px 0 5px var(--shadow-ink),
      0 0 32px 6px color-mix(in srgb, var(--tier) 60%, transparent);
  }
  .slot[aria-current='true'] .slot-well img {
    animation: slot-bob 1.4s ease-in-out infinite;
  }
  .slot[aria-current='true'] .slot-name {
    color: var(--tier);
  }
  /* not found yet: who's that item? */
  .slot[data-missing] .slot-well {
    background:
      linear-gradient(rgba(255, 255, 255, 0.06), transparent 45%),
      #0a1628;
    box-shadow:
      inset 0 0 0 2px rgba(255, 255, 255, 0.1),
      0 0 0 2px var(--shadow-ink),
      0 4px 0 2px var(--shadow-ink);
  }
  .slot[data-missing] img {
    filter: brightness(0) drop-shadow(0 0 1.5px rgba(160, 230, 255, 0.9));
    opacity: 0.75;
  }
  .slot[data-missing] .slot-count {
    min-width: 24px;
    padding: 0;
    background: #33455e;
    color: #fff;
  }
  .slot[data-missing] .slot-name {
    color: var(--dim-text);
  }
  .bag-grid[data-moved] .slot {
    animation: slot-pop 420ms cubic-bezier(0.3, 1.6, 0.5, 1)
      calc(min(var(--i), 15) * 22ms) both;
  }

  .bag-detail {
    display: none;
  }
  .bag-detail-bone {
    height: 560px;
    border-radius: 28px;
  }

  /* ── the dock (phones): the chosen item's touch screen ── */
  .dock {
    position: fixed;
    left: 8px;
    right: 8px;
    bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    z-index: 40;
    display: grid;
    gap: 10px;
    max-width: 560px;
    margin: 0 auto;
    padding: 10px 10px 12px;
    border: 3px solid var(--shadow-ink);
    border-radius: 24px;
    background:
      linear-gradient(color-mix(in srgb, var(--tier) 30%, transparent), transparent 60%),
      #0f2240;
    box-shadow:
      inset 0 0 0 2px color-mix(in srgb, var(--tier) 60%, transparent),
      0 6px 0 var(--shadow-ink),
      0 18px 40px rgba(0, 0, 0, 0.55);
    animation: dock-in 340ms cubic-bezier(0.2, 1.3, 0.4, 1);
  }
  .dock-head {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) auto 40px;
    align-items: center;
    gap: 10px;
  }
  .dock-well {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background:
      radial-gradient(circle, color-mix(in srgb, var(--tier) 50%, transparent), transparent 70%),
      #0a1628;
    box-shadow: inset 0 0 0 2px var(--tier);
  }
  .dock-well img {
    width: 36px;
    height: 36px;
    image-rendering: pixelated;
  }
  .dock-text {
    display: grid;
    min-width: 0;
  }
  .dock-text strong {
    height: 20px;
    overflow: hidden;
    font-size: 15px;
    font-weight: 900;
    line-height: 20px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .dock-text span {
    height: 16px;
    overflow: hidden;
    font-size: 11px;
    font-weight: 700;
    line-height: 16px;
    white-space: nowrap;
    color: var(--dim-text);
  }
  .dock-text b {
    color: var(--tier);
  }
  .dock-count {
    font-family: var(--font-display);
    font-size: 18px;
    line-height: 24px;
    white-space: nowrap;
  }
  .dock-close {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    cursor: pointer;
  }
  .dock-close svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
  .dock-commands,
  .bag-detail-commands {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    gap: 10px;
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

  /* ── empty ── */
  .bag-empty {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 24px 16px 20px;
    border-radius: 22px;
    background:
      radial-gradient(
        60% 50% at 50% 0%,
        color-mix(in srgb, var(--pocket) 22%, transparent),
        transparent 70%
      ),
      rgba(255, 255, 255, 0.04);
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.08);
    text-align: center;
  }
  /* the bag, flat on its back and empty */
  .bag-empty-art {
    width: 92px;
    aspect-ratio: 1;
    rotate: -12deg;
    filter: saturate(0.5) drop-shadow(0 8px 8px rgba(0, 0, 0, 0.4));
  }
  .bag-empty-art svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .bag-empty-art .bag-body {
    fill: var(--pocket);
  }
  .bag-empty-more {
    min-height: 44px;
    padding: 0 8px;
    border: none;
    background: none;
    color: var(--dim-text);
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
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

  @media (min-width: 480px) {
    .bag-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .bag-head {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
    }
    .bag-tools {
      width: 300px;
    }
  }

  @media (min-width: 640px) {
    .bag-grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
    .tag-card {
      height: 62px;
    }
    .tag-glyph {
      width: 28px;
      height: 28px;
    }
    .tag-glyph svg {
      width: 16px;
      height: 16px;
    }
  }

  @media (max-width: 359px) {
    .bag-hero {
      gap: 12px 10px;
      padding: 12px 10px 14px;
    }
    .stickers {
      gap: 8px;
    }
    .sticker {
      padding: 0 7px;
    }
    .sticker dd,
    .sticker-dd {
      font-size: 19px;
    }
    .pockets {
      gap: 3px;
      padding: 0 2px;
    }
    .tag-glyph {
      width: 22px;
      height: 22px;
    }
    .pocket-panel {
      padding: 12px 10px 14px;
    }
    .bag-grid {
      gap: 12px 8px;
    }
    .slot-name {
      font-size: 11px;
    }
    .seek {
      flex-basis: 44px;
      padding: 0;
    }
    .seek > span {
      display: none;
    }
  }

  @media (min-width: 900px) {
    gap: 16px;
    padding: 28px 24px 56px;

    &[data-docked] {
      padding-bottom: 56px;
    }
    .bag-hero {
      grid-template-columns: 200px minmax(0, 1fr) auto;
      grid-template-areas:
        'art name stickers'
        'art tiers stickers';
      gap: 14px 28px;
      padding: 22px 32px 22px 28px;
      border-radius: 32px;
    }
    .bag-hero::before {
      left: -20%;
      top: -90%;
      width: 60%;
    }
    .bag-art {
      width: 200px;
    }
    .bag-title {
      font-size: clamp(44px, 4.6vw, 64px);
    }
    .bag-name {
      align-self: end;
    }
    .bag-tiers {
      align-self: start;
    }
    .stickers {
      grid-template-columns: repeat(3, 148px);
      gap: 18px;
    }
    .sticker {
      height: 104px;
      padding: 0 16px;
      border-radius: 22px;
    }
    .sticker dt,
    .sticker-dt {
      font-size: 12px;
    }
    .sticker dd,
    .sticker-dd {
      height: 48px;
      font-size: 32px;
      line-height: 48px !important;
    }
    .sticker small {
      font-size: 16px;
    }
    .sticker-dd .bone {
      height: 32px;
      margin-top: 8px;
    }
    .pockets {
      gap: 10px;
      height: 92px;
      padding: 0 10px;
    }
    .tag {
      height: 92px;
    }
    .tag-card {
      grid-template-columns: 30px minmax(0, 1fr);
      align-items: center;
      justify-items: start;
      gap: 8px;
      height: 52px;
      padding: 8px 10px 0;
      top: 28px;
    }
    .tag-card::before {
      top: 4px;
    }
    .tag-glyph {
      width: 30px;
      height: 30px;
    }
    .tag-label {
      display: block;
      width: 100%;
      height: 16px;
      overflow: hidden;
      font-size: 13px;
      font-weight: 900;
      line-height: 16px;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: #fff;
    }
    .tag-label .bone {
      width: 80%;
      height: 10px;
      margin-top: 3px;
    }
    .tag-count {
      position: absolute;
      right: -6px;
      top: -8px;
      width: auto;
      min-width: 26px;
      height: 20px;
      padding: 0 6px;
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      line-height: 20px;
      box-shadow: 0 0 0 2px var(--shadow-ink);
      rotate: 8deg;
    }
    .tag-count .bone {
      margin-top: 6px;
    }
    .tag[aria-pressed='true'] .tag-label {
      color: var(--ink);
    }
    .tag-card {
      rotate: 2deg;
    }
    .tag:nth-child(even) .tag-card {
      rotate: -2deg;
    }
    .pocket-panel {
      gap: 20px;
      padding: 22px 24px 26px;
      border-radius: 30px;
    }
    .bag-pocket {
      height: 44px;
      font-size: 38px;
      line-height: 44px !important;
    }
    .bag-pocket > .bone {
      height: 32px;
      width: 30%;
    }
    .bag-pocket-count {
      font-size: 20px;
    }
    .bag-tools {
      width: 360px;
    }
    .bag-body {
      grid-template-columns: minmax(0, 1fr) 380px;
      gap: 24px;
    }
    .bag-grid {
      grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
      gap: 18px 14px;
    }
    .bag-detail {
      position: sticky;
      top: 90px;
      display: grid;
      gap: 12px;
    }
    .bag-detail .card {
      max-height: calc(100svh - 240px);
    }
    .bag-detail-commands .command {
      min-height: 72px;
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
  @keyframes slot-pop {
    from {
      opacity: 0;
      transform: scale(0.6) translateY(8px);
    }
  }
  @keyframes slot-bob {
    50% {
      translate: 0 -3px;
      rotate: -4deg;
    }
  }
  @keyframes tag-swing {
    0% {
      rotate: 0deg;
      translate: 0 0;
    }
    25% {
      rotate: -14deg;
    }
    50% {
      rotate: 9deg;
    }
    75% {
      rotate: -4deg;
    }
  }
  @keyframes dock-in {
    from {
      opacity: 0;
      transform: translateY(40px) scale(0.96);
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
