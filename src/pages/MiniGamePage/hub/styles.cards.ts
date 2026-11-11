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

  /* ---- stamp card (quests): paper ---- */
  .sc {
    position: relative;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto auto;
    gap: 8px;
    height: 100%;
    padding: 14px;
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
  .sc h2 {
    margin: 0;
    font-size: 19px;
    line-height: 26px;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sc-rows {
    display: grid;
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .sc-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 4px 10px;
    align-items: center;
    padding: 8px 10px;
    border-radius: 14px;
    background: rgba(43, 26, 61, 0.07);
    overflow: hidden;
  }
  .sc-row b {
    font-size: 15px;
    line-height: 18px;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  .sc-row small {
    grid-column: 1;
    font-size: 12.5px;
    line-height: 16px;
    opacity: 0.8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sc-row[data-empty] {
    background: transparent;
    box-shadow: inset 0 0 0 2px rgba(43, 26, 61, 0.12);
    border-style: dashed;
  }
  .sc-bar {
    grid-column: 1;
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
    min-height: 44px;
    padding: 0 14px;
    border: 0;
    border-radius: 12px;
    font: inherit;
    font-weight: 800;
    color: var(--ink);
    background: linear-gradient(180deg, #ff9db3, var(--coral));
    cursor: pointer;
  }
  .sc-go:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .sc-go:focus-visible,
  .sc-done:focus-visible {
    outline: 3px solid var(--ink);
    outline-offset: 2px;
  }
  .sc-stamp {
    grid-row: 1 / -1;
    grid-column: 2;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
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
    grid-row: 2;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 6px;
    padding: 12px;
    text-align: center;
    border-radius: 14px;
    box-shadow: inset 0 0 0 2px rgba(43, 26, 61, 0.14);
  }
  .sc-lock b {
    font-size: 16px;
  }
  .sc-lock span {
    font-size: 13px;
    line-height: 18px;
    opacity: 0.8;
  }
  .sc-streak {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    padding: 0 2px;
    list-style: none;
    height: 36px;
  }
  .sc-dot {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 800;
    box-shadow: inset 0 0 0 2px rgba(43, 26, 61, 0.28);
    border: 0;
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
  .sc-note {
    margin: 0;
    height: 36px;
    font-size: 12.5px;
    line-height: 18px;
    opacity: 0.85;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  .sc-note[data-error] {
    opacity: 1;
    font-weight: 700;
    color: #9b1230;
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
