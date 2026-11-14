import styled from 'styled-components'

const INK = '#3b2a52'

export const MapStyle = styled.div`
  --c: #ffd24a;
  --ink: ${INK};
  --paper: #ffffff;
  --pink: #ff7aa8;
  --pop: 4px 4px 0 ${INK};
  position: relative;
  isolation: isolate;
  overflow: hidden;
  height: calc(100dvh - 64px);
  min-height: 460px;
  color: var(--ink);
  background: linear-gradient(#7fd0ff, #ffeaf4);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  font-family: inherit;

  .mp-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    z-index: 0;
    cursor: grab;
    touch-action: none;
  }
  .mp-canvas:active {
    cursor: grabbing;
  }

  /* chunky sticker buttons */
  .mp-btn,
  .mp-dock button,
  .mp-search input,
  .mp-search li button {
    font: inherit;
    color: var(--ink);
    background: var(--paper);
    border: 3px solid var(--ink);
    box-shadow: 0 3px 0 var(--ink);
  }
  .mp-round {
    width: 44px;
    height: 44px;
    flex: none;
    display: grid;
    place-items: center;
    padding: 0;
    border-radius: 50%;
    font-size: 20px;
    font-weight: 800;
    line-height: 1;
    cursor: pointer;
    transition: transform 0.15s cubic-bezier(0.3, 1.6, 0.4, 1), background 0.15s, box-shadow 0.15s;
  }
  .mp-round:hover {
    transform: translateY(-2px) rotate(-6deg) scale(1.06);
  }
  .mp-round:active {
    transform: translateY(3px);
    box-shadow: 0 0 0 var(--ink);
  }
  .mp-round[aria-pressed='true'] {
    background: var(--c);
  }
  .mp-round[aria-pressed='false'] {
    background: #e9e4f2;
    opacity: 0.85;
  }
  .mp-reset {
    background: var(--pink);
    animation: mp-pop 0.4s cubic-bezier(0.3, 1.8, 0.4, 1);
  }

  .mp-top {
    position: absolute;
    z-index: 4;
    inset: 10px 10px auto;
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: none;
    justify-content: space-between;
    > * {
      pointer-events: auto;
    }
  }
  .mp-title {
    flex: 0 1 auto;
    min-width: 0;
    max-width: min(420px, calc(100% - 110px));
    padding: 6px 14px 7px;
    border: 3px solid var(--ink);
    border-radius: 18px;
    background: var(--paper);
    box-shadow: 0 3px 0 var(--ink);
    pointer-events: none;
    h1 {
      margin: 0;
      font-size: clamp(17px, 5.2vw, 26px);
      line-height: 1.1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    p {
      margin: 1px 0 0;
      font-size: 12px;
      font-weight: 700;
      opacity: 0.62;
      font-variant-numeric: tabular-nums;
    }
  }
  .mp-search {
    position: absolute;
    z-index: 5;
    top: 74px;
    left: 10px;
    right: 10px;
    max-width: 440px;
    margin-left: auto;
    input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 16px;
      border-radius: 18px;
      outline: none;
      font-size: 16px;
      font-weight: 700;
      &:focus {
        border-color: var(--pink);
      }
    }
    ul {
      margin: 8px 0 0;
      padding: 6px;
      list-style: none;
      border: 3px solid var(--ink);
      border-radius: 18px;
      background: var(--paper);
      box-shadow: 0 3px 0 var(--ink);
    }
    li button {
      width: 100%;
      min-height: 44px;
      text-align: left;
      padding: 8px 12px;
      border: 0;
      border-radius: 12px;
      box-shadow: none;
      cursor: pointer;
      font-weight: 700;
      &:hover,
      &:focus-visible {
        background: #fff1c4;
      }
    }
    b {
      display: inline-block;
      min-width: 62px;
      font-size: 11px;
      color: var(--pink);
    }
  }
  .mp-side {
    position: absolute;
    z-index: 3;
    right: 10px;
    top: 74px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .mp-dock {
    position: absolute;
    z-index: 3;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    gap: 8px;
    padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
    overflow-x: auto;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
    touch-action: pan-x;
    &::-webkit-scrollbar {
      display: none;
    }
    button {
      flex: none;
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 6px 14px 6px 8px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      transition: transform 0.18s cubic-bezier(0.3, 1.6, 0.4, 1), background 0.15s;
    }
    i {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 3px solid var(--ink);
      background: linear-gradient(135deg, var(--g) 50%, var(--c) 50%);
    }
    button:hover {
      transform: translateY(-3px) rotate(-2deg);
    }
    button[aria-current='true'] {
      background: var(--c);
      transform: translateY(-4px);
    }
    @media (min-width: 900px) {
      justify-content: center;
    }
  }

  .mp-enter {
    position: absolute;
    z-index: 3;
    left: 50%;
    bottom: calc(76px + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    min-height: 48px;
    padding: 10px 26px;
    border: 3px solid var(--ink);
    border-radius: 999px;
    background: var(--c);
    color: var(--ink);
    font: inherit;
    font-size: 16px;
    font-weight: 800;
    box-shadow: 0 4px 0 var(--ink);
    cursor: pointer;
    animation: mp-bob 1.6s ease-in-out infinite;
    transition: background 0.15s;
    &:hover {
      background: var(--pink);
    }
    &:active {
      box-shadow: 0 0 0 var(--ink);
      margin-bottom: -4px;
    }
  }
  @keyframes mp-bob {
    50% {
      transform: translateX(-50%) translateY(-5px);
    }
  }
  .mp-tip {
    position: absolute;
    z-index: 4;
    transform: translateX(-50%);
    max-width: 220px;
    padding: 7px 13px 8px;
    border: 3px solid var(--ink);
    border-radius: 16px;
    background: var(--paper);
    box-shadow: 0 3px 0 var(--ink), 0 0 0 5px color-mix(in srgb, var(--c) 70%, transparent);
    text-align: center;
    pointer-events: none;
    animation: mp-pop 0.28s cubic-bezier(0.3, 1.8, 0.4, 1);
    strong {
      display: block;
      font-size: 15px;
      line-height: 1.15;
    }
    span {
      display: block;
      font-size: 12px;
      font-weight: 700;
      opacity: 0.65;
    }
    em {
      display: block;
      margin-top: 3px;
      font-size: 11px;
      font-style: normal;
      font-weight: 800;
      color: var(--pink);
    }
    &::after {
      content: '';
      position: absolute;
      left: 50%;
      bottom: -11px;
      width: 14px;
      height: 14px;
      background: var(--paper);
      border: solid var(--ink);
      border-width: 0 3px 3px 0;
      transform: translateX(-50%) rotate(45deg);
    }
  }

  .mp-card {
    position: absolute;
    z-index: 6;
    left: 0;
    right: 0;
    bottom: 0;
    max-width: 520px;
    margin: 0 auto;
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 18px 18px calc(20px + env(safe-area-inset-bottom));
    border: 3px solid var(--ink);
    border-bottom: 0;
    border-radius: 28px 28px 0 0;
    background: var(--paper);
    box-shadow: 0 -4px 0 var(--c), 0 -6px 0 var(--ink);
    outline: none;
    animation: mp-sheet 0.36s cubic-bezier(0.2, 1.1, 0.3, 1);
    .mp-grip {
      position: absolute;
      top: 7px;
      left: 50%;
      width: 44px;
      height: 5px;
      border-radius: 5px;
      background: var(--ink);
      opacity: 0.25;
      transform: translateX(-50%);
    }
    img {
      width: 72px;
      height: 72px;
      flex: none;
      padding: 4px;
      border: 3px solid var(--ink);
      border-radius: 20px;
      background: color-mix(in srgb, var(--c) 40%, white);
      image-rendering: pixelated;
    }
    strong {
      display: block;
      font-size: 20px;
      line-height: 1.15;
    }
    span {
      display: block;
      font-size: 13px;
      font-weight: 700;
      opacity: 0.65;
    }
    p {
      margin: 8px 0 4px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    i {
      padding: 3px 10px;
      border: 2px solid var(--ink);
      border-radius: 999px;
      background: color-mix(in srgb, var(--c) 45%, white);
      font-size: 12px;
      font-style: normal;
      font-weight: 800;
    }
    em {
      font-size: 11px;
      font-style: normal;
      font-weight: 700;
      opacity: 0.5;
    }
    .mp-x {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 40px;
      height: 40px;
      border: 3px solid var(--ink);
      border-radius: 50%;
      background: var(--paper);
      color: var(--ink);
      font-size: 22px;
      font-weight: 800;
      line-height: 1;
      cursor: pointer;
    }
  }

  .mp-veil {
    position: absolute;
    inset: 0;
    z-index: 7;
    display: grid;
    place-items: center;
    background: linear-gradient(#7fd0ff, #ffeaf4);
    transition: opacity 0.6s;
    pointer-events: none;
    &[data-gone='true'] {
      opacity: 0;
    }
    div {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 4px solid var(--ink);
      background: linear-gradient(#ff5a6e 50%, #fff 50%);
      animation: mp-spin 0.9s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    }
  }
  .mp-fallback {
    position: absolute;
    inset: 74px 0 70px;
    z-index: 1;
    overflow: auto;
    padding: 0 12px;
    section {
      margin: 0 0 12px;
      padding: 12px 14px;
      border: 3px solid var(--ink);
      border-radius: 20px;
      background: var(--paper);
      box-shadow: 0 3px 0 var(--ink);
    }
    h3 {
      margin: 0 0 6px;
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    button {
      margin: 2px 4px 2px 0;
      min-height: 36px;
      padding: 4px 12px;
      border: 2px solid var(--ink);
      border-radius: 999px;
      background: color-mix(in srgb, var(--c) 40%, white);
      color: var(--ink);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
  }
  .mp-note {
    margin: 0 0 12px;
    font-size: 13px;
    font-weight: 700;
  }

  @keyframes mp-pop {
    from {
      opacity: 0;
      transform: translateX(-50%) scale(0.6);
    }
  }
  .mp-reset {
    animation-name: mp-pop-round;
  }
  @keyframes mp-pop-round {
    from {
      opacity: 0;
      transform: scale(0.4);
    }
  }
  @keyframes mp-sheet {
    from {
      transform: translateY(100%);
    }
  }
  @keyframes mp-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* tiny phones (320px): tighter chrome, same 44px touch targets */
  @media (max-width: 380px) {
    .mp-top {
      inset: 8px 8px auto;
      gap: 6px;
    }
    .mp-title {
      padding: 4px 10px 5px;
      border-radius: 14px;
    }
    .mp-side {
      right: 8px;
      top: 64px;
      gap: 8px;
    }
    .mp-search {
      top: 64px;
      left: 8px;
      right: 60px;
    }
    .mp-dock button {
      padding-right: 11px;
      font-size: 13px;
    }
    .mp-card {
      padding: 16px 14px calc(18px + env(safe-area-inset-bottom));
      gap: 10px;
      strong {
        font-size: 18px;
      }
      img {
        width: 60px;
        height: 60px;
      }
    }
  }
  @media (max-height: 520px) and (orientation: landscape) {
    .mp-card {
      left: auto;
      right: 8px;
      bottom: 8px;
      max-width: 360px;
      border-bottom: 3px solid var(--ink);
      border-radius: 24px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .mp-card,
    .mp-tip,
    .mp-enter,
    .mp-reset,
    .mp-veil div,
    .mp-round {
      animation: none;
      transition: none;
    }
  }
`
