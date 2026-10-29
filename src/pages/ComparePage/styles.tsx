import styled from 'styled-components'

export const CompareStyle = styled.section`
  max-width: 820px;
  margin: 0 auto;
  padding: 16px 16px 40px;
  color: var(--ink);

  h1 {
    margin: 0 0 14px;
    font-family: var(--font-display);
    font-size: clamp(26px, 6vw, 40px);
    line-height: 1.1 !important;
    text-transform: uppercase;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  /* ── pickers ── */
  .pickers {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: end;
    gap: 10px;
  }
  .picker {
    position: relative;
    min-width: 0;
  }
  .picker label {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
  }
  .picker input {
    width: 100%;
    min-height: 48px;
    padding: 0 14px;
    border: 2px solid var(--line);
    border-radius: 14px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-size: 16px;
    font-weight: 600;
  }
  .picker:first-child input {
    border-left: 6px solid var(--a);
  }
  .picker:last-child input {
    border-left: 6px solid var(--b);
  }
  .picker input:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 1px;
  }
  .picker-results {
    position: absolute;
    z-index: 5;
    left: 0;
    right: 0;
    top: calc(100% + 4px);
    margin: 0;
    padding: 4px;
    list-style: none;
    border-radius: 14px;
    background: var(--surface);
    box-shadow: 0 12px 28px rgba(23, 45, 69, 0.2);
  }
  .picker-results button {
    display: flex;
    justify-content: space-between;
    width: 100%;
    min-height: 44px;
    padding: 0 12px;
    border: none;
    border-radius: 10px;
    background: none;
    color: var(--ink);
    font: inherit;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
  }
  .picker-results button:hover,
  .picker-results button:focus-visible {
    background: var(--canvas);
    outline: none;
  }
  .picker-results small {
    color: var(--muted);
    font-weight: 600;
  }
  .picker-results .none {
    padding: 12px;
    color: var(--muted);
  }
  .swap {
    width: 48px;
    height: 48px;
    border: none;
    border-radius: 50%;
    background: var(--ink);
    color: #fff;
    font-size: 20px;
    cursor: pointer;
  }
  .swap:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .swap:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }

  /* ── the face-off ── */
  .versus {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin-top: 16px;
    overflow: hidden;
    border-radius: var(--radius-card, 20px);
    background: linear-gradient(
      100deg,
      color-mix(in srgb, var(--a) 55%, #0b1626) 0 49.6%,
      #ffda55 49.6% 50.4%,
      color-mix(in srgb, var(--b) 55%, #0b1626) 50.4%
    );
    color: #fff;
    isolation: isolate;
  }
  .fighter {
    display: grid;
    justify-items: center;
    align-content: start;
    gap: 4px;
    padding: 18px 10px 18px;
    text-align: center;
    animation: compare-in 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .fighter--b {
    animation-name: compare-in-b;
  }
  .fighter img {
    width: min(100%, 220px);
    height: auto;
    aspect-ratio: 1;
    object-fit: contain;
    filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.45));
  }
  .fighter--b img {
    transform: scaleX(-1);
  }
  .fighter h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(16px, 4.6vw, 26px);
    font-weight: 400;
    line-height: 1.15 !important;
    text-transform: uppercase;
  }
  .fighter h2 a {
    color: #fff;
    text-decoration: none;
  }
  .fighter h2 a:focus-visible {
    outline: 2px solid #ffda55;
    outline-offset: 2px;
  }
  .tier {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    opacity: 0.9;
  }
  .nowrap {
    white-space: nowrap;
  }
  .tier b {
    display: inline-grid;
    place-items: center;
    min-width: 26px;
    height: 22px;
    margin-right: 4px;
    padding: 0 4px;
    border-radius: 6px;
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
    margin: 4px 0 0;
  }
  .types span {
    padding: 1px 10px;
    border-radius: 999px;
    background: var(--type);
    font-size: 12px;
    font-weight: 700;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35);
  }
  .fighter--empty {
    align-content: center;
    min-height: 240px;
  }
  .placeholder {
    display: grid;
    place-items: center;
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.35);
    font-family: var(--font-display);
    font-size: 42px;
    color: #ffda55;
  }
  .fighter--empty p {
    margin: 6px 0 0;
    font-weight: 600;
  }
  .vs {
    position: absolute;
    z-index: 2;
    left: 50%;
    top: 42%;
    translate: -50% -50%;
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #ffda55;
    box-shadow:
      0 0 0 4px #0b1626,
      0 8px 18px rgba(0, 0, 0, 0.4);
    color: #0b1626;
    font-family: var(--font-display);
    font-size: 22px;
    animation: compare-vs 600ms cubic-bezier(0.3, 1.6, 0.5, 1) 240ms both;
  }

  .verdict {
    margin: 16px 0 0;
    font-size: 17px;
    font-weight: 700;
    text-align: center;
  }

  /* ── radar ── */
  .radar svg {
    display: block;
    width: 100%;
    max-width: 380px;
    margin: 8px auto 0;
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

  /* ── butterfly stat rows ── */
  .stats {
    width: 100%;
    margin-top: 12px;
    border-collapse: collapse;
  }
  .stats thead th {
    padding: 0 0 8px;
    font-size: 13px;
    color: var(--muted);
  }
  .stats thead th:first-child {
    text-align: right;
  }
  .stats thead th:last-child {
    text-align: left;
  }
  .stats tbody th {
    width: 84px;
    padding: 6px 4px;
    font-size: 13px;
    text-align: center;
    white-space: nowrap;
  }
  .side {
    width: calc(50% - 42px);
    padding: 6px 0;
  }
  .side--a {
    text-align: right;
  }
  .side .bar {
    display: inline-block;
    vertical-align: middle;
    width: calc(var(--w) * 1% * 0.8);
    max-width: calc(100% - 44px);
    height: 12px;
    border-radius: 6px;
    opacity: 0.45;
    transition: opacity 160ms;
  }
  .side--a .bar {
    background: var(--a);
    margin-left: 8px;
  }
  .side--b .bar {
    background: var(--b);
    margin-right: 8px;
  }
  .num {
    display: inline-block;
    min-width: 32px;
    font-family: var(--font-display);
    font-variant-numeric: tabular-nums;
    vertical-align: middle;
  }
  [data-lead='a'] .side--a .bar,
  [data-lead='b'] .side--b .bar {
    opacity: 1;
  }
  [data-lead='a'] .side--a .num {
    color: var(--a);
  }
  [data-lead='b'] .side--b .num {
    color: var(--b);
  }
  .total th,
  .total td {
    border-top: 2px solid var(--line);
    padding-top: 10px;
  }
  .hint {
    margin: 16px 0 0;
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
  @keyframes compare-grow {
    from {
      transform: scale(0.85);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .fighter,
    .vs,
    .shape {
      animation: none;
    }
  }
`
