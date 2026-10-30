import type { CSSProperties } from 'react'
import styled from 'styled-components'
import { boneCss } from './bone'
import DexNumber from './DexNumber'

// The class `pokemon-page` switches the shell and the header to the dark
// field world (ContentStyle / HeaderStyle use :has(.pokemon-page)), so the
// first paint already has the right colours. Column: 640px like BodyStyle.
// Everything that is the same for every Pokémon is drawn for real (the back
// button, the action labels, the Pokédex shell); only the Pokémon is
// unknown: "#0000" searching, a Poké Ball mid-catch, "???" for a name.
const PokemonSkeletonStyle = styled.div`
  ${boneCss}
  .column {
    max-width: 640px;
    margin: 0 auto;
  }
  .ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border-radius: 999px;
    color: rgba(255, 255, 255, 0.55);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }
  .back {
    display: flex;
    width: 92px;
    min-height: 44px;
    border: 1px solid #ffffff25;
    border-radius: 11px;
    background: #ffffff0c;
    color: #d8e2ed;
    font-size: 11px;
  }
  .back svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* ── stage ── */
  .stage {
    position: relative;
    display: grid;
    place-items: center;
    height: 196px;
    margin-top: 20px;
    overflow: hidden;
  }
  .stage-dex {
    position: absolute;
    top: 14px;
    left: 50%;
    translate: -50% 0;
    /* the real .dex-number's exact stack, so both fall back alike */
    font-family: 'Dela Gothic One', sans-serif;
    font-size: clamp(48px, 17vw, 84px);
    letter-spacing: -0.02em;
    color: transparent;
    -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.55);
    opacity: 0.3;
  }
  .ball {
    position: relative;
    width: 64px;
    margin-bottom: 30px;
  }
  /* the neighbours in the carousel: unrevealed silhouettes */
  .neighbour {
    position: absolute;
    top: 74px;
    width: 36px;
    filter: brightness(0) drop-shadow(0 0 1px rgba(255, 255, 255, 0.55))
      drop-shadow(0 0 14px rgba(120, 200, 255, 0.45));
    opacity: 0.35;
  }
  .neighbour--left {
    left: calc(50% - 140px);
  }
  .neighbour--right {
    left: calc(50% + 104px);
  }
  /* the glowing pad the Pokémon stands on */
  .pad {
    position: absolute;
    bottom: 22px;
    width: 160px;
    height: 32px;
    border-radius: 50%;
    background: radial-gradient(
      closest-side,
      rgba(255, 218, 85, 0.5),
      rgba(255, 218, 85, 0.12) 70%,
      transparent
    );
    animation: pad-glow 1.6s ease-in-out infinite alternate;
  }
  @keyframes pad-glow {
    to {
      opacity: 0.35;
      scale: 0.92;
    }
  }

  /* "???": who's that Pokémon? A light runs through the marks */
  .name {
    margin: 5px 0 4px;
    font-family: var(--font-display);
    font-size: 40px;
    line-height: 1.1 !important;
    letter-spacing: 0.12em;
    text-align: center;
    color: transparent;
    background: linear-gradient(
        100deg,
        rgba(255, 255, 255, 0.22) 35%,
        rgba(255, 255, 255, 0.6) 50%,
        rgba(255, 255, 255, 0.22) 65%
      )
      0 0 / 300% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    animation: bone-sweep 1.6s ease-in-out infinite;
  }
  .type {
    width: 74px;
    height: 26px;
    margin: 2px auto 0;
  }

  /* ── the four actions, labels drawn for real ── */
  .actions {
    display: flex;
    gap: 8px;
    max-width: 360px;
    margin: 14px auto 0;
  }
  .actions .ghost {
    flex: 1 1 0;
    min-height: 44px;
    background: rgba(255, 255, 255, 0.07);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  }
  .actions .bone {
    width: 18px;
    height: 18px;
  }

  /* ── the power card: tier emblem, ten empty bars, BST ── */
  .power {
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr) auto;
    column-gap: 14px;
    align-items: center;
    height: 86px;
    margin-top: 25px;
    padding: 12px 16px 12px 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.05);
  }
  .emblem {
    width: 50px;
    height: 58px;
    margin: auto;
    border-radius: 0;
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  }
  .ladder {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 3px;
    align-items: end;
    height: 32px;
  }
  .ladder i {
    height: calc(8px + var(--i) * 2.6px);
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.09);
    transform: skewX(-16deg);
    animation: ladder-scan 2s ease-in-out calc(var(--i) * 90ms) infinite;
  }
  @keyframes ladder-scan {
    0%,
    60%,
    100% {
      background: rgba(255, 255, 255, 0.09);
    }
    30% {
      background: rgba(255, 218, 85, 0.45);
    }
  }
  .bst {
    display: grid;
    justify-items: end;
    gap: 6px;
  }

  /* ── the Pokédex entry: the red device, its screen scanning ── */
  .entry {
    height: 196px;
    margin-top: 16px;
    padding: 10px 12px 12px;
    border-radius: 14px 14px 14px 36px;
    background: linear-gradient(160deg, #e3350d, #a51d0b);
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.25),
      inset 0 -3px 0 rgba(0, 0, 0, 0.25),
      0 8px 18px rgba(0, 0, 0, 0.3);
  }
  .bezel {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  .lens {
    width: 44px;
    height: 44px;
    border: 3px solid #f4f4f4;
    border-radius: 50%;
    background: radial-gradient(
      circle at 35% 30%,
      #bdf2ff,
      #2a9df4 45%,
      #0b4f8a
    );
    animation: lens-blink 1.2s ease-in-out infinite alternate;
  }
  @keyframes lens-blink {
    to {
      filter: brightness(1.35);
    }
  }
  .leds {
    display: flex;
    gap: 3px;
  }
  .leds i {
    width: 3px;
    height: 6px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.75);
  }
  .screen {
    position: relative;
    display: grid;
    align-content: start;
    gap: 11px;
    height: calc(100% - 54px);
    padding: 14px;
    overflow: hidden;
    border-radius: 8px;
    background:
      repeating-linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.035) 0 1px,
        transparent 1px 3px
      ),
      #0f2a2a;
    box-shadow: inset 0 0 0 2px #0a1c1c;
  }
  .screen .bone {
    --bone: rgba(125, 255, 196, 0.1);
    --shine: rgba(125, 255, 196, 0.24);
    height: 12px;
  }
  /* a scan line reads the screen top to bottom */
  .screen::after {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 30%;
    background: linear-gradient(
      to bottom,
      transparent,
      rgba(125, 255, 196, 0.16)
    );
    border-bottom: 1px solid rgba(125, 255, 196, 0.45);
    animation: screen-scan 2.2s ease-in-out infinite;
  }
  @keyframes screen-scan {
    from {
      translate: 0 -100%;
    }
    to {
      translate: 0 340%;
    }
  }
  .stats {
    height: 320px;
    margin-top: 16px;
    border-radius: 14px;
  }

  @media (max-width: 480px) {
    .actions .ghost {
      flex-direction: column;
      gap: 4px;
      min-height: 56px;
      padding: 6px 4px;
      border-radius: 22px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pad,
    .name,
    .ladder i,
    .lens,
    .screen::after {
      animation: none;
    }
  }
`

const ACTIONS = ['Shiny', 'Bắt', 'So sánh', 'Chia sẻ']

export default function PokemonSkeleton() {
  return (
    <PokemonSkeletonStyle
      className="pokemon-page pokemon-skeleton"
      data-tone="dark"
      role="status"
      aria-busy="true"
      data-page-skeleton
    >
      <span className="sr-only">Đang mở trang Pokémon…</span>
      <div className="column" aria-hidden="true">
        <span className="ghost back">
          <svg viewBox="0 0 24 24">
            <path d="M20 12H5M11 5l-7 7 7 7" />
          </svg>
          Quay lại
        </span>
        <div className="stage">
          <DexNumber className="stage-dex" rolling />
          <span className="pad" />
          <span className="catch-ball neighbour neighbour--left" />
          <span className="catch-ball ball" />
          <span className="catch-ball neighbour neighbour--right" />
        </div>
        <p className="name">???</p>
        <span className="bone bone--pill type" />
        <div className="actions">
          {ACTIONS.map((label) => (
            <span key={label} className="ghost">
              <span className="bone bone--round" />
              {label}
            </span>
          ))}
        </div>
        <div className="power">
          <span className="bone emblem" />
          <span className="ladder">
            {Array.from({ length: 10 }, (_, index) => (
              <i key={index} style={{ '--i': index } as CSSProperties} />
            ))}
          </span>
          <span className="bst">
            <span className="bone" style={{ width: 54, height: 22 }} />
            <span className="bone" style={{ width: 34, height: 11 }} />
          </span>
        </div>
        <div className="entry">
          <div className="bezel">
            <span className="lens" />
            <span className="leds">
              {Array.from({ length: 5 }, (_, index) => (
                <i key={index} />
              ))}
            </span>
          </div>
          <div className="screen">
            <span className="bone" style={{ width: '38%' }} />
            <span className="bone" style={{ width: '92%' }} />
            <span className="bone" style={{ width: '70%' }} />
            <span className="bone" style={{ width: '56%' }} />
          </div>
        </div>
        <span className="bone stats" />
      </div>
    </PokemonSkeletonStyle>
  )
}
