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

  /* ── the face-off card ── */
  .versus {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    overflow: hidden;
    border-radius: var(--radius-card, 20px);
    background:
      radial-gradient(
        circle at 50% 34%,
        rgba(255, 218, 85, 0.35) 0,
        transparent 18%
      ),
      linear-gradient(
        104deg,
        color-mix(in srgb, var(--a) 62%, #0b1626) 0 49.4%,
        #ffda55 49.4% 50.6%,
        color-mix(in srgb, var(--b) 62%, #0b1626) 50.6%
      );
    box-shadow: 0 18px 34px rgba(23, 45, 69, 0.25);
    color: #fff;
    isolation: isolate;
  }
  /* each side is its own query container: names scale to the column */
  .fighter {
    container-type: inline-size;
    position: relative;
    display: grid;
    grid-template-rows: auto auto auto auto 1fr;
    justify-items: center;
    gap: 6px;
    min-width: 0;
    padding: 14px 10px 14px;
    text-align: center;
    animation: compare-in 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .fighter--b {
    animation-name: compare-in-b;
  }
  .art {
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 1;
    max-width: 210px;
  }
  .art img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.45));
  }
  .fighter--b .art img {
    transform: scaleX(-1);
  }
  .fighter[data-leader='true'] .art img {
    animation: compare-flex 1.6s ease-in-out 700ms infinite alternate;
  }
  .placeholder {
    display: grid;
    place-items: center;
    width: 64%;
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
      min(11cqi, calc(94cqi / (var(--word, 8) * 0.86))),
      26px
    );
    font-weight: 400;
    line-height: 1.1 !important;
    text-transform: uppercase;
    text-wrap: balance;
  }
  .fighter-name a {
    color: #fff;
    text-decoration: none;
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
  .change {
    align-self: end;
    min-height: 44px;
    min-width: 88px;
    padding: 0 16px;
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
    top: 10px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px 3px 7px;
    border-radius: 999px;
    background: #ffda55;
    color: #2a1b00;
    font-size: 12px;
    font-weight: 800;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: compare-crown 560ms cubic-bezier(0.3, 1.6, 0.5, 1) 520ms both;
  }
  .fighter--a .crown {
    left: 10px;
  }
  .fighter--b .crown {
    right: 10px;
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
    /* centred on the art row: padding + half the square art */
    top: calc(14px + min(25% - 10px, 105px));
    translate: -50% -50%;
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #ffda55;
    box-shadow:
      0 0 0 4px #0b1626,
      0 8px 18px rgba(0, 0, 0, 0.4);
    color: #0b1626;
    font-family: var(--font-display);
    font-size: 18px;
    animation: compare-vs 600ms cubic-bezier(0.3, 1.6, 0.5, 1) 240ms both;
  }

  .verdict {
    margin: 18px 0 6px;
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
    .verdict,
    .hint {
      max-width: 760px;
      margin-inline: auto;
    }
    .board {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      align-items: center;
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
      transform: scale(2.2) rotate(-20deg);
      opacity: 0;
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
    .vs,
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
    max-height: 82dvh;
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
  .results {
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
