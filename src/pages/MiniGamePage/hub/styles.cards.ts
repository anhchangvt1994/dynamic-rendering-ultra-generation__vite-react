import { css } from 'styled-components'

// Inner layout of the fixed regions: booths, tickets, stamp card.
export const cardsCss = css`
  .hub-booth-btn {
    width: 100%;
  }

  /* ---- paper tickets ---- */
  .hub-tickets {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    overflow: hidden;
  }
  .hub-stubs {
    display: flex;
    flex: none;
    gap: 4px;
  }
  .hub-stub {
    position: relative;
    width: 32px;
    height: 24px;
    border-radius: 5px;
    background: var(--paper);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.25);
  }
  .hub-stub::before {
    content: '';
    position: absolute;
    inset: 3px auto 3px 9px;
    border-left: 2px dashed rgba(43, 26, 61, 0.35);
  }
  .hub-stub[data-state='wait'] {
    opacity: 0.5;
  }
  .hub-stub[data-state='torn'] {
    opacity: 0.22;
    box-shadow: none;
    transform: translateY(2px) rotate(4deg);
  }
  .hub-stub[data-tear] {
    animation: hub-tear 520ms var(--ease) both;
  }
  @keyframes hub-tear {
    from {
      opacity: 1;
      transform: none;
    }
    40% {
      transform: translateY(-6px) rotate(-8deg);
    }
  }
  .hub-ticket-text {
    min-width: 0;
    font-size: 13px;
    line-height: 16px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  /* ---- stamp strip (quests): paper ---- */
  .sc {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: 28px 64px 36px;
    align-content: space-between;
    gap: 8px;
    height: 100%;
    padding: 10px 14px;
    border-radius: 20px;
    color: var(--ink);
    background:
      radial-gradient(circle at 0 50%, #0a403d 7px, transparent 8px) -7px 0 / 14px 22px repeat-y,
      var(--paper);
    box-shadow: 0 16px 28px rgba(2, 20, 20, 0.45);
    overflow: hidden;
  }
  .sc > * {
    min-width: 0;
    min-height: 0;
  }
  .sc-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    height: 28px;
  }
  .sc h2,
  .sc-err {
    margin: 0;
    min-width: 0;
    font-size: 17px;
    line-height: 28px;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sc-err {
    font-size: 13.5px;
    color: #9b1230;
  }
  .sc-lv {
    flex: none;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    margin: -8px 0;
    padding: 0 6px;
    font-size: 14px;
    font-weight: 800;
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .sc-lv:focus-visible,
  .sc-go:focus-visible,
  .sc-done:focus-visible {
    outline: 3px solid var(--ink);
    outline-offset: 2px;
    border-radius: 10px;
  }
  .sc-rows {
    display: flex;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }
  .sc-rows::-webkit-scrollbar {
    display: none;
  }
  .sc-row {
    flex: 0 0 180px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: 22px 22px;
    align-content: center;
    gap: 4px 8px;
    padding: 6px 8px 6px 12px;
    border-radius: 14px;
    background: rgba(43, 26, 61, 0.07);
    scroll-snap-align: start;
    overflow: hidden;
  }
  .sc-row b {
    grid-column: 1;
    font-size: 14px;
    line-height: 22px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sc-row small {
    grid-column: 1;
    font-size: 12.5px;
    line-height: 22px;
    opacity: 0.85;
    white-space: nowrap;
  }
  .sc-row[data-empty] {
    background: transparent;
    box-shadow: inset 0 0 0 2px rgba(43, 26, 61, 0.12);
  }
  .sc-meter {
    grid-column: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sc-bar {
    flex: 1;
    height: 8px;
    border-radius: 4px;
    background: rgba(43, 26, 61, 0.16);
    overflow: hidden;
  }
  .sc-bar i {
    display: block;
    width: 100%;
    height: 100%;
    background: var(--ink);
    transform-origin: 0 50%;
    transition: transform 300ms var(--ease);
  }
  .sc-go {
    grid-row: 1 / -1;
    grid-column: 2;
    align-self: center;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0 12px;
    border: 0;
    border-radius: 12px;
    font: inherit;
    font-weight: 800;
    color: var(--ink);
    text-decoration: none;
    background: linear-gradient(180deg, #ff9db3, var(--coral));
    cursor: pointer;
  }
  .sc-go:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .sc-stamp {
    grid-row: 1 / -1;
    grid-column: 2;
    align-self: center;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    font-weight: 800;
    color: var(--coral);
    box-shadow: inset 0 0 0 3px var(--coral);
    transform: rotate(-12deg);
  }
  .sc-stamp[data-slam] {
    animation: sc-slam 520ms var(--spring) both;
  }
  @keyframes sc-slam {
    from {
      opacity: 0;
      transform: scale(2.4) rotate(-30deg);
    }
    60% {
      opacity: 1;
      transform: scale(0.88) rotate(-12deg);
    }
  }
  .sc-lock {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 12px;
    border-radius: 14px;
    box-shadow: inset 0 0 0 2px rgba(43, 26, 61, 0.14);
  }
  .sc-lock span {
    font-size: 13.5px;
    line-height: 18px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
  }
  .sc-lock .sc-go {
    grid-row: auto;
    grid-column: auto;
    flex: none;
  }
  .sc-streak {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    padding: 0 2px;
    list-style: none;
  }
  .sc-dot {
    display: grid;
    place-items: center;
    flex: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 800;
    box-shadow: inset 0 0 0 2px rgba(43, 26, 61, 0.28);
  }
  .sc-dot[data-on] {
    color: var(--ink);
    background: var(--coral);
    box-shadow: inset 0 0 0 2px var(--ink);
  }
  .sc-dot[data-big] {
    width: 36px;
    height: 36px;
    font-size: 17px;
  }
  @media (min-width: 640px) {
    .sc {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-rows: 28px 64px;
      column-gap: 20px;
    }
    .sc-head {
      grid-column: 1 / -1;
    }
    .sc-row {
      flex: 1 1 0;
      min-width: 0;
    }
    .sc-streak {
      gap: 8px;
      justify-content: flex-end;
    }
  }
  .sc-gift {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 12px;
    padding: 16px;
    background: rgba(255, 244, 214, 0.96);
    animation: sc-fade 260ms var(--ease) both;
  }
  @keyframes sc-fade {
    from {
      opacity: 0;
    }
  }
  .sc-gift .mg-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .sc-gift .mg-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px 4px 6px;
    border-radius: 999px;
    font-size: 14px;
    background: rgba(43, 26, 61, 0.1);
  }
  .sc-gift .mg-chip img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }
  .sc-gift .mg-cta,
  .sc-gift .sc-done {
    min-height: 44px;
    padding: 0 18px;
    border: 0;
    border-radius: 14px;
    font: inherit;
    font-weight: 800;
    color: var(--ink);
    background: linear-gradient(180deg, #ff9db3, var(--coral));
    cursor: pointer;
  }
  .sc-gift .mg-fly {
    animation: sc-fade 400ms var(--ease) both;
  }

  @media (prefers-reduced-motion: reduce) {
    .sc-bar i {
      transition: none;
    }
    .hub-stub[data-tear],
    .sc-stamp[data-slam],
    .sc-gift,
    .sc-gift .mg-fly {
      animation: none;
    }
  }
`
