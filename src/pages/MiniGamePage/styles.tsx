import styled from 'styled-components'
import { arcadeCss } from './styles.arcade'
import { candyCss } from './styles.candy'
import { playCss } from './styles.play'

// colours come from the chosen Pokémon: --hue, --accent, --deep, --glow
export const SheetStyle = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  align-items: end;
  justify-items: center;
  color: #fff;

  /* the stage behind every sheet: tone-coloured aurora, sweeping light beams, twinkling stars */
  .mg-backdrop {
    --bd-a: var(--accent, #ffcf5a);
    --bd-d: var(--deep, #14103a);
    --bd-g: var(--glow, hsl(275 100% 66% / 0.42));
    position: absolute;
    inset: 0;
    overflow: hidden;
    isolation: isolate;
    background:
      radial-gradient(
        70% 45% at 50% 108%,
        color-mix(in srgb, var(--bd-a) 45%, transparent),
        transparent 72%
      ),
      radial-gradient(90% 60% at 50% 30%, var(--bd-g), transparent 78%),
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--bd-d) 70%, #05030f),
        color-mix(in srgb, var(--bd-d) 92%, #000)
      );
    backdrop-filter: blur(6px);
    animation: mg-bd-in 360ms ease-out;
  }
  .mg-backdrop::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 46%;
    width: 190vmax;
    height: 190vmax;
    margin: -95vmax 0 0 -95vmax;
    z-index: -2;
    background: repeating-conic-gradient(
      from 0deg,
      color-mix(in srgb, var(--bd-a) 30%, transparent) 0 5deg,
      transparent 5deg 17deg,
      color-mix(in srgb, var(--bd-g) 80%, transparent) 17deg 20deg,
      transparent 20deg 36deg
    );
    -webkit-mask: radial-gradient(circle, #000 4%, transparent 38%);
    mask: radial-gradient(circle, #000 4%, transparent 38%);
    mix-blend-mode: screen;
    animation: mg-bd-spin 70s linear infinite;
  }
  .mg-backdrop::after {
    content: '';
    position: absolute;
    inset: -20%;
    z-index: -1;
    background:
      radial-gradient(
        40% 30% at 20% 30%,
        color-mix(in srgb, var(--bd-a) 55%, transparent),
        transparent 70%
      ),
      radial-gradient(36% 28% at 80% 22%, var(--bd-g), transparent 70%),
      radial-gradient(
        44% 30% at 62% 78%,
        color-mix(in srgb, var(--bd-a) 35%, hsl(190 100% 60% / 0.4)),
        transparent 72%
      );
    filter: blur(28px);
    mix-blend-mode: screen;
    animation: mg-bd-drift 16s ease-in-out infinite alternate;
  }
  .mg-bd-stars {
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(2px 2px at 8% 14%, #fff 45%, transparent 55%),
      radial-gradient(3px 3px at 22% 72%, #ffe9a8 45%, transparent 55%),
      radial-gradient(2px 2px at 35% 28%, #fff 45%, transparent 55%),
      radial-gradient(2.5px 2.5px at 51% 88%, #cfe4ff 45%, transparent 55%),
      radial-gradient(2px 2px at 64% 12%, #fff 45%, transparent 55%),
      radial-gradient(3px 3px at 77% 58%, #ffe9a8 45%, transparent 55%),
      radial-gradient(2px 2px at 90% 30%, #fff 45%, transparent 55%),
      radial-gradient(2.5px 2.5px at 94% 84%, #fff 45%, transparent 55%),
      radial-gradient(1.6px 1.6px at 15% 45%, #cfe4ff 45%, transparent 55%),
      radial-gradient(1.6px 1.6px at 70% 40%, #fff 45%, transparent 55%);
    animation: mg-bd-twinkle 3.4s ease-in-out infinite alternate;
  }
  .mg-bd-stars + .mg-bd-stars {
    transform: translate(3.5%, 2.5%) scale(1.06);
    animation-duration: 5.1s;
    animation-delay: -1.7s;
  }
  .mg-bd-shoot {
    position: absolute;
    top: 8%;
    left: -20%;
    width: 140px;
    height: 2px;
    z-index: -1;
    background: linear-gradient(90deg, transparent, #fff);
    filter: drop-shadow(0 0 6px var(--bd-a));
    transform: rotate(24deg);
    opacity: 0;
    animation: mg-bd-shoot 7s ease-in 1.2s infinite;
  }
  @keyframes mg-bd-in {
    from {
      opacity: 0;
    }
  }
  @keyframes mg-bd-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes mg-bd-drift {
    from {
      transform: translate(-5%, -3%) scale(1);
    }
    to {
      transform: translate(5%, 4%) scale(1.15);
    }
  }
  @keyframes mg-bd-twinkle {
    from {
      opacity: 0.35;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes mg-bd-shoot {
    0% {
      opacity: 0;
      translate: 0 0;
    }
    4% {
      opacity: 1;
    }
    14%,
    100% {
      opacity: 0;
      translate: 120vw 55vh;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .mg-backdrop,
    .mg-backdrop::before,
    .mg-backdrop::after,
    .mg-bd-stars,
    .mg-bd-shoot {
      animation: none;
    }
    .mg-bd-shoot {
      display: none;
    }
  }
  .mg-panel {
    position: relative;
    width: min(560px, 100%);
    max-height: min(92dvh, 860px);
    display: flex;
    padding: 16px;
    flex-direction: column;
    border-radius: 28px 28px 0 0;
    background:
      radial-gradient(
        90% 40% at 50% 0,
        var(--glow, rgba(255, 207, 90, 0.4)),
        transparent 70%
      ),
      repeating-linear-gradient(
        45deg,
        rgba(255, 255, 255, 0.035) 0 2px,
        transparent 2px 5px
      ),
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--deep, #0a403d) 70%, #0f5d57),
        var(--deep, #0a403d)
      );
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
    margin: 6px 14px 0;
    background: radial-gradient(circle, #ffe9a8 0 3px, transparent 4px) 0 50% /
      22px 14px repeat-x;
    opacity: 0.85;
    filter: drop-shadow(0 0 4px rgba(255, 207, 90, 0.8));
  }
  @media (max-width: 639px) {
    align-items: stretch;
    .mg-backdrop {
      backdrop-filter: none;
    }
    .mg-panel {
      width: 100%;
      height: 100dvh;
      max-height: none;
      border-radius: 0;
      padding-top: env(safe-area-inset-top, 0px);
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
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
    scrollbar-width: none;
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
    background: linear-gradient(
      160deg,
      rgba(255, 244, 214, 0.14),
      rgba(255, 244, 214, 0.05)
    );
    box-shadow: inset 0 0 0 1.5px rgba(255, 244, 214, 0.28);
    cursor: pointer;
    transition:
      transform 140ms ease,
      box-shadow 140ms ease;
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
      repeating-linear-gradient(
        45deg,
        rgba(255, 255, 255, 0.07) 0 6px,
        transparent 6px 12px
      ),
      rgba(0, 0, 0, 0.25);
  }
  .mg-pick:disabled .ind-art {
    filter: grayscale(1) brightness(0.8);
  }
  /* choosing a partner: a night stage; each card lights the panel in its Pokémon's colour */
  .mg-panel:has(.mg-roster, .mg-pick-skeletons) {
    background:
      radial-gradient(3px 3px at 12% 18%, #fff 45%, transparent 55%),
      radial-gradient(2.5px 2.5px at 82% 10%, #fff 45%, transparent 55%),
      radial-gradient(3px 3px at 47% 30%, #ffe9a8 45%, transparent 55%),
      radial-gradient(2px 2px at 92% 42%, #fff 45%, transparent 55%),
      radial-gradient(2.5px 2.5px at 6% 58%, #cfe4ff 45%, transparent 55%),
      radial-gradient(3px 3px at 70% 74%, #fff 45%, transparent 55%),
      radial-gradient(2px 2px at 30% 88%, #ffe9a8 45%, transparent 55%),
      radial-gradient(1.6px 1.6px at 58% 52%, #fff 45%, transparent 55%),
      radial-gradient(
        120px 120px at 86% 7%,
        color-mix(in srgb, var(--accent) 40%, transparent),
        transparent 70%
      ),
      radial-gradient(75% 40% at 50% 0, var(--glow), transparent 72%),
      radial-gradient(
        110% 26% at 50% 106%,
        color-mix(in srgb, var(--accent) 48%, transparent),
        transparent 72%
      ),
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--deep) 78%, #3b1f9a),
        var(--deep) 70%
      );
    transition: background 0ms;
  }
  .mg-roster {
    grid-template-columns: 84px minmax(0, 1fr);
    background:
      linear-gradient(
        135deg,
        hsl(var(--h) 70% 38% / 0.42),
        hsl(var(--h) 60% 18% / 0.55)
      ),
      rgba(8, 10, 30, 0.5);
    box-shadow: inset 0 0 0 1.5px hsl(var(--h) 90% 70% / 0.38);
  }
  .mg-roster:hover:not(:disabled),
  .mg-roster:focus-visible {
    box-shadow:
      inset 0 0 0 2px hsl(var(--h) 100% 72%),
      0 6px 22px hsl(var(--h) 100% 60% / 0.35);
  }
  .mg-roster:disabled {
    background: rgba(8, 10, 30, 0.55);
  }
  .mg-pick-stage {
    display: grid;
    place-items: center;
    width: 84px;
    height: 84px;
    border-radius: 50%;
    background: radial-gradient(
      circle at 50% 60%,
      hsl(var(--h) 100% 78% / 0.55),
      hsl(var(--h) 80% 40% / 0.2) 62%,
      transparent 70%
    );
  }
  .mg-roster[data-blocked] {
    grid-template-columns: 84px minmax(0, 1fr);
    background: rgba(8, 10, 30, 0.55);
    box-shadow: inset 0 0 0 1.5px rgba(255, 210, 122, 0.35);
    cursor: default;
  }
  .mg-roster[data-blocked] .ind-art {
    filter: grayscale(0.85) brightness(0.85);
  }
  .mg-roster[data-blocked] .mg-care {
    grid-column: 1 / -1;
  }
  .mg-pick-info {
    min-width: 0;
  }
  .mg-hunger[data-low] i {
    background: #ff9a5a;
  }
  .mg-care {
    display: block;
    min-height: 44px;
    padding: 11px 14px;
    border-radius: 14px;
    text-align: center;
    font-weight: 800;
    text-decoration: none;
    color: #231300;
    background: linear-gradient(180deg, #ffd88a, #ffb84a);
    box-shadow: 0 3px 0 #b97a1a;
  }
  .mg-care:active {
    transform: translateY(2px);
    box-shadow: 0 1px 0 #b97a1a;
  }
  .mg-care:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .mg-pick-skeletons {
    min-height: 258px;
  }
  .mg-pick-skeleton {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    min-height: 94px;
    padding: 10px 12px;
    border-radius: 18px;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 22%, transparent),
      rgba(8, 10, 30, 0.5)
    );
    box-shadow: inset 0 0 0 1.5px
      color-mix(in srgb, var(--accent) 38%, transparent);
  }
  .mg-skeleton-art,
  .mg-skeleton-copy i {
    display: block;
    border-radius: 12px;
    background: linear-gradient(
      100deg,
      #ffffff0d 20%,
      #ffffff24 40%,
      #ffffff0d 60%
    );
    background-size: 200% 100%;
    animation: mg-skeleton-shimmer 1.3s ease-in-out infinite;
  }
  .mg-skeleton-art {
    width: 64px;
    height: 64px;
    border-radius: 50%;
  }
  .mg-skeleton-copy {
    display: grid;
    gap: 8px;
  }
  .mg-skeleton-copy i {
    height: 10px;
  }
  .mg-skeleton-copy i:first-child {
    width: 58%;
    height: 14px;
  }
  .mg-skeleton-copy i:last-child {
    width: 76%;
    height: 6px;
  }
  @keyframes mg-skeleton-shimmer {
    to {
      background-position-x: -200%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .mg-skeleton-art,
    .mg-skeleton-copy i {
      animation: none;
    }
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
    -webkit-mask:
      radial-gradient(circle 8px at 0 50%, transparent 97%, #000) left / 51%
        100% no-repeat,
      radial-gradient(circle 8px at 100% 50%, transparent 97%, #000) right / 51%
        100% no-repeat;
    mask:
      radial-gradient(circle 8px at 0 50%, transparent 97%, #000) left / 51%
        100% no-repeat,
      radial-gradient(circle 8px at 100% 50%, transparent 97%, #000) right / 51%
        100% no-repeat;
  }
  .mg-tiers .mg-pick:hover:not(:disabled),
  .mg-tiers .mg-pick:focus-visible {
    box-shadow:
      0 3px 0 var(--accent),
      inset 0 0 0 2px var(--accent);
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
    position: sticky;
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
    bottom: 0;
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
      repeating-linear-gradient(
        45deg,
        rgba(255, 255, 255, 0.1) 0 6px,
        transparent 6px 12px
      ),
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
  .mg-face:not([data-ready]) img {
    visibility: hidden;
  }
  .mg-face:not([data-ready])::after {
    content: '✦';
    color: var(--accent);
    font-size: clamp(20px, 8vw, 32px);
    opacity: 0.7;
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
  .mg-memory-board .mg-face {
    transition: opacity 120ms ease-out;
  }
  .mg-memory-board .mg-card[data-celebrate] .mg-flip {
    animation: mg-match-flip 620ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }
  .mg-memory-board .mg-card[data-celebrate] .mg-face {
    animation: mg-match-face 620ms ease-out both;
  }
  @keyframes mg-match-flip {
    0%,
    100% {
      transform: rotateY(180deg) translateY(0) scale(1);
    }
    35% {
      transform: rotateY(180deg) translateY(-8px) scale(1.06);
    }
    68% {
      transform: rotateY(180deg) translateY(1px) scale(0.99);
    }
  }
  @keyframes mg-match-face {
    0%,
    100% {
      opacity: 1;
    }
    35% {
      opacity: 0.82;
    }
    60% {
      opacity: 1;
    }
  }
  @media (max-width: 639px) {
    .mg-memory-board {
      --memory-gap: 6px;
      --memory-pad: 6px;
      grid-template-rows: repeat(var(--memory-rows), minmax(0, 1fr));
      height: min(52dvh, calc(100dvh - 280px));
      gap: var(--memory-gap);
      padding: var(--memory-pad);
    }
    .mg-memory-board .mg-card {
      aspect-ratio: auto;
      height: 100%;
      min-height: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .mg-memory-board .mg-card[data-celebrate] .mg-flip,
    .mg-memory-board .mg-card[data-celebrate] .mg-face {
      animation: none;
    }
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

  /* team manager: ten colour-coded squads */
  .tm {
    display: grid;
    gap: 12px;
  }
  .tm-deck {
    display: flex;
    gap: 8px;
    margin: 0 -4px;
    padding: 8px 4px 35px;
    list-style: none;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }
  .tm-deck::-webkit-scrollbar {
    display: none;
  }
  .tm-deck li {
    flex: 0 0 auto;
    scroll-snap-align: start;
  }
  .tm-tab {
    --th: 200;
    position: relative;
    display: grid;
    justify-items: center;
    align-content: end;
    gap: 2px;
    width: 92px;
    height: 120px;
    padding: 8px 6px 10px;
    border: 0;
    border-radius: 18px;
    font: inherit;
    color: #fff;
    cursor: pointer;
    overflow: hidden;
    background:
      radial-gradient(
        90% 60% at 50% 0,
        hsl(var(--th) 95% 62% / 0.55),
        transparent 75%
      ),
      linear-gradient(180deg, hsl(var(--th) 55% 26%), hsl(var(--th) 60% 13%));
    box-shadow: inset 0 0 0 1.5px hsl(var(--th) 90% 70% / 0.35);
    transition:
      transform 160ms,
      box-shadow 160ms;
  }
  .tm-tab b {
    max-width: 100%;
    font-size: 12px;
    line-height: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tm-tab small {
    font-size: 10px;
    opacity: 0.8;
  }
  .tm-tab[aria-pressed='true'] {
    transform: translateY(-5px) scale(1.04);
    box-shadow:
      inset 0 0 0 2.5px hsl(var(--th) 100% 78%),
      0 10px 22px hsl(var(--th) 95% 55% / 0.55);
  }
  .tm-tab[data-target] {
    animation: tm-drop 900ms ease-in-out infinite;
  }
  /* a hand of holo cards: each Pokémon pops out of its card, the hand fans from the bottom */
  .tm-fan {
    position: relative;
    width: 100%;
    height: 56px;
    margin: 22px 0 8px;
    display: grid;
    place-items: center;
  }
  .tm-fan i {
    --n: 0;
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 30px;
    height: 44px;
    margin-left: -15px;
    border-radius: 7px;
    overflow: visible;
    background:
      linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.55) 48%, transparent 66%) -140% 0 / 70% 100% no-repeat,
      linear-gradient(160deg, hsl(var(--th) 100% 82%), hsl(calc(var(--th) + 50) 90% 55%) 55%, hsl(calc(var(--th) - 30) 80% 34%));
    box-shadow:
      inset 0 0 0 1.5px rgba(255, 255, 255, 0.75),
      0 3px 6px rgba(0, 0, 0, 0.5);
    transform-origin: 50% 120%;
    transform: rotate(calc((var(--k) - (var(--n) - 1) / 2) * 11deg));
    transition: transform 220ms cubic-bezier(0.3, 1.5, 0.4, 1);
    animation: tm-card-glint 3.6s ease-in-out infinite;
    animation-delay: calc(var(--k) * 0.35s);
  }
  .tm-fan i .ind-art {
    position: absolute;
    left: 50%;
    top: -14px;
    translate: -50% 0;
    filter: drop-shadow(0 3px 2px rgba(0, 0, 0, 0.55));
  }
  .tm-tab:hover .tm-fan i,
  .tm-tab[aria-pressed='true'] .tm-fan i {
    transform: rotate(calc((var(--k) - (var(--n) - 1) / 2) * 17deg)) translateY(-3px);
  }
  .tm-fan em {
    align-self: end;
    padding: 2px 10px;
    border-radius: 999px;
    font-style: normal;
    font-size: 10px;
    font-weight: 800;
    border: 1.5px dashed hsl(var(--th) 100% 85% / 0.6);
    opacity: 0.85;
  }
  .tm-fan .tm-more {
    position: absolute;
    right: 2px;
    bottom: -6px;
    z-index: 5;
    padding: 0 6px;
    border-radius: 999px;
    font-style: normal;
    font-size: 10px;
    line-height: 15px;
    font-weight: 900;
    color: #2b1a3d;
    background: #fff;
    border: 0;
    box-shadow: 0 0 8px hsl(var(--th) 100% 75%);
  }
  @keyframes tm-card-glint {
    0%, 60% { background-position: -140% 0, 0 0; }
    100% { background-position: 240% 0, 0 0; }
  }
  .tm-flag {
    position: absolute;
    top: 6px;
    left: 50%;
    transform: translateX(-50%);
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 9px;
    line-height: 13px;
    font-weight: 900;
    white-space: nowrap;
    color: #2b1a3d;
    background: linear-gradient(180deg, #ffe08a, #ffb23f);
    box-shadow: 0 0 10px #ffcf5a;
  }
  .tm-new {
    align-content: center;
    background:
      linear-gradient(rgba(18, 15, 46, 0.9), rgba(18, 15, 46, 0.9)) padding-box,
      repeating-conic-gradient(
          from 0deg,
          #ff8fd0 0 12deg,
          #7ff5ff 12deg 24deg,
          #ffe08a 24deg 36deg
        )
        border-box;
    border: 2px dashed transparent;
    box-shadow: none;
  }
  .tm-new span {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    font-size: 26px;
    font-weight: 800;
    border-radius: 50%;
    color: #2b1a3d;
    background: linear-gradient(135deg, #ff8fd0, #ffe08a);
  }
  .tm-head {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .tm-name {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 0 14px;
    border: 0;
    border-radius: 14px;
    font: inherit;
    font-weight: 800;
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
    box-shadow: inset 0 -3px 0 hsl(var(--th) 95% 62%);
  }
  .tm-act {
    min-height: 44px;
    padding: 0 12px;
    border: 0;
    border-radius: 14px;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    color: #2b1a3d;
    background: linear-gradient(180deg, #ffe08a, #ffb23f);
    cursor: pointer;
  }
  .tm-act:disabled {
    color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.12);
    cursor: default;
  }
  .tm-act[data-danger]:not(:disabled) {
    color: hsl(var(--th) 100% 90%);
    background: rgba(255, 255, 255, 0.1);
    box-shadow: inset 0 0 0 1px hsl(var(--th) 100% 85% / 0.4);
  }
  .tm-slots {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(58px, 1fr));
    gap: 8px;
    margin: 0;
    padding: 12px;
    list-style: none;
    border-radius: 20px;
    background:
      radial-gradient(
        80% 120% at 50% 0,
        hsl(var(--th) 90% 55% / 0.28),
        transparent 70%
      ),
      rgba(0, 0, 0, 0.22);
    box-shadow: inset 0 0 0 1.5px hsl(var(--th) 90% 70% / 0.3);
  }
  .tm-slot {
    position: relative;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 2px;
    width: 100%;
    min-height: 74px;
    padding: 4px 2px;
    border: 0;
    border-radius: 16px;
    font: inherit;
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: transform 160ms;
  }
  .tm-slot small {
    max-width: 100%;
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tm-slot[data-empty] {
    cursor: default;
    background: none;
    border: 2px dashed rgba(255, 255, 255, 0.25);
  }
  .tm-slot[data-empty] b {
    font-size: 22px;
    opacity: 0.3;
  }
  .tm-slot[data-lifted] {
    transform: translateY(-8px) scale(1.08);
    box-shadow:
      0 0 0 2.5px #ffe08a,
      0 12px 20px rgba(0, 0, 0, 0.45);
  }
  .tm-slot,
  .tm-card {
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  .tm .ind-art,
  .tm .ind-art img {
    pointer-events: none;
    -webkit-user-drag: none;
  }
  .tm-slot:not([data-empty]) {
    touch-action: none;
    cursor: grab;
  }
  .tm-card {
    touch-action: pan-y;
  }
  .tm-cell {
    position: relative;
  }
  .tm-remove {
    position: absolute;
    z-index: 2;
    top: -7px;
    right: -7px;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    font-size: 0;
    color: #fff;
    background: rgba(20, 17, 43, 0.72);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
    box-shadow:
      inset 0 0 0 1px hsl(var(--th) 100% 88% / 0.55),
      0 2px 8px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: background 160ms, box-shadow 160ms, transform 160ms;
  }
  /* a hairline cross, drawn so it stays crisp at any size */
  .tm-remove::before,
  .tm-remove::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 10px;
    height: 1.5px;
    margin: -0.75px 0 0 -5px;
    border-radius: 1px;
    background: hsl(var(--th) 100% 92%);
    transform: rotate(45deg);
    transition: background 160ms;
  }
  .tm-remove::after {
    inset: auto;
    left: 50%;
    top: 50%;
    transform: rotate(-45deg);
  }
  .tm-remove:hover,
  .tm-remove:focus-visible {
    background: hsl(var(--th) 100% 90%);
    box-shadow: 0 0 0 1px #fff, 0 0 12px hsl(var(--th) 100% 75%);
    transform: scale(1.12) rotate(90deg);
  }
  .tm-remove:hover::before,
  .tm-remove:hover::after,
  .tm-remove:focus-visible::before,
  .tm-remove:focus-visible::after {
    background: #14112b;
  }
  .tm-remove:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .tm-slot[data-over] {
    box-shadow:
      0 0 0 3px #ffe08a,
      0 0 18px #ffe08a;
    transform: scale(1.06);
  }
  .tm-slot[data-empty][data-over] {
    background: rgba(255, 224, 138, 0.2);
    border-color: #ffe08a;
  }
  .tm-slot[data-dragging],
  .tm-card[data-dragging] {
    opacity: 0.35;
  }
  .tm-ghost {
    position: fixed;
    z-index: 100;
    width: 72px;
    height: 72px;
    margin: -46px 0 0 -36px;
    object-fit: contain;
    pointer-events: none;
    transform: rotate(-6deg) scale(1.1);
    filter: drop-shadow(0 12px 10px rgba(0, 0, 0, 0.55))
      drop-shadow(0 0 10px #ffe08a);
  }
  .tm-hint {
    margin: -4px 2px 0;
    font-size: 12px;
    opacity: 0.8;
  }
  .tm-hint[data-on] {
    color: #ffe08a;
    opacity: 1;
  }
  .tm-roster {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tm-card {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 2px;
    width: 100%;
    min-height: 44px;
    padding: 8px 4px 14px;
    border: 0;
    border-radius: 16px;
    font: inherit;
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
    transition:
      transform 160ms,
      background 160ms;
  }
  .tm-card b {
    max-width: 100%;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tm-card small {
    font-size: 10px;
    opacity: 0.8;
    text-align: center;
  }
  .tm-lock {
    padding: 1px 8px;
    border-radius: 999px;
    font-weight: 800;
    white-space: nowrap;
    background: rgba(0, 0, 0, 0.4);
    color: #ffe08a;
  }
  .tm-card:hover {
    transform: translateY(-2px);
  }
  .tm-card[aria-pressed='true'] {
    background: hsl(var(--th) 80% 45% / 0.4);
    box-shadow: inset 0 0 0 2px hsl(var(--th) 100% 75%);
  }
  .tm-card[data-blocked] {
    opacity: 0.5;
  }
  .tm-in {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 4px;
    display: flex;
    justify-content: center;
    gap: 3px;
  }
  .tm-in i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: hsl(var(--th) 95% 62%);
    box-shadow: 0 0 6px hsl(var(--th) 95% 62%);
  }
  .tm .mg-cta {
    min-height: 48px;
    border: 0;
    border-radius: 999px;
    font: inherit;
    font-weight: 800;
    color: #2b1a3d;
    background: linear-gradient(180deg, #ffe08a, #ffb23f);
    box-shadow:
      0 4px 0 #b57512,
      0 8px 18px rgba(255, 178, 63, 0.35);
    cursor: pointer;
  }
  .tm .mg-cta:disabled {
    opacity: 0.6;
  }
  /* until everything is read the real layout is drawn blank, so nothing moves when it fills */
  .tm[data-skel] .tm-remove {
    display: none;
  }
  .tm[data-skel] {
    pointer-events: none;
  }
  .tm[data-skel]
    :is(.tm-tab, .tm-slot, .tm-card, .tm-name, .tm-act, .mg-cta, .tm-hint)
    > *,
  .tm[data-skel] :is(.tm-name, .tm-hint, .mg-cta, .tm-act) {
    color: transparent;
  }
  .tm[data-skel] :is(.tm-tab, .tm-slot, .tm-card, .tm-act) > * {
    visibility: hidden;
  }
  .tm[data-skel] :is(.tm-tab, .tm-card, .tm-slot, .tm-name, .tm-act, .mg-cta) {
    opacity: 1;
    background: rgba(255, 255, 255, 0.09);
    box-shadow: none;
    animation: tm-shimmer 1.3s ease-in-out infinite;
  }
  @keyframes tm-shimmer {
    50% {
      background: rgba(255, 255, 255, 0.17);
    }
  }
  .tm .mg-cta:empty,
  .tm-name:empty {
    display: block;
  }
  .tm-slot:empty,
  .tm-card:empty,
  .tm-act:empty,
  .tm-name:empty,
  .tm > .mg-cta:empty {
    min-height: 44px;
  }
  .tm-card:empty {
    min-height: 96px;
  }
  .tm-slot:empty {
    min-height: 74px;
  }
  .tm-tab:empty {
    display: block;
  }
  .tm-act:empty {
    width: 76px;
  }
  .tm-name:empty {
    flex: 1;
  }
  .tm > .mg-cta:empty {
    min-height: 48px;
  }
  .tm-tab:focus-visible,
  .tm-slot:focus-visible,
  .tm-card:focus-visible,
  .tm-act:focus-visible,
  .tm-name:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  @keyframes tm-drop {
    50% {
      box-shadow:
        inset 0 0 0 2.5px #ffe08a,
        0 0 18px #ffe08a;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .tm-fan i {
      animation: none;
    }
    .tm-tab[data-target] {
      animation: none;
    }
    .tm-tab,
    .tm-slot,
    .tm-card {
      transition: none;
    }
    .tm[data-skel]
      :is(.tm-tab, .tm-card, .tm-slot, .tm-name, .tm-act, .mg-cta) {
      animation: none;
    }
  }
  /* trainer hall: a lit stage for the avatar on show, a wall of badges below */
  .tr-hall {
    display: grid;
    gap: 14px;
  }
  /* the stage is a holo licence: a foil card tilting with the pointer, a pokéball medallion
     on a rotating sunburst, motes rising, a stamp slammed on what is still locked */
  .tr-stage {
    --ring: #cfe3ff;
    --rx: 0deg;
    --ry: 0deg;
    --mx: 50%;
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 14px;
    padding: 18px 16px;
    border-radius: 26px;
    overflow: hidden;
    isolation: isolate;
    background:
      radial-gradient(
        120% 90% at 0 50%,
        color-mix(in srgb, var(--ring) 38%, transparent),
        transparent 60%
      ),
      linear-gradient(
        160deg,
        color-mix(in srgb, var(--ring) 16%, #1b1642),
        #0d0a26 80%
      );
    box-shadow:
      inset 0 0 0 1.5px color-mix(in srgb, var(--ring) 70%, transparent),
      0 14px 34px rgba(0, 0, 0, 0.4),
      0 0 40px color-mix(in srgb, var(--ring) 30%, transparent);
    transform: perspective(800px) rotateX(var(--rx)) rotateY(var(--ry));
    transition:
      transform 160ms ease-out,
      box-shadow 300ms;
  }
  .tr-stage[data-locked] {
    filter: saturate(0.55);
  }
  .tr-rays {
    position: absolute;
    z-index: -2;
    left: 78px;
    top: 50%;
    width: 380px;
    height: 380px;
    margin: -190px 0 0 -190px;
    background: repeating-conic-gradient(
      from 0deg,
      color-mix(in srgb, var(--ring) 42%, transparent) 0 7deg,
      transparent 7deg 20deg
    );
    -webkit-mask: radial-gradient(circle, #000 12%, transparent 62%);
    mask: radial-gradient(circle, #000 12%, transparent 62%);
    animation: tr-spin 28s linear infinite;
  }
  .tr-foil {
    position: absolute;
    z-index: 3;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
    background: linear-gradient(
        112deg,
        transparent 20%,
        #ff9de288 34%,
        #fff6b088 42%,
        #7ff5ff88 50%,
        #b79bff88 58%,
        transparent 72%
      )
      var(--mx) 0 / 260% 100% no-repeat;
    mix-blend-mode: color-dodge;
    opacity: 0.55;
    animation: tr-foil 5s ease-in-out infinite alternate;
  }
  .tr-stage:hover .tr-foil {
    animation: none;
  }
  .tr-medal {
    position: relative;
    width: 124px;
    height: 124px;
    display: grid;
    place-items: center;
  }
  .tr-ball {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: linear-gradient(
      180deg,
      #ff4a4a 0 45%,
      #14112b 45% 55%,
      #f6f6ff 55%
    );
    -webkit-mask: radial-gradient(
      farthest-side,
      transparent calc(100% - 10px),
      #000 calc(100% - 9px)
    );
    mask: radial-gradient(
      farthest-side,
      transparent calc(100% - 10px),
      #000 calc(100% - 9px)
    );
    filter: drop-shadow(0 0 8px var(--ring));
    animation: tr-ball 700ms cubic-bezier(0.3, 1.5, 0.4, 1);
  }
  .tr-portrait {
    display: block;
    width: 100px;
    height: 100px;
    line-height: 0;
    border-radius: 50%;
    filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5));
    animation: tr-pop 520ms cubic-bezier(0.3, 1.6, 0.4, 1);
  }
  .tr-flash {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 3px solid #fff;
    box-shadow:
      0 0 20px var(--ring),
      inset 0 0 20px var(--ring);
    opacity: 0;
    animation: tr-flash 700ms ease-out;
  }
  .tr-mote {
    position: absolute;
    left: calc(50% + (var(--k) - 2.5) * 20px);
    bottom: 6px;
    width: 8px;
    height: 8px;
    background: #fff;
    clip-path: polygon(
      50% 0,
      62% 38%,
      100% 50%,
      62% 62%,
      50% 100%,
      38% 62%,
      0 50%,
      38% 38%
    );
    filter: drop-shadow(0 0 4px var(--ring));
    opacity: 0;
    animation: tr-rise 3.2s ease-in infinite;
    animation-delay: calc(var(--k) * -0.55s);
  }
  .tr-stamp {
    position: absolute;
    z-index: 2;
    padding: 3px 10px;
    border: 3px solid #ff5d5d;
    border-radius: 8px;
    font-weight: 900;
    font-size: 17px;
    letter-spacing: 0.02em;
    color: #ff5d5d;
    background: rgba(13, 10, 38, 0.82);
    transform: rotate(-14deg);
    animation: tr-slam 420ms cubic-bezier(0.3, 1.6, 0.4, 1) 120ms backwards;
  }
  .tr-meta {
    display: grid;
    justify-items: start;
    gap: 3px;
    min-width: 0;
  }
  .tr-kind {
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 11px;
    line-height: 16px;
    font-weight: 800;
    color: #14112b;
    background: var(--ring);
    box-shadow: 0 0 12px color-mix(in srgb, var(--ring) 70%, transparent);
  }
  .tr-name {
    font-size: 23px;
    line-height: 27px;
    overflow-wrap: anywhere;
    text-shadow:
      0 0 16px var(--ring),
      0 2px 0 rgba(0, 0, 0, 0.35);
  }
  .tr-how {
    font-size: 12px;
    line-height: 16px;
    opacity: 0.85;
  }
  .tr-now {
    margin-top: 4px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 800;
    color: var(--ring);
  }
  .tr-now::before {
    content: '';
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--ring);
    box-shadow: 0 0 10px var(--ring);
  }
  @keyframes tr-foil {
    from {
      background-position: 15% 0;
    }
    to {
      background-position: 85% 0;
    }
  }
  @keyframes tr-ball {
    from {
      transform: rotate(-200deg) scale(0.5);
      opacity: 0;
    }
  }
  @keyframes tr-flash {
    from {
      transform: scale(0.7);
      opacity: 1;
    }
    to {
      transform: scale(1.9);
      opacity: 0;
    }
  }
  @keyframes tr-rise {
    0% {
      opacity: 0;
      transform: translateY(0) scale(0.4);
    }
    20% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateY(-110px) scale(1.1) rotate(90deg);
    }
  }
  @keyframes tr-slam {
    from {
      opacity: 0;
      transform: rotate(-14deg) scale(2.4);
    }
  }
  .tr-use,
  .tr-ghost {
    min-height: 44px;
    margin-top: 6px;
    padding: 0 22px;
    border: 0;
    border-radius: 999px;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
  }
  .tr-use {
    color: #2b1a3d;
    background: linear-gradient(180deg, #ffe08a, #ffb23f);
    box-shadow:
      0 4px 0 #b57512,
      0 8px 18px rgba(255, 178, 63, 0.35);
  }
  .tr-use:disabled {
    color: rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.14);
    box-shadow: none;
    cursor: default;
  }
  .tr-ghost {
    color: #fff;
    background: rgba(255, 255, 255, 0.14);
  }
  .tr-wall {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .tr-tile {
    --ring: #cfe3ff;
    position: relative;
    display: grid;
    justify-items: center;
    gap: 4px;
    width: 100%;
    min-height: 44px;
    padding: 10px 4px 8px;
    border: 0;
    border-radius: 18px;
    font: inherit;
    font-size: 11px;
    line-height: 14px;
    color: inherit;
    background: rgba(255, 255, 255, 0.07);
    cursor: pointer;
    transition:
      transform 160ms,
      background 160ms,
      box-shadow 160ms;
  }
  .tr-tile svg,
  .tr-tile img {
    border-radius: 50%;
    box-shadow: 0 0 0 3px var(--ring);
  }
  .tr-tile:hover {
    transform: translateY(-3px);
    background: rgba(255, 255, 255, 0.13);
  }
  .tr-tile[aria-pressed='true'] {
    background: color-mix(in srgb, var(--ring) 24%, transparent);
    box-shadow:
      inset 0 0 0 2px var(--ring),
      0 0 18px color-mix(in srgb, var(--ring) 55%, transparent);
  }
  .tr-tile[data-mine]::after {
    content: '✓';
    position: absolute;
    top: 6px;
    right: 8px;
    font-weight: 900;
    color: var(--ring);
  }
  .tr-tile[data-locked] svg {
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  }
  .tr-lock {
    position: absolute;
    top: 44px;
    left: 50%;
    width: 22px;
    height: 22px;
    margin-left: -11px;
    border-radius: 50%;
    background:
      radial-gradient(
          circle at 50% 38%,
          transparent 0 3px,
          #fff 3.5px 5px,
          transparent 5.5px
        )
        0 -1px / 100% 100% no-repeat,
      linear-gradient(#fff, #fff) 50% 70% / 10px 8px no-repeat,
      rgba(15, 12, 40, 0.82);
  }
  .tr-tile-up {
    align-content: center;
    min-height: 110px;
    background:
      linear-gradient(rgba(18, 15, 46, 0.9), rgba(18, 15, 46, 0.9)) padding-box,
      repeating-conic-gradient(
          from 0deg,
          #ff8fd0 0 12deg,
          #7ff5ff 12deg 24deg,
          #ffe08a 24deg 36deg
        )
        border-box;
    border: 2px dashed transparent;
  }
  .tr-plus {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    font-size: 28px;
    font-weight: 800;
    border-radius: 50%;
    color: #2b1a3d;
    background: linear-gradient(135deg, #ff8fd0, #ffe08a);
  }
  .tr-tile:focus-visible,
  .tr-use:focus-visible,
  .tr-ghost:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .tr-crop {
    display: grid;
    justify-items: center;
    gap: 10px;
  }
  .tr-crop-view {
    position: relative;
    width: 248px;
    height: 248px;
    border-radius: 50%;
    overflow: hidden;
    touch-action: none;
    cursor: grab;
    background: rgba(255, 255, 255, 0.08);
    box-shadow:
      0 0 0 4px #ff8fd0,
      0 0 30px rgba(255, 143, 208, 0.5);
  }
  .tr-crop-view canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
  .tr-crop-grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        90deg,
        transparent 33%,
        rgba(255, 255, 255, 0.35) 33% calc(33% + 1px),
        transparent calc(33% + 1px) 66%,
        rgba(255, 255, 255, 0.35) 66% calc(66% + 1px),
        transparent calc(66% + 1px)
      ),
      linear-gradient(
        0deg,
        transparent 33%,
        rgba(255, 255, 255, 0.35) 33% calc(33% + 1px),
        transparent calc(33% + 1px) 66%,
        rgba(255, 255, 255, 0.35) 66% calc(66% + 1px),
        transparent calc(66% + 1px)
      );
  }
  .tr-zoom {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    width: min(320px, 100%);
    font-size: 12px;
  }
  .tr-zoom input {
    width: 100%;
    min-height: 44px;
    accent-color: #ff8fd0;
  }
  .tr-crop-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  @keyframes tr-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes tr-pop {
    from {
      transform: scale(0.6) rotate(-8deg);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .tr-rays,
    .tr-foil,
    .tr-ball,
    .tr-flash,
    .tr-mote,
    .tr-stamp,
    .tr-portrait {
      animation: none;
    }
    .tr-stage {
      transform: none;
      transition: none;
    }
    .tr-tile {
      transition: none;
    }
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
  ${arcadeCss}
`
