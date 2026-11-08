import styled, { css } from 'styled-components'
import { dialogCss } from 'pages/QuizPage/useModal'

const noScrollbar = css`
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

const focusRing = css`
  button:focus-visible {
    outline: 3px solid #ffda55;
    outline-offset: 2px;
  }
`

/** The prompt: bubbles for each branch around the Pokémon (Dialog C cases). */
export const EvolveDialogStyle = styled.dialog`
  ${dialogCss}
  --dialog-w: 380px;
  .ev-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    max-height: calc(100svh - 24px);
    overflow: hidden auto;
    ${noScrollbar}
    padding: 20px 16px 18px;
    border-radius: 22px;
    text-align: center;
    background: radial-gradient(90% 80% at 50% 0, #14406b, #08162e);
    box-shadow:
      inset 0 0 0 2px rgba(189, 234, 255, 0.45),
      0 30px 90px -20px rgba(41, 128, 239, 0.55);
  }
  h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
  }
  .ev-sub {
    margin: 0 0 6px;
    font-size: 12px;
    opacity: 0.75;
  }
  .ev-stage {
    position: relative;
    flex: none;
    width: min(100%, 300px);
    aspect-ratio: 300 / 170;
  }
  .ev-me,
  .ev-bub {
    position: absolute;
  }
  .ev-me img,
  .ev-bub img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .ev-bub {
    aspect-ratio: 1;
    padding: 0;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 2px solid #bdeaff;
    background: radial-gradient(circle at 30% 30%, #ffffff33, #7dd3fc18);
    color: #bdeaff;
    font: 700 10px system-ui, sans-serif;
    cursor: pointer;
    transition:
      border-color 0.2s,
      box-shadow 0.2s,
      opacity 0.2s;
  }
  .ev-bub img {
    width: 78%;
    height: 78%;
    filter: brightness(0) opacity(0.85);
  }
  .ev-bub[data-on] img {
    filter: none;
  }
  .ev-bub[data-on] {
    border-color: #fff;
    box-shadow:
      0 0 22px #7dd3fc,
      inset 0 0 14px #7dd3fc88;
  }
  .ev-bub[data-lock] {
    opacity: 0.4;
    border-style: dashed;
    cursor: default;
  }
  .ev-bub[data-beat] {
    animation: ev-beat 1.8s ease-in-out infinite;
  }
  .ev-bub[data-float] {
    animation: ev-float 3.2s ease-in-out infinite;
  }
  .ev-bub small {
    position: absolute;
    bottom: -17px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    font-size: 10px;
  }
  .ev-why {
    min-height: 34px;
    margin: 10px 0 12px;
    font-size: 11px;
    line-height: 1.5;
    color: #9fd3f0;
  }
  .ev-why p {
    margin: 0;
  }
  .ev-ok {
    color: #7ee0a3;
  }
  .ev-no {
    color: #f4a6a6;
  }
  .ev-err {
    margin: 0 0 8px;
    min-height: 1.4em;
    font-size: 12px;
    color: #ffb4b4;
  }
  .ev-acts {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .ev-btn {
    min-height: 44px;
    min-width: 88px;
    padding: 8px 20px;
    border: none;
    border-radius: 999px;
    font: 800 14px system-ui, sans-serif;
    background: #fff;
    color: #08305a;
    cursor: pointer;
  }
  .ev-btn[data-quiet] {
    background: rgba(255, 255, 255, 0.12);
    color: #e8ecff;
  }
  .ev-btn[aria-disabled='true'] {
    opacity: 0.45;
    cursor: default;
  }
  ${focusRing}
  @keyframes ev-beat {
    50% {
      transform: scale(1.06);
    }
  }
  @keyframes ev-float {
    50% {
      transform: translateY(-6px);
    }
  }
`

/** The effect: dark scrim, water warp, Field Notes page. Styles of the moving parts are written per frame. */
export const EvolveFxStyle = styled.dialog`
  width: min(100vw, 760px);
  max-width: none;
  max-height: 100svh;
  margin: auto;
  padding: 0;
  border: none;
  background: none;
  color: #e8ecff;
  overflow: visible;
  &::backdrop {
    background: rgba(3, 6, 16, 0.94);
  }
  .fx-stage {
    position: relative;
    height: min(420px, calc(100svh - 24px));
    overflow: hidden;
    border-radius: 16px;
    background: radial-gradient(70% 60% at 50% 45%, #1c2447, #080b18);
  }
  .fx-box {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 480px;
    height: 420px;
    margin: -210px 0 0 -240px;
    transform: scale(var(--k, 1));
  }
  .abs {
    position: absolute;
    left: 50%;
    top: 50%;
  }
  .fx-shift {
    position: absolute;
    inset: 0;
  }
  .mon {
    width: 180px;
    height: 180px;
    margin: -90px 0 0 -90px;
    object-fit: contain;
    will-change: filter, opacity, transform;
  }
  .ring {
    width: 230px;
    height: 230px;
    margin: -115px 0 0 -115px;
    border-radius: 50%;
    border: 6px dashed var(--ring, #ffd23f);
    opacity: 0;
  }
  .ring2 {
    width: 250px;
    height: 250px;
    margin: -125px 0 0 -125px;
    border-radius: 50%;
    border: 6px solid #7dd3fc;
    box-shadow:
      0 0 30px #7dd3fc,
      inset 0 0 24px #7dd3fc55;
    opacity: 0;
  }
  .scan {
    left: 0;
    right: 0;
    margin: 0;
    height: 3px;
    background: #5eead4;
    box-shadow: 0 0 16px 5px #5eead4;
    opacity: 0;
  }
  .wv {
    width: 140px;
    height: 140px;
    margin: -70px 0 0 -70px;
    border-radius: 50%;
    border: 3px solid rgba(190, 235, 255, 0.9);
    box-shadow:
      0 0 14px 2px rgba(125, 211, 252, 0.6),
      inset 0 0 14px rgba(125, 211, 252, 0.35);
    opacity: 0;
  }
  .orb {
    width: 60px;
    height: 60px;
    margin: -30px 0 0 -30px;
    border-radius: 50%;
    background: #fff;
    opacity: 0;
  }
  .ray {
    width: 4px;
    height: 220px;
    margin: 0 0 0 -2px;
    background: linear-gradient(#fff, transparent);
    transform-origin: top;
    opacity: 0;
  }
  .sh {
    width: 12px;
    height: 12px;
    margin: -6px 0 0 -6px;
    background: #7dd3fc;
    opacity: 0;
  }
  .page {
    width: 170px;
    height: 230px;
    margin: -115px 0 0 40px;
    padding: 14px 14px 0;
    border-radius: 4px 10px 10px 4px;
    background: #f3e9cf;
    box-shadow: 0 10px 30px #000a;
    transform-origin: left center;
    color: #3a2f1c;
    font: 700 12px/1.3 system-ui, sans-serif;
    opacity: 0;
  }
  .page h4 {
    margin: 0 0 8px;
    font: 800 11px system-ui, sans-serif;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #7a6a45;
  }
  .page .pg-art {
    display: block;
    width: 90px;
    height: 90px;
    margin: 0 auto 8px;
    object-fit: contain;
    filter: sepia(0.5) contrast(1.1);
  }
  .page ul {
    margin: 0;
    padding: 0;
  }
  .page li {
    display: flex;
    justify-content: space-between;
    padding: 1px 0;
    list-style: none;
  }
  .page li b {
    color: #1f7a45;
    opacity: 0;
  }
  .stamp {
    position: absolute;
    right: 8px;
    bottom: 14px;
    padding: 2px 6px;
    border: 2px solid #c0392b;
    color: #c0392b;
    font: 800 11px system-ui, sans-serif;
    letter-spacing: 0.12em;
    opacity: 0;
  }
  .badge {
    top: 18px;
    width: 232px;
    margin: 0 0 0 -116px;
    padding: 6px 8px;
    border-radius: 99px;
    background: #ffd23f;
    color: #3a2a00;
    text-align: center;
    font: 800 12px system-ui, sans-serif;
    opacity: 0;
  }
  .cap {
    left: 0;
    right: 0;
    top: auto;
    bottom: 16px;
    margin: 0;
    text-align: center;
    font: 700 14px system-ui, sans-serif;
    opacity: 0;
  }
  .flash {
    position: absolute;
    inset: 0;
    background: #fff;
    opacity: 0;
    pointer-events: none;
  }
  .fx-skip {
    position: absolute;
    right: 10px;
    top: 10px;
    z-index: 3;
    min-width: 88px;
    min-height: 44px;
    padding: 8px 16px;
    border: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
    color: #fff;
    font: 700 13px system-ui, sans-serif;
    cursor: pointer;
  }
  .fx-skip:focus-visible {
    outline: 3px solid #ffda55;
    outline-offset: 2px;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
`

/** Water-drop badge on a card; the glow is written per frame as --g (0..1). */
export const EvolveBadgeStyle = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  isolation: isolate;
  /* a 44px target around the 36px badge */
  &::after {
    content: '';
    position: absolute;
    inset: -4px;
  }
  .eb-disc {
    position: absolute;
    inset: 2px;
    z-index: -2;
    border-radius: 50%;
    background: #0b1a2f;
    opacity: calc(0.55 + var(--g, 0.3) * 0.35);
  }
  .eb-aura {
    position: absolute;
    inset: -6px;
    z-index: -1;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(34, 184, 255, 0.85),
      rgba(34, 184, 255, 0) 68%
    );
    opacity: var(--g, 0.3);
    transform: scale(calc(0.85 + var(--g, 0.3) * 0.35));
  }
  .eb-drop {
    width: 18px;
    height: 24px;
    background: linear-gradient(160deg, #e6f7ff, #4cc3ff 55%, #1f7fe0);
    border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%;
    clip-path: path('M9 0 C9 0 18 11 18 16 A9 8 0 0 1 0 16 C0 11 9 0 9 0 Z');
    filter: drop-shadow(0 0 3px rgba(190, 235, 255, 0.9));
  }
  .eb-star {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 14px;
    height: 14px;
    background: #22b8ff;
    clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
    filter: drop-shadow(0 0 1.5px #0b1a3d) drop-shadow(0 0 1.5px #0b1a3d);
    opacity: calc(0.3 + var(--g, 0.3) * 0.7);
    transform: scale(calc(0.7 + var(--g, 0.3) * 0.6)) rotate(calc(var(--g, 0.3) * 40deg));
  }
  &[data-inline] {
    position: relative;
    top: auto;
    right: auto;
    display: inline-grid;
    vertical-align: middle;
  }
  &:focus-visible {
    outline: 3px solid #ffda55;
    outline-offset: 2px;
    border-radius: 50%;
  }
`

/** The profile card: unmet branches with progress, stones, the ready button. Inherits RoomStyle's tokens. */
export const EvolutionPanelStyle = styled.section`
  .evp-list {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .evp-tile {
    display: grid;
    grid-template-columns: 44px 1fr;
    align-items: center;
    gap: 4px 12px;
  }
  .evp-art {
    width: 44px;
    height: 44px;
    object-fit: contain;
    grid-row: span 2;
  }
  .evp-art[data-ready] {
    filter: none;
  }
  .evp-art:not([data-ready]) {
    filter: brightness(0) opacity(0.7);
  }
  .evp-name {
    font-weight: 800;
  }
  .evp-reasons {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 12px;
    opacity: 0.85;
  }
  .evp-reasons li[data-ok]::before {
    content: '✓ ';
    color: #2f9e5f;
  }
  .evp-reasons li:not([data-ok])::before {
    content: '✕ ';
    color: #d05050;
  }
  .evp-bar {
    grid-column: 1 / -1;
    height: 6px;
    overflow: hidden;
    border-radius: 9px;
    background: color-mix(in srgb, currentColor 14%, transparent);
  }
  .evp-bar i {
    display: block;
    height: 100%;
    border-radius: 9px;
    background: #4cc3ff;
  }
  .evp-more {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 12px;
    opacity: 0.75;
  }
  .evp-acts {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .evp-acts .rm-btn[data-primary] {
    font-weight: 800;
  }
  .evp-err {
    margin: 8px 0 0;
    font-size: 12px;
    color: #c0392b;
  }
`
