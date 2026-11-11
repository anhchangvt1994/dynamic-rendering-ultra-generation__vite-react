import { css } from 'styled-components'

// Candy Rush board: 6 columns of berries, tap two neighbours or swipe.
export const candyCss = css`
  .mg-candy {
    padding: 8px;
  }
  .mg-candy-head {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    padding: 2px 4px 6px;
  }
  .mg-candy-head b {
    font-variant-numeric: tabular-nums;
  }
  .mg-candy-bar {
    display: block;
    height: 8px;
    margin: 0 4px 10px;
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.14);
    overflow: hidden;
  }
  .mg-candy-bar i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
    transition: width 300ms ease;
  }
  .mg-candy-hint {
    margin: 8px 4px 0;
    font-size: 13px;
    opacity: 0.8;
    text-align: center;
  }
  .mg-candy-grid {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .mg-candy-cell {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 1;
    min-height: 44px;
    padding: 0;
    border: 0;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    transition: background 160ms ease, transform 160ms ease;
  }
  .mg-candy-cell:disabled {
    cursor: default;
  }
  .mg-candy-cell img {
    width: 78%;
    height: 78%;
    object-fit: contain;
    image-rendering: pixelated;
    pointer-events: none;
  }
  .mg-candy-cell:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .mg-candy-cell[data-sel] {
    background: var(--glow, rgba(255, 255, 255, 0.28));
    transform: scale(1.08);
    box-shadow: 0 0 0 2px var(--accent);
  }
  .mg-candy-cell[data-pop] img {
    animation: mg-candy-pop ${240}ms ease-in forwards;
  }
  .mg-candy-cell[data-drop] img {
    animation: mg-candy-drop ${280}ms cubic-bezier(0.3, 0.9, 0.4, 1);
  }
  .mg-candy-cell[data-miss] {
    animation: mg-candy-shake 380ms ease;
    background: rgba(255, 90, 90, 0.3);
  }
  @keyframes mg-candy-pop {
    to {
      transform: scale(0);
      opacity: 0;
    }
  }
  @keyframes mg-candy-drop {
    from {
      transform: translateY(-140%);
    }
  }
  @keyframes mg-candy-shake {
    25% {
      transform: translateX(-4px);
    }
    75% {
      transform: translateX(4px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .mg-candy-cell,
    .mg-candy-bar i {
      transition: none;
    }
    .mg-candy-cell[data-pop] img {
      animation: none;
      opacity: 0.2;
    }
    .mg-candy-cell[data-drop] img {
      animation: none;
    }
    .mg-candy-cell[data-miss] {
      animation: none;
    }
    .mg-candy-cell[data-sel] {
      transform: none;
    }
  }
`
