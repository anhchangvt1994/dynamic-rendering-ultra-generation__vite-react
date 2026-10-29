import styled from 'styled-components'
export const MovesetStyle = styled.section`
  margin-top: 16px;
  padding: 18px 16px;
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  min-width: 0;
  .eyebrow {
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
  }
  .moves-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 17px;
  }
  h3 {
    font-size: 18px;
    letter-spacing: -0.5px;
    font-weight: 800;
    margin-top: 3px;
  }
  .moves-total {
    font-size: 12px;
    color: var(--muted);
    padding: 5px 9px;
    border-radius: 99px;
    background: var(--canvas);
  }
  .moves-version > span {
    display: block;
    margin-bottom: 7px;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
  }
  .moves-search {
    display: flex;
    align-items: center;
    gap: 9px;
    height: 44px;
    margin-top: 10px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--canvas);
    color: var(--muted);
  }
  .moves-search:focus-within {
    border-color: var(--focus);
  }
  .moves-search > svg {
    flex: none;
  }
  .moves-search input {
    min-width: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    border: 0;
    color: var(--ink);
    font-size: 16px;
  }
  .moves-search input:focus-visible {
    outline: none;
  }
  .moves-search input::placeholder {
    font-size: 12px;
    color: var(--muted);
  }
  .moves-search input::-webkit-search-cancel-button {
    display: none;
  }
  .moves-search button {
    width: 30px;
    height: 36px;
    flex: none;
    display: grid;
    place-items: center;
    padding: 0;
    color: var(--muted);
    border: 0;
    background: transparent;
  }
  .move-methods {
    display: flex;
    gap: 5px;
    margin: 12px -2px;
    padding: 2px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .move-methods::-webkit-scrollbar {
    display: none;
  }
  .move-methods button {
    flex: none;
    min-height: 34px;
    padding: 0 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: white;
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
  }
  .move-methods button[aria-pressed='true'] {
    background: var(--ink);
    border-color: var(--ink);
    color: white;
  }
  .move-methods button:hover:not([aria-pressed='true']) {
    background: var(--canvas);
  }
  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    font-size: 12px;
  }
  th {
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    padding: 8px 0;
    color: var(--muted);
    border-bottom: 1px solid var(--line);
  }
  th:first-child {
    width: 65%;
  }
  th:last-child,
  td:last-child {
    text-align: right;
  }
  td {
    padding: 11px 0;
    border-bottom: 1px solid #edf1f5;
  }
  td:first-child {
    padding-right: 12px;
    overflow-wrap: anywhere;
    font-weight: 500;
  }
  .learning-badge {
    display: inline-block;
    background: var(--canvas);
    border-radius: 6px;
    padding: 3px 7px;
    font-size: 12px;
    font-weight: 600;
  }
  .moves-more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin: 14px 0 0;
    min-height: 42px;
    width: 100%;
    border: 1px solid var(--line);
    background: var(--canvas);
    color: var(--ink);
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
  }
  .moves-more:hover {
    background: var(--mint);
  }
  .moves-more span {
    margin-left: 8px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 400;
  }
  .moves-note {
    color: var(--muted);
    font-size: 11px;
    margin-top: 14px;
    line-height: 1.7 !important;
  }
  .moves-empty {
    padding: 26px 10px;
    text-align: center;
    color: var(--muted);
    font-size: 12px;
    border: 1px dashed var(--line);
    border-radius: 12px;
  }
  .moves-empty button {
    margin-top: 12px;
    min-height: 36px;
    padding: 0 13px;
    color: var(--ink);
    background: var(--mint);
    border: 0;
    border-radius: 8px;
    font-size: 11px;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`
