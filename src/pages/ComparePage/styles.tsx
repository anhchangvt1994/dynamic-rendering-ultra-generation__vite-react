import styled from 'styled-components'

export const CompareStyle = styled.section`
  max-width: 760px;
  margin: 0 auto;
  padding: 12px 16px 48px;
  color: var(--ink);

  /* ── top bar: back · title · swap ── */
  .topbar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .back,
  .swap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .back {
    padding: 0 14px 0 10px;
  }
  .swap {
    width: 44px;
  }
  .swap:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .back svg,
  .swap svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .back:focus-visible,
  .swap:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(20px, 6vw, 32px);
    font-weight: 400;
    line-height: 1.1 !important;
    text-align: center;
    text-transform: uppercase;
  }

  /* ── the face-off card: a diagonal arena over level name plates ── */
  .versus {
    container-type: inline-size;
    overflow: hidden;
    border-radius: var(--radius-card, 20px);
    background: #0b1626;
    box-shadow: 0 18px 34px rgba(23, 45, 69, 0.25);
    color: #fff;
    isolation: isolate;
  }

  /* the arena: both halves and the seam pivot on the VS badge, which sits
     dead centre, so the badge is always on the seam */
  .arena {
    --tilt: 14deg;
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    height: clamp(150px, 46cqi, 250px);
    overflow: hidden;
    background: color-mix(in srgb, var(--b) 62%, #0b1626);
  }
  .half,
  .seam {
    position: absolute;
    top: 50%;
    pointer-events: none;
  }
  .half {
    z-index: 0;
    right: 50%;
    width: 300%;
    height: 600%;
    translate: 0 -50%;
    transform-origin: 100% 50%;
    rotate: var(--tilt);
    background: color-mix(in srgb, var(--a) 62%, #0b1626);
  }
  .seam {
    z-index: 1;
    left: 50%;
    width: 6px;
    height: 600%;
    translate: -50% -50%;
    rotate: var(--tilt);
    background: #ffda55;
    box-shadow:
      0 0 12px 2px rgba(255, 218, 85, 0.7),
      0 0 40px 10px rgba(255, 218, 85, 0.25);
    animation: compare-seam 520ms cubic-bezier(0.7, 0, 0.2, 1) 120ms both;
  }

  /* each half of the arena is one big control */
  .portrait {
    position: relative;
    z-index: 2;
    display: grid;
    place-items: center;
    min-width: 0;
    padding: 12px 18px;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  /* the fighter's first type, glowing behind it */
  .portrait::before {
    content: '';
    position: absolute;
    inset: 8%;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--halo) 75%, transparent) 0,
      color-mix(in srgb, var(--halo) 25%, transparent) 45%,
      transparent 70%
    );
    transition: scale 200ms ease-out;
  }
  /* pinned to the portrait box: the art always fits the arena's height */
  .portrait img {
    position: absolute;
    inset: 12px 18px;
    width: calc(100% - 36px);
    height: calc(100% - 24px);
    object-fit: contain;
    filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.45));
    transition: scale 200ms cubic-bezier(0.3, 1.4, 0.5, 1);
    animation: compare-in 560ms cubic-bezier(0.16, 1, 0.3, 1) 220ms both;
  }
  .portrait--b img {
    transform: scaleX(-1);
    animation-name: compare-in-b;
  }
  .portrait:hover img {
    scale: 1.06;
  }
  .portrait:hover::before {
    scale: 1.12;
  }
  .portrait:active img {
    scale: 0.95;
  }
  .portrait:focus-visible {
    outline: 3px solid #ffda55;
    outline-offset: -6px;
    border-radius: 18px;
  }
  /* swap hint in the outer top corner */
  .edit {
    position: absolute;
    top: 10px;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(11, 22, 38, 0.45);
    box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.35);
    transition:
      background 160ms ease-out,
      rotate 300ms ease-out;
  }
  .portrait--a .edit {
    left: 10px;
  }
  .portrait--b .edit {
    right: 10px;
  }
  .edit svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: #fff;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .portrait:hover .edit {
    background: #ffda55;
    rotate: 180deg;
  }
  .portrait:hover .edit svg {
    stroke: #0b1626;
  }
  /* an empty corner: a ring that breathes until it is tapped */
  .slot {
    position: relative;
    display: grid;
    place-items: center;
    width: min(70%, 120px);
    aspect-ratio: 1;
    border: 2.5px dashed rgba(255, 255, 255, 0.55);
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.22);
    font-family: var(--font-display);
    font-size: clamp(30px, 10cqi, 46px);
    line-height: 1;
    color: #ffda55;
    animation: compare-breathe 1.8s ease-in-out infinite;
  }
  .portrait:hover .slot {
    border-color: #ffda55;
  }

  .vs {
    position: absolute;
    z-index: 3;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    display: grid;
    place-items: center;
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: radial-gradient(
      circle at 35% 30%,
      #fff2b0,
      #ffda55 55%,
      #f2b600
    );
    box-shadow:
      0 0 0 4px #0b1626,
      0 8px 18px rgba(0, 0, 0, 0.4);
    color: #0b1626;
    font-family: var(--font-display);
    font-size: 19px;
    pointer-events: none;
    animation: compare-vs 600ms cubic-bezier(0.3, 1.6, 0.5, 1) 520ms both;
  }
  /* the shockwave when the badge lands */
  .vs::after {
    content: '';
    position: absolute;
    inset: -4px;
    border: 3px solid #ffda55;
    border-radius: 50%;
    opacity: 0;
    animation: compare-shock 800ms ease-out 760ms;
  }

  /* ── name plates: one shared row grid, so both sides stay level ── */
  .plates {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto auto;
    border-top: 4px solid #ffda55;
  }
  .plates::before {
    content: '';
    position: absolute;
    z-index: 1;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 2px;
    margin-left: -1px;
    background: rgba(255, 255, 255, 0.14);
  }
  /* no container-type here: containment would stop the subgrid, so the
     sizes below read the whole card (.versus), two plates wide */
  .plate {
    grid-row: span 3;
    display: grid;
    grid-template-rows: subgrid;
    justify-items: center;
    align-items: start;
    row-gap: 8px;
    min-width: 0;
    padding: 14px 10px 16px;
    background: color-mix(in srgb, var(--a) 34%, #0b1626);
    text-align: center;
  }
  .plate--b {
    background: color-mix(in srgb, var(--b) 34%, #0b1626);
  }
  .plate[data-leader='true'] {
    background:
      radial-gradient(
        120% 90% at 50% 0,
        rgba(255, 218, 85, 0.28),
        transparent 70%
      ),
      color-mix(in srgb, var(--a) 34%, #0b1626);
  }
  .plate--b[data-leader='true'] {
    background:
      radial-gradient(
        120% 90% at 50% 0,
        rgba(255, 218, 85, 0.28),
        transparent 70%
      ),
      color-mix(in srgb, var(--b) 34%, #0b1626);
  }
  .fighter-name {
    /* plain inline text: the crown rides the first line instead of
       claiming a line of its own; fitPlateName() caps it at two lines */
    margin: 0;
    max-width: 100%;
    font-family: var(--font-display);
    /* the longest word must fit its plate (Dela runs ~0.86em a letter) */
    font-size: clamp(
      11px,
      min(5cqi, calc(43cqi / (var(--word, 8) * 0.86))),
      24px
    );
    font-weight: 400;
    line-height: 1.1 !important;
    text-transform: uppercase;
    text-wrap: balance;
  }
  .fighter-name a {
    /* inline padding widens the tap target without moving the lines */
    padding: 14px 0;
    /* the global reset forces 1.5; the name's lines must stay 1.1 */
    line-height: inherit !important;
    color: #fff;
    text-decoration: none;
  }
  .fighter-name a:hover {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
  }
  .fighter-name a:focus-visible {
    outline: 2px solid #ffda55;
    outline-offset: 2px;
  }
  .crown {
    display: inline-block;
    width: 1.1em;
    height: 1.1em;
    margin-right: 0.3em;
    vertical-align: -0.2em;
    fill: #ffda55;
    filter: drop-shadow(0 0 6px rgba(255, 218, 85, 0.7));
    animation: compare-crown 560ms cubic-bezier(0.3, 1.6, 0.5, 1) 1000ms both;
  }
  .tier {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
  }
  .tier b {
    display: inline-grid;
    place-items: center;
    min-width: 30px;
    height: 24px;
    padding: 0 6px;
    border-radius: 7px;
    background: var(--tier);
    color: #10161f;
    font-family: var(--font-display);
    font-weight: 400;
  }
  .tier--empty {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    white-space: normal;
  }
  .types {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
    min-height: 22px;
    margin: 0;
  }
  .types span {
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--type);
    font-size: 12px;
    font-weight: 700;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35);
  }
  @container (max-width: 340px) {
    .types span {
      padding: 2px 7px;
      font-size: 11px;
    }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .verdict-row {
    display: grid;
    justify-items: center;
    gap: 10px;
    margin: 18px 0 4px;
  }
  .share {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .share svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .share:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }

  /* ── who hits whom ── */
  .matchup {
    margin-top: 22px;
  }
  .matchup h2,
  .rivals-heading {
    margin: 0 0 10px;
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 400;
    text-transform: uppercase;
    text-align: center;
  }
  .matchup-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .hit {
    display: grid;
    justify-items: center;
    gap: 4px;
    padding: 12px 8px 14px;
    border: 1px solid var(--line);
    border-top: 4px solid var(--a);
    border-radius: 16px;
    background: var(--surface);
    text-align: center;
  }
  .hit--b {
    border-top-color: var(--b);
  }
  .hit p {
    margin: 0;
  }
  .hit-who {
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    text-wrap: balance;
  }
  .hit-power {
    font-family: var(--font-display);
    font-size: 34px;
    line-height: 1.1;
    color: var(--ink);
  }
  .hit[data-tone='up'] .hit-power {
    color: #c62f12;
  }
  .hit[data-tone='down'] .hit-power {
    color: var(--muted);
  }
  .hit-how {
    display: grid;
    justify-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 700;
  }
  .hit-type {
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--type);
    color: #fff;
    font-size: 12px;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35);
  }
  .matchup-note {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--muted);
    text-align: center;
  }

  /* ── colour key, stuck under the header while the ropes scroll ── */
  .legend {
    position: sticky;
    top: 0;
    z-index: 4;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin: 22px -16px 0;
    padding: 10px 16px;
    @media (min-width: 960px) {
      margin-inline: 0;
      padding-inline: 0;
    }
    background: color-mix(in srgb, var(--canvas) 88%, transparent);
    backdrop-filter: blur(8px);
    font-size: 13px;
    font-weight: 800;
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .legend span::before {
    content: '';
    flex: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--a);
  }
  .legend-a {
    color: var(--a);
  }
  .legend-b {
    flex-direction: row-reverse;
    color: var(--b);
  }
  .legend-b::before {
    background: var(--b) !important;
  }

  .verdict {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.4;
    text-align: center;
    text-wrap: balance;
  }

  /* ── tug of war: each stat pulls a rope from the middle ── */
  .tug {
    display: grid;
    gap: 12px;
    margin: 14px 0 0;
    padding: 0;
    list-style: none;
  }
  .tug li {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: baseline;
    row-gap: 6px;
  }
  .label {
    font-size: 13px;
    font-weight: 700;
    color: var(--muted);
    text-align: center;
  }
  .num {
    font-family: var(--font-display);
    font-size: 18px;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
  }
  .num--b {
    text-align: right;
  }
  .num small {
    margin: 0 6px;
    padding: 1px 6px;
    border-radius: 6px;
    font-family: var(--font-body, inherit);
    font-size: 11px;
    font-weight: 800;
    vertical-align: 3px;
    color: #fff;
  }
  .num--a small {
    background: var(--a);
  }
  .num--b small {
    background: var(--b);
  }
  [data-lead='a'] .rope {
    background: color-mix(in srgb, var(--b) 30%, var(--canvas));
  }
  [data-lead='b'] .rope::before {
    background: color-mix(in srgb, var(--a) 30%, var(--canvas));
  }
  [data-lead='a'] .num--a {
    color: var(--a);
  }
  [data-lead='b'] .num--b {
    color: var(--b);
  }
  .rope {
    grid-column: 1 / -1;
    position: relative;
    height: 12px;
    overflow: hidden;
    border-radius: 6px;
    background: var(--b);
  }
  .rope::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--share);
    background: var(--a);
    animation: compare-pull 900ms cubic-bezier(0.16, 1, 0.3, 1)
      calc(var(--i) * 70ms + 300ms) both;
  }
  /* the centre marker: who has crossed it is winning this stat */
  .rope::after {
    content: '';
    position: absolute;
    left: 50%;
    top: -2px;
    bottom: -2px;
    width: 3px;
    margin-left: -1.5px;
    background: #fff;
    box-shadow: 0 0 0 1px rgba(23, 45, 69, 0.25);
  }
  .sum {
    margin-top: 6px;
    padding-top: 12px;
    border-top: 2px solid var(--line);
  }
  .sum .num {
    font-size: 22px;
  }
  .sum .rope {
    height: 16px;
    border-radius: 8px;
  }

  /* wide screens: ropes and radar side by side, both in view */
  @media (min-width: 960px) {
    max-width: 1040px;

    .topbar,
    .versus,
    .verdict-row,
    .matchup,
    .empty {
      max-width: 760px;
      margin-inline: auto;
    }
    .board {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      align-items: end;
      gap: 40px;
    }
    .board .radar svg {
      margin-top: 0;
    }
  }

  /* ── radar ── */
  .radar svg {
    display: block;
    width: 100%;
    max-width: 380px;
    margin: 18px auto 0;
    overflow: visible;
  }
  .radar text {
    font-size: 12px;
    font-weight: 700;
    fill: var(--muted);
  }
  .shape {
    stroke-width: 2.5;
    stroke-linejoin: round;
    transform-origin: 150px 120px;
    animation: compare-grow 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .shape--a {
    fill: color-mix(in srgb, var(--a) 28%, transparent);
    stroke: var(--a);
  }
  .shape--b {
    fill: color-mix(in srgb, var(--b) 28%, transparent);
    stroke: var(--b);
    animation-delay: 120ms;
  }
  .hint {
    margin: 18px 0 0;
    color: var(--muted);
    text-align: center;
    text-wrap: balance;
  }
  .radar {
    margin: 0;
  }
  .radar figcaption {
    margin-top: 4px;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    text-align: center;
  }

  /* ── empty arena: classic rivalries, one tap away ── */
  .rivals-heading {
    margin-top: 26px;
  }
  .rivals {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .rivals button {
    display: grid;
    grid-template-columns: 44px 1fr 44px;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-height: 56px;
    padding: 4px 8px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    transition:
      transform 140ms ease-out,
      box-shadow 140ms ease-out;
  }
  .rivals button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(23, 45, 69, 0.12);
  }
  .rivals button:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
  .rivals img {
    image-rendering: pixelated;
  }
  .rivals img:last-child {
    transform: scaleX(-1);
  }
  .rivals em {
    font-family: var(--font-display);
    font-style: normal;
    font-size: 12px;
    color: var(--red);
  }

  @keyframes compare-in {
    from {
      opacity: 0;
      translate: -40px 0;
    }
  }
  @keyframes compare-in-b {
    from {
      opacity: 0;
      translate: 40px 0;
    }
  }
  @keyframes compare-vs {
    from {
      transform: scale(2.6) rotate(-25deg);
      opacity: 0;
    }
  }
  @keyframes compare-shock {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(2.8);
    }
  }
  @keyframes compare-seam {
    from {
      scale: 1 0;
    }
  }
  @keyframes compare-breathe {
    50% {
      scale: 1.06;
      box-shadow: 0 0 0 8px rgba(255, 218, 85, 0.12);
    }
  }
  @keyframes compare-crown {
    from {
      transform: translateY(-14px) scale(0.6);
      opacity: 0;
    }
  }
  @keyframes compare-pull {
    from {
      width: 50%;
    }
  }
  @keyframes compare-grow {
    from {
      transform: scale(0.85);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .slot,
    .seam,
    .vs,
    .vs::after,
    .crown,
    .shape,
    .rope::before,
    .portrait img,
    .portrait::before,
    .edit {
      animation: none;
      transition: none;
    }
  }
`

/* Picker as a bottom sheet on phones, a centred card on wide screens. */
export const SheetStyle = styled.div`
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(11, 22, 38, 0.55);
  animation: sheet-fade 200ms ease-out both;

  .sheet {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 520px;
    /* a fixed height: the sheet does not jump while results change */
    height: min(86dvh, 680px);
    padding: 8px 16px calc(16px + env(safe-area-inset-bottom, 0px));
    border-radius: 22px 22px 0 0;
    background: var(--surface, #fff);
    color: var(--ink);
    box-shadow: 0 -12px 34px rgba(0, 0, 0, 0.25);
    animation: sheet-up 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  &[data-side='a'] .sheet {
    border-top: 5px solid #e3350d;
  }
  &[data-side='b'] .sheet {
    border-top: 5px solid #2a6fdb;
  }
  .grip {
    align-self: center;
    width: 40px;
    height: 5px;
    margin-bottom: 8px;
    border-radius: 3px;
    background: var(--line);
  }
  .sheet-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }
  h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
  }
  .close {
    min-height: 44px;
    padding: 0 14px;
    border: none;
    border-radius: 10px;
    background: var(--canvas);
    color: var(--ink);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  input {
    width: 100%;
    min-height: 50px;
    padding: 0 14px;
    border: 2px solid var(--line);
    border-radius: 14px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-size: 16px;
  }
  input:focus-visible,
  .close:focus-visible,
  .results button:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
  .results-heading {
    margin: 14px 0 0;
    font-size: 12px;
    font-weight: 800;
    color: var(--muted);
  }
  .results {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
  }
  .results button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 56px;
    padding: 4px 10px 4px 4px;
    border: none;
    border-radius: 12px;
    background: none;
    color: var(--ink);
    font: inherit;
    font-size: 16px;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
  }
  .results button:hover {
    background: var(--canvas);
  }
  .results img {
    width: 48px;
    height: 48px;
    image-rendering: pixelated;
  }
  .results small {
    margin-left: auto;
    color: var(--muted);
    font-weight: 600;
  }
  .note {
    margin: 14px 0 6px;
    color: var(--muted);
    text-align: center;
  }
  .note button {
    border: none;
    background: none;
    color: var(--focus);
    font: inherit;
    font-weight: 700;
    text-decoration: underline;
    cursor: pointer;
  }

  @media (min-width: 700px) {
    align-items: center;
    .sheet {
      border-radius: 22px;
    }
    .grip {
      display: none;
    }
  }
  @keyframes sheet-fade {
    from {
      opacity: 0;
    }
  }
  @keyframes sheet-up {
    from {
      transform: translateY(40%);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &,
    .sheet {
      animation: none;
    }
  }
`
