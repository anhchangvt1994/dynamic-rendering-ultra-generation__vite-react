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
  .bp-stats {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .bp-stats th,
  .bp-stats td {
    padding: 5px 4px;
    text-align: left;
    font-weight: 600;
  }
  .bp-stats thead th {
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    opacity: 0.6;
  }
  .bp-stats td:first-of-type {
    font-weight: 800;
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
    display: inline-block;
    width: min(64px, 14vw);
    height: 6px;
    margin-right: 6px;
    border-radius: 999px;
    background: var(--track);
    vertical-align: middle;
    overflow: hidden;
  }
  .bp-bar i {
    display: block;
    width: var(--v);
    height: 100%;
    background: var(--a1);
  }
  .bp-bar[data-ev] i {
    background: var(--a2);
  }
  .bp-stats small {
    opacity: 0.75;
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
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
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
