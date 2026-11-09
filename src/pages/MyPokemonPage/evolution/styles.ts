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
  .ev-stones {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 0 0 10px;
  }
  .ev-stones .ev-btn {
    background: #bdeaff;
    font-size: 13px;
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

/** The effect: dark scrim, water warp, the ticket. Moving parts are written per frame; the scene is laid out in px by fxLayout. */
export const EvolveFxStyle = styled.dialog`
  width: min(100vw - 16px, 760px);
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
    height: min(640px, 100svh - 16px);
    overflow: hidden;
    border-radius: 16px;
    background: radial-gradient(70% 60% at 50% 45%, #1c2447, #080b18);
  }
  /* the form's animation box: HERO px square, moved and scaled per frame */
  .fx-box {
    position: absolute;
    left: 0;
    top: 0;
    width: 300px;
    height: 300px;
    transform-origin: 50% 50%;
  }
  .abs {
    position: absolute;
    left: 50%;
    top: 50%;
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
    z-index: 1;
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
  /* "phiếu ghi nhận": a holo ticket with notched sides and a prismatic edge */
  .tk {
    position: absolute;
    left: 0;
    top: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 18px 12px;
    border-radius: 14px;
    background:
      linear-gradient(#0d1530, #0a1126) padding-box,
      conic-gradient(from 200deg, #7dd3fc, #c4b5fd, #ffd23f, #5eead4, #7dd3fc)
        border-box;
    border: 2px solid transparent;
    box-shadow: 0 18px 40px -12px #000c;
    --n: radial-gradient(circle 9px at 0 50%, #0000 98%, #000) left / 51% 100%
        no-repeat,
      radial-gradient(circle 9px at 100% 50%, #0000 98%, #000) right / 51% 100%
        no-repeat;
    -webkit-mask: var(--n);
    mask: var(--n);
    opacity: 0;
    overflow: hidden;
  }
  .tk h4 {
    display: flex;
    justify-content: space-between;
    margin: 0;
    font: 800 10px system-ui, sans-serif;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #9fb4ff;
  }
  .tk-form {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 8px;
    margin: 0;
    font: 700 13px/1.2 system-ui, sans-serif;
    color: #b8c4e8;
  }
  .tk-form em {
    font-style: normal;
    color: #ffd23f;
  }
  .tk-form b {
    font-size: 19px;
    color: #fff;
  }
  .tk ul {
    display: grid;
    gap: 5px;
    margin: 2px 0 0;
    padding: 0;
    list-style: none;
  }
  .tk li {
    display: grid;
    grid-template-columns: 74px 1fr 34px;
    align-items: center;
    gap: 8px;
    font: 700 12px system-ui, sans-serif;
  }
  .tk li u {
    display: block;
    height: 6px;
    overflow: hidden;
    border-radius: 6px;
    background: #ffffff1f;
  }
  .tk li i {
    display: block;
    height: 100%;
    border-radius: 6px;
    background: linear-gradient(90deg, #5eead4, #7dd3fc);
    transform: scaleX(0);
    transform-origin: left;
  }
  .tk li b {
    text-align: right;
    color: #7ee0a3;
  }
  .tk-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: auto;
  }
  .tk-first {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 3px 10px;
    border-radius: 99px;
    background: #ffd23f;
    color: #3a2a00;
    font: 800 11px system-ui, sans-serif;
    opacity: 0;
  }
  .stamp {
    flex: none;
    margin: 4px 6px 4px 0;
    transform-origin: center;
    padding: 2px 6px;
    border: 2px solid #ff6b6b;
    border-radius: 3px;
    color: #ff6b6b;
    font: 800 11px system-ui, sans-serif;
    letter-spacing: 0.12em;
    opacity: 0;
    background: #0a1126cc;
  }
  .cap {
    position: absolute;
    left: 12px;
    right: 12px;
    top: 58px;
    text-align: center;
    font: 700 14px system-ui, sans-serif;
    text-shadow: 0 1px 6px #000;
    opacity: 0;
    pointer-events: none;
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

const rim = css`
  position: absolute;
  z-index: 4;
  left: 50%;
  top: 50%;
`

/** The ready ripple: a water ring breathing around the whole disc. */
export const EvolveRippleStyle = styled.span`
  ${rim}
  z-index: 0;
  width: calc(var(--R) * 2);
  height: calc(var(--R) * 2);
  margin: calc(var(--R) * -1) 0 0 calc(var(--R) * -1);
  border-radius: 50%;
  pointer-events: none;
  border: 3px solid rgba(125, 211, 252, 0.9);
  box-shadow:
    0 0 24px rgba(34, 184, 255, 0.55),
    inset 0 0 22px rgba(34, 184, 255, 0.3);
  opacity: calc(0.25 + var(--g, 0.3) * 0.55);
  transform: scale(calc(1.03 + var(--g, 0.3) * 0.06));
  &[data-calm] {
    opacity: 0.25;
    transform: none;
  }
`

/** The bubble at 12 o'clock on the disc's rim. --g (0..1) is the ready glow, --p the level progress. */
export const EvolveSatelliteStyle = styled.button`
  ${rim}
  --s: clamp(44px, calc(var(--R) * 0.5), 56px);
  width: var(--s);
  height: var(--s);
  margin: calc(var(--s) / -2) 0 0 calc(var(--s) / -2);
  padding: 0;
  border: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  isolation: isolate;
  color: #fff;
  background: conic-gradient(#4cc3ff var(--p, 100%), rgba(255, 255, 255, 0.22) 0);
  transform: translateY(calc(var(--R) * -1));
  box-shadow: 0 10px 22px -8px rgba(0, 0, 0, 0.7);
  /* a 44px+ target around the bubble */
  &::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
  }
  &::before {
    content: '';
    position: absolute;
    inset: 3px;
    z-index: -1;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #1d4f86, #0b1a2f);
  }
  .es-aura {
    position: absolute;
    inset: -10px;
    z-index: -2;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(34, 184, 255, 0.85),
      rgba(34, 184, 255, 0) 68%
    );
    opacity: 0;
  }
  .es-art {
    width: 74%;
    height: 74%;
    object-fit: contain;
    pointer-events: none;
  }
  small {
    position: absolute;
    left: 50%;
    bottom: -9px;
    padding: 0 7px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: #0b1a2f;
    box-shadow: 0 0 0 1.5px #4cc3ff;
    font: 800 10px/16px system-ui, sans-serif;
    white-space: nowrap;
  }
  .es-drop {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 14px;
    height: 14px;
    background: #22b8ff;
    clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
    filter: drop-shadow(0 0 1.5px #0b1a3d) drop-shadow(0 0 1.5px #0b1a3d);
    opacity: 0;
  }
  &[data-state='ready'] {
    background: conic-gradient(#fff, #7dd3fc, #fff);
    transform: translateY(calc(var(--R) * -1 - 6px))
      scale(calc(1 + var(--g, 0.3) * 0.08));
    box-shadow:
      0 0 calc(10px + var(--g, 0.3) * 22px) #4cc3ff,
      0 10px 22px -8px rgba(0, 0, 0, 0.7);
  }
  &[data-state='ready'] .es-aura {
    opacity: var(--g, 0.3);
  }
  &[data-state='ready'] .es-drop {
    opacity: 1;
  }
  &[data-state='soon'] .es-art {
    filter: brightness(0) opacity(0.75);
  }
  &:focus-visible {
    outline: 3px solid #ffda55;
    outline-offset: 3px;
  }
`
