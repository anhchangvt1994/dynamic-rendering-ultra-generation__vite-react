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

  /* ── the face-off card ──
     Both halves and the seam pivot on one point, the centre of the VS
     badge, so the badge always sits on the seam. The art is square and
     scales with the card's width, hence cqi rather than %. */
  .versus {
    --art: min(50cqi - 20px, 210px);
    --vs-y: calc(14px + var(--art) / 2);
    --tilt: 8deg;
    container-type: inline-size;
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    overflow: hidden;
    border-radius: var(--radius-card, 20px);
    background: color-mix(in srgb, var(--b) 62%, #0b1626);
    box-shadow: 0 18px 34px rgba(23, 45, 69, 0.25);
    color: #fff;
    isolation: isolate;
  }
  .half,
  .seam {
    position: absolute;
    top: var(--vs-y);
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
    animation: compare-half 620ms cubic-bezier(0.16, 1, 0.3, 1) both;
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
  /* each side is its own query container: names scale to the column */
  .fighter {
    container-type: inline-size;
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-rows: auto auto auto auto 1fr;
    justify-items: center;
    gap: 6px;
    min-width: 0;
    padding: 14px 10px 14px;
    text-align: center;
    animation: compare-in 520ms cubic-bezier(0.16, 1, 0.3, 1) 200ms both;
  }
  .fighter--b {
    animation-name: compare-in-b;
  }
  .art {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 1;
    max-width: 210px;
    /* the fighter's first type, glowing behind it */
    background: radial-gradient(
      circle at 50% 55%,
      color-mix(in srgb, var(--halo) 75%, transparent) 0,
      color-mix(in srgb, var(--halo) 30%, transparent) 38%,
      transparent 68%
    );
  }
  .art img {
    width: 92%;
    height: 92%;
    object-fit: contain;
    filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.45));
  }
  .fighter--b .art img {
    transform: scaleX(-1);
  }
  .fighter[data-leader='true'] .art img {
    animation: compare-flex 1.6s ease-in-out 900ms infinite alternate;
  }
  .placeholder {
    display: grid;
    place-items: center;
    width: 54%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.28);
    box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.18);
    font-family: var(--font-display);
    font-size: 40px;
    color: #ffda55;
  }
  .fighter-name {
    margin: 0;
    max-width: 100%;
    font-family: var(--font-display);
    /* the longest word must fit the column (Dela runs ~0.86em a letter) */
    font-size: clamp(
      11px,
      min(11cqi, calc(78cqi / (var(--word, 8) * 0.86))),
      26px
    );
    font-weight: 400;
    line-height: 1.1 !important;
    text-transform: uppercase;
    text-wrap: balance;
  }
  .fighter-name a {
    display: inline-block;
    padding: 14px 0;
    margin: -14px 0;
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
  .types {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
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
  /* below the badge the seam leans left, and so do the lines under it:
     each row keeps clear of the seam in both halves */
  .fighter-name {
    translate: -4px 0;
  }
  .tier,
  .types {
    translate: -9px 0;
  }
  .change {
    translate: -16px 0;
  }
  @container (max-width: 170px) {
    .change .long {
      display: none;
    }
    .types span {
      padding: 2px 7px;
      font-size: 11px;
    }
  }
  .change {
    align-self: end;
    min-height: 44px;
    min-width: 76px;
    max-width: 100%;
    padding: 0 14px;
    border: 1.5px solid rgba(255, 255, 255, 0.55);
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.18);
    color: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .change:hover {
    background: rgba(0, 0, 0, 0.32);
  }
  .change:focus-visible {
    outline: 2px solid #ffda55;
    outline-offset: 2px;
  }
  .crown {
    position: absolute;
    z-index: 2;
    bottom: 2px;
    left: 50%;
    translate: -50% 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px 3px 7px;
    border-radius: 999px;
    background: #ffda55;
    color: #2a1b00;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: compare-crown 560ms cubic-bezier(0.3, 1.6, 0.5, 1) 1000ms both;
  }
  .crown svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
  .vs {
    position: absolute;
    z-index: 3;
    left: 50%;
    top: var(--vs-y);
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
      transform: translateX(-30px);
    }
  }
  @keyframes compare-in-b {
    from {
      opacity: 0;
      transform: translateX(30px);
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
  @keyframes compare-half {
    from {
      translate: -40% -50%;
    }
  }
  @keyframes compare-crown {
    from {
      transform: translateY(-14px) scale(0.6);
      opacity: 0;
    }
  }
  @keyframes compare-flex {
    to {
      translate: 0 -6px;
      scale: 1.04;
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
    .fighter,
    .half,
    .seam,
    .vs,
    .vs::after,
    .crown,
    .shape,
    .rope::before,
    .fighter[data-leader='true'] .art img {
      animation: none;
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
