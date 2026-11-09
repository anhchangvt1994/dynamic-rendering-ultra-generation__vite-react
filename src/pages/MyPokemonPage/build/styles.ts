import { css } from 'styled-components'

// the build panel and move picker live inside RoomStyle (.rm-* tokens)
export const buildStyle = css`
  .bp-skeleton {
    min-height: 220px;
  }
  .bp-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin-bottom: 8px;
  }
  .bp-head b {
    font-family: var(--font-display), system-ui, sans-serif;
    font-size: 24px;
    font-weight: 400;
  }
  .bp-head small {
    margin-left: auto;
    opacity: 0.75;
  }
  .bp-exp {
    margin-bottom: 14px;
  }
  /* one row per stat: name and value on the left, IV over EV as two
     meters on the right; nothing wraps, at 320px or at any width */
  .bp-stats {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-variant-numeric: tabular-nums;
  }
  .bp-stats li {
    display: grid;
    grid-template-columns: 4.8em 2.4em minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--surface) 70%, transparent);
  }
  .bp-name {
    font-size: 12px;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
  }
  .bp-val {
    font-size: 20px;
    font-weight: 900;
    line-height: 1;
    position: relative;
    text-align: right;
  }
  .bp-stats li[data-up] .bp-val {
    color: #3fbf7a;
  }
  .bp-meters {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  .bp-m {
    position: relative;
    display: grid;
    grid-template-columns: 1.7em minmax(0, 1fr) 2.4ch;
    align-items: center;
    gap: 5px;
    font-size: 10px;
  }
  .bp-m u {
    text-decoration: none;
    font-weight: 800;
    letter-spacing: 0.06em;
    opacity: 0.55;
  }
  .bp-m small {
    text-align: right;
    font-size: 11px;
    font-weight: 700;
    opacity: 0.85;
  }
  .bp-m[data-max] small {
    opacity: 1;
    color: var(--a1);
  }
  .bp-delta {
    position: absolute;
    top: -2px;
    right: 0;
    font-style: normal;
    font-size: 12px;
    font-weight: 900;
    color: #6ee7a0;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    pointer-events: none;
    animation: bp-pop 2.2s ease-out forwards;
  }
  .bp-head .bp-delta {
    position: static;
    margin-left: 8px;
    font-size: 14px;
    display: inline-block;
  }
  .bp-head b {
    position: relative;
  }
  @keyframes bp-pop {
    0% {
      opacity: 0;
      transform: translateY(6px);
    }
    15% {
      opacity: 1;
      transform: translateY(0);
    }
    80% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateY(-4px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bp-delta {
      animation: bp-fade 2.2s steps(1) forwards;
    }
    @keyframes bp-fade {
      0%,
      90% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
  }
  .bp-up,
  .bp-down {
    margin-left: 4px;
    font-size: 9px;
  }
  .bp-up {
    color: #ff6b6b;
  }
  .bp-down {
    color: #4da3ff;
  }
  .bp-bar {
    display: block;
    height: 6px;
    border-radius: 999px;
    background: var(--track);
    overflow: hidden;
  }
  .bp-bar i {
    display: block;
    width: var(--v);
    height: 100%;
    background: var(--a1);
  }
  .bp-m[data-ev] i {
    background: var(--a2);
  }
  .bp-m[data-max] i {
    box-shadow: 0 0 6px var(--a1);
  }
  .bp-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
  }
  .bp-chips li {
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--surface);
    font-size: 12px;
  }
  .bp-chips li[data-shiny] {
    background: var(--a1);
    color: var(--ink);
    font-weight: 800;
  }
  .bp-h {
    display: flex;
    justify-content: space-between;
    margin: 16px 0 8px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.85;
  }
  .bp-slots {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;

    @media screen and (min-width: 375px) {
      grid-template-columns: 1fr 1fr;
    }
  }
  .bp-slot,
  .bp-move {
    --tc: var(--track);
    display: grid;
    gap: 2px;
    width: 100%;
    min-height: 52px;
    padding: 8px 10px 8px 14px;
    border: 0;
    border-radius: 14px;
    color: var(--fg);
    background:
      linear-gradient(var(--tc), var(--tc)) left / 5px 100% no-repeat,
      var(--surface);
    font:
      700 13px/1.2 var(--font-body),
      system-ui,
      sans-serif;
    text-align: left;
    cursor: pointer;
    overflow-wrap: anywhere;
  }
  .bp-slot small,
  .bp-move small {
    font-weight: 500;
    opacity: 0.75;
  }
  .bp-slot[data-empty] {
    opacity: 0.6;
  }
  .bp-slot:focus-visible,
  .bp-move:focus-visible {
    outline: 2px solid var(--a1);
    outline-offset: 2px;
  }
  .bp-search {
    min-height: 44px;
    padding: 8px 14px;
    border: 1.5px solid var(--track);
    border-radius: 12px;
    color: var(--fg);
    background: transparent;
    font:
      600 14px var(--font-body),
      system-ui,
      sans-serif;
  }
  .bp-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .bp-filters button {
    min-height: 36px;
    padding: 4px 12px;
    border: 1.5px solid var(--track);
    border-radius: 999px;
    color: var(--fg);
    background: transparent;
    font:
      700 12px var(--font-body),
      system-ui,
      sans-serif;
    cursor: pointer;
  }
  .bp-filters button[aria-pressed='true'] {
    border-color: var(--a1);
    color: var(--ink);
    background: var(--a1);
  }
  .bp-moves {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 2px;
    max-height: 48dvh;
    overflow-y: auto;
    list-style: none;
    scrollbar-width: none;
  }
  .bp-move[data-locked] {
    opacity: 0.45;
    cursor: default;
  }
  .bp-move[data-current] {
    box-shadow: inset 0 0 0 2px var(--a1);
  }
  .bp-move i {
    display: none;
  }
  .bp-items {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .bp-items li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 10px;
  }
  .bp-pick {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .bp-pick .rm-btn {
    min-height: 36px;
    padding: 4px 10px;
    font-size: 12px;
  }
  .bp-why {
    flex-basis: 100%;
    opacity: 0.7;
    font-size: 12px;
  }
  .bp-awaken {
    margin-top: 14px;
    width: 100%;
  }
  .bp > .bp-why {
    display: block;
    margin-top: 6px;
    text-align: center;
  }
`
