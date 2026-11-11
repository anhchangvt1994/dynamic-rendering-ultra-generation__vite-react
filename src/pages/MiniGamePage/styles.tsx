import styled from 'styled-components'
import { playCss } from './styles.play'
import { candyCss } from './styles.candy'

// colours come from the chosen Pokémon: --hue, --accent, --deep, --glow
export const SheetStyle = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  align-items: end;
  justify-items: center;
  color: #fff;

  .mg-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(4, 10, 22, 0.66);
    backdrop-filter: blur(3px);
  }
  .mg-panel {
    position: relative;
    width: min(560px, 100%);
    max-height: min(92dvh, 860px);
    display: flex;
    flex-direction: column;
    border-radius: 28px 28px 0 0;
    background:
      radial-gradient(90% 40% at 50% 0, var(--glow, rgba(255, 207, 90, 0.4)), transparent 70%),
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.035) 0 2px, transparent 2px 5px),
      linear-gradient(180deg, color-mix(in srgb, var(--deep, #0a403d) 70%, #0f5d57), var(--deep, #0a403d));
    box-shadow:
      0 -12px 48px rgba(0, 0, 0, 0.5),
      0 0 36px var(--glow, rgba(255, 207, 90, 0.25)),
      inset 0 0 0 2px var(--accent, #ffcf5a);
    overflow: hidden;
    transition: background 400ms ease;
  }
  .mg-panel::before {
    content: '';
    position: absolute;
    inset: 7px;
    z-index: 0;
    border: 2px dashed rgba(255, 244, 214, 0.28);
    border-radius: inherit;
    pointer-events: none;
  }
  .mg-panel > * {
    position: relative;
    z-index: 1;
  }
  .mg-bulbs {
    flex: none;
    height: 14px;
    margin: 6px 18px 0;
    background: radial-gradient(circle, #ffe9a8 0 3px, transparent 4px) 0 50% / 22px 14px repeat-x;
    opacity: 0.85;
    filter: drop-shadow(0 0 4px rgba(255, 207, 90, 0.8));
  }
  @media (min-width: 640px) {
    align-items: center;
    .mg-panel {
      border-radius: 28px;
    }
  }
  .mg-grab {
    flex: none;
    width: 44px;
    height: 5px;
    margin: 4px auto 0;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.35);
  }
  .mg-head {
    flex: none;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px 6px;
  }
  .mg-head h2 {
    flex: 1;
    margin: 0;
    font-size: 19px;
  }
  .mg-x {
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 50%;
    font-size: 20px;
    color: inherit;
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
  }
  .mg-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 4px 16px calc(20px + env(safe-area-inset-bottom));
  }
  .mg-sub {
    margin: 0 0 14px;
    opacity: 0.8;
    font-size: 14px;
  }
  .mg-list {
    display: grid;
    gap: 10px;
    padding: 0;
    margin: 0;
    list-style: none;
  }
  .mg-pick {
    display: grid;
    grid-template-columns: 64px 1fr;
    gap: 12px;
    align-items: center;
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border: 0;
    border-radius: 18px;
    text-align: left;
    color: inherit;
    font: inherit;
    background: linear-gradient(160deg, rgba(255, 244, 214, 0.14), rgba(255, 244, 214, 0.05));
    box-shadow: inset 0 0 0 1.5px rgba(255, 244, 214, 0.28);
    cursor: pointer;
    transition: transform 140ms ease, box-shadow 140ms ease;
  }
  .mg-pick:hover:not(:disabled),
  .mg-pick:focus-visible {
    transform: translateY(-2px);
    box-shadow: inset 0 0 0 2px var(--accent);
    outline: none;
  }
  .mg-pick:disabled {
    opacity: 0.62;
    cursor: not-allowed;
    background:
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.07) 0 6px, transparent 6px 12px),
      rgba(0, 0, 0, 0.25);
  }
  .mg-pick:disabled .ind-art {
    filter: grayscale(1) brightness(0.8);
  }
  .mg-tiers .mg-pick {
    position: relative;
    grid-template-columns: 1fr;
    gap: 2px;
    padding: 12px 16px 12px 22px;
    border-radius: 14px;
    color: #2b1a3d;
    background: #fff4d6;
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.25);
    -webkit-mask: radial-gradient(circle 8px at 0 50%, transparent 97%, #000) left / 51% 100% no-repeat,
      radial-gradient(circle 8px at 100% 50%, transparent 97%, #000) right / 51% 100% no-repeat;
    mask: radial-gradient(circle 8px at 0 50%, transparent 97%, #000) left / 51% 100% no-repeat,
      radial-gradient(circle 8px at 100% 50%, transparent 97%, #000) right / 51% 100% no-repeat;
  }
  .mg-tiers .mg-pick:hover:not(:disabled),
  .mg-tiers .mg-pick:focus-visible {
    box-shadow: 0 3px 0 var(--accent), inset 0 0 0 2px var(--accent);
  }
  .mg-pick .ind-art {
    justify-self: center;
  }
  .mg-pick b {
    display: block;
    font-size: 16px;
  }
  .mg-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin-top: 3px;
    font-size: 13px;
    opacity: 0.85;
  }
  .mg-hunger {
    display: block;
    height: 6px;
    margin-top: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.14);
    overflow: hidden;
  }
  .mg-hunger i {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--accent);
  }
  .mg-why {
    margin-top: 4px;
    font-size: 13px;
    color: #ffd27a;
  }
  .mg-why a {
    color: inherit;
  }
  .mg-level {
    display: grid;
    gap: 4px;
  }
  .mg-level b {
    font-size: 17px;
  }
  .mg-cta {
    display: block;
    width: 100%;
    min-height: 48px;
    margin-top: 14px;
    padding: 12px 18px;
    border: 0;
    border-radius: 16px;
    font: inherit;
    font-weight: 700;
    color: #0b1a2f;
    background: var(--accent);
    cursor: pointer;
  }
  .mg-cta[data-quiet] {
    color: inherit;
    background: rgba(255, 255, 255, 0.12);
  }
  .mg-count {
    display: grid;
    place-items: center;
    min-height: 260px;
    font-size: 120px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--accent, #ffcf5a);
    text-shadow: 0 0 40px var(--glow);
  }
  .mg-count::before {
    content: '';
    grid-area: 1 / 1;
    width: 190px;
    height: 190px;
    border-radius: 50%;
    border: 4px solid var(--accent, #ffcf5a);
    opacity: 0.5;
    animation: mg-ringpulse 1s var(--ease, ease-out) infinite;
  }
  .mg-count > * {
    grid-area: 1 / 1;
  }
  @keyframes mg-ringpulse {
    from {
      transform: scale(0.7);
      opacity: 0.8;
    }
    to {
      transform: scale(1.15);
      opacity: 0;
    }
  }
  .mg-error {
    margin: 10px 0 0;
    padding: 10px 12px;
    border-radius: 12px;
    font-size: 14px;
    background: rgba(255, 90, 90, 0.2);
  }

  .mg-stage {
    position: relative;
    padding: 10px;
    border-radius: 22px;
  }
  .mg-ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
  }
  .mg-ring rect {
    fill: none;
    stroke: var(--accent);
    stroke-width: 4;
    stroke-linecap: round;
    transition: stroke 300ms ease;
  }
  .mg-ring rect[data-track] {
    stroke: rgba(255, 255, 255, 0.12);
  }
  .mg-ring[data-low] rect:not([data-track]) {
    stroke: #ff6b5e;
  }
  .mg-time {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: fit-content;
    min-width: 60%;
    gap: 16px;
    margin: 0 0 12px;
    padding: 6px 16px;
    border-radius: 999px;
    font-variant-numeric: tabular-nums;
    font-size: 14px;
    background: rgba(8, 20, 30, 0.55);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
    backdrop-filter: blur(4px);
  }
  .mg-time strong {
    font-size: 18px;
  }
  .mg-time[data-low] strong {
    color: #ff8f84;
  }
  .mg-mate {
    position: absolute;
    right: 56px;
    top: -42px;
    width: 52px;
    height: 52px;
    pointer-events: none;
    z-index: 2;
  }
  .mg-mate[data-mood='cheer'] {
    animation: mg-hop 600ms ease;
  }
  .mg-mate[data-mood='miss'] {
    transform: rotate(-12deg);
    transition: transform 200ms ease;
  }
  .mg-mate[data-mood='doze'] {
    opacity: 0.8;
    filter: saturate(0.6);
  }
  .mg-mate-bubble {
    position: absolute;
    top: -6px;
    left: -6px;
    font-size: 20px;
  }
  @keyframes mg-hop {
    40% {
      transform: translateY(-18px);
    }
  }

  .mg-board {
    display: grid;
    gap: 8px;
    padding: 8px;
    margin: 0;
    list-style: none;
  }
  .mg-card {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 3 / 4;
    padding: 0;
    border: 0;
    border-radius: 12px;
    background: none;
    perspective: 600px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .mg-card:disabled {
    cursor: default;
  }
  .mg-card:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .mg-flip {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
    transition: transform 360ms cubic-bezier(0.3, 0.9, 0.3, 1);
  }
  .mg-card[data-up] .mg-flip,
  .mg-card[data-spin] .mg-flip {
    transform: rotateY(180deg);
  }
  .mg-card[data-spin]:not([data-up]) .mg-flip {
    transform: rotateY(90deg);
  }
  .mg-face,
  .mg-back {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    border-radius: 12px;
    backface-visibility: hidden;
    overflow: hidden;
  }
  .mg-back {
    background:
      radial-gradient(circle at 50% 50%, var(--accent) 0 14%, transparent 15%),
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0 6px, transparent 6px 12px),
      hsl(var(--hue, 38) 45% 24%);
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.2);
  }
  .mg-face {
    transform: rotateY(180deg);
    background: #f4f6fb;
    box-shadow: inset 0 0 0 2px var(--accent);
  }
  .mg-face img {
    width: 92%;
    height: 92%;
    object-fit: contain;
  }
  .mg-card[data-matched] .mg-face {
    background: hsl(var(--hue, 38) 90% 88%);
    box-shadow:
      inset 0 0 0 3px var(--accent),
      0 0 16px var(--glow);
  }
  .mg-card[data-miss] .mg-face {
    box-shadow: inset 0 0 0 3px #ff6b5e;
  }

  .mg-result {
    display: grid;
    gap: 12px;
    justify-items: center;
    text-align: center;
  }
  .mg-result {
    position: relative;
  }
  .mg-result h3 {
    margin: 0;
    font-size: 26px;
    letter-spacing: -0.01em;
  }
  .mg-result:not([data-won]) {
    filter: saturate(0.75);
  }
  .mg-stamp {
    display: grid;
    place-items: center;
    padding: 6px 18px;
    border-radius: 12px;
    font-size: 20px;
    font-weight: 800;
    color: var(--accent, #ffcf5a);
    box-shadow: inset 0 0 0 3px var(--accent, #ffcf5a);
    transform: rotate(-8deg);
    animation: mg-slam 520ms var(--spring, cubic-bezier(0.3, 1.4, 0.4, 1)) both;
  }
  @keyframes mg-slam {
    from {
      opacity: 0;
      transform: scale(2.4) rotate(-24deg);
    }
    60% {
      opacity: 1;
      transform: scale(0.9) rotate(-8deg);
    }
  }
  .mg-confetti {
    position: absolute;
    inset: -60px 0 auto;
    height: 0;
    pointer-events: none;
    z-index: 4;
  }
  .mg-confetti i {
    position: absolute;
    top: 0;
    border-radius: 1px;
    opacity: 0;
    animation: mg-confetti 1400ms ease-in both;
  }
  @keyframes mg-confetti {
    from {
      opacity: 1;
      transform: translateY(0) rotate(0);
    }
    to {
      opacity: 0;
      transform: translateY(420px) rotate(var(--rot, 180deg));
    }
  }
  .mg-bar {
    width: 100%;
    height: 12px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.14);
    overflow: hidden;
  }
  .mg-bar i {
    display: block;
    height: 100%;
    border-radius: 6px;
    background: var(--accent);
    transition: width 900ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .mg-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    padding: 0;
    margin: 0;
    list-style: none;
  }
  .mg-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.12);
  }
  .mg-chip img {
    width: 28px;
    height: 28px;
    image-rendering: pixelated;
  }
  .mg-levelup {
    padding: 8px 16px;
    border-radius: 999px;
    font-weight: 700;
    color: #0b1a2f;
    background: var(--accent);
    animation: mg-pop 500ms ease both;
  }
  @keyframes mg-pop {
    from {
      transform: scale(0.6);
      opacity: 0;
    }
  }
  .mg-fly {
    animation: mg-fly 900ms ease both;
  }
  @keyframes mg-fly {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
  }
  .mg-confirm {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: grid;
    place-content: center;
    gap: 10px;
    padding: 24px;
    border-radius: inherit;
    text-align: center;
    background: rgba(4, 10, 22, 0.88);
  }

  @media (prefers-reduced-motion: reduce) {
    .mg-flip,
    .mg-bar i {
      transition: none;
    }
    .mg-card:not([data-up]):not([data-spin]) .mg-face {
      display: none;
    }
    .mg-card[data-up] .mg-flip,
    .mg-card[data-spin] .mg-flip,
    .mg-card[data-spin]:not([data-up]) .mg-flip {
      transform: none;
    }
    .mg-card[data-up] .mg-back,
    .mg-card[data-spin] .mg-back {
      display: none;
    }
    .mg-face {
      transform: none;
    }
    .mg-mate[data-mood],
    .mg-levelup,
    .mg-stamp,
    .mg-count::before,
    .mg-fly {
      animation: none;
    }
  }

  .tr-avatars {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tr-avatar {
    display: grid;
    justify-items: center;
    gap: 4px;
    width: 100%;
    min-height: 44px;
    padding: 10px 6px;
    border: 2px solid transparent;
    border-radius: 16px;
    font: inherit;
    color: inherit;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
  }
  .tr-avatar[aria-pressed='true'] {
    border-color: var(--accent, #ff8fa9);
  }
  .tr-avatar[aria-disabled] {
    opacity: 0.75;
  }
  .tr-avatar small {
    font-size: 11px;
    opacity: 0.8;
    text-align: center;
  }
  @media (max-height: 480px) {
    .mg-panel {
      max-height: 100dvh;
      border-radius: 18px 18px 0 0;
    }
    .mg-body {
      padding-bottom: 10px;
    }
    .mg-count {
      min-height: 140px;
      font-size: 80px;
    }
    .mg-bulbs {
      display: none;
    }
  }
  ${playCss}
  ${candyCss}
`
