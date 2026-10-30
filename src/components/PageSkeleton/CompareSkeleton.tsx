import styled from 'styled-components'
import { boneCss } from './bone'

// Mirrors CompareStyle: top bar, the versus card (tilted arena over two
// level plates), the verdict and the match-up cards. The title, the buttons'
// faces, the VS badge and the headings are drawn for real; the two
// fighters are Poké Balls squaring up, shaking in turn.
const CompareSkeletonStyle = styled.section`
  ${boneCss}
  max-width: 760px;
  margin: 0 auto;
  padding: 12px 16px 48px;

  .topbar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .back,
  .swap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface);
    font-size: 13px;
    font-weight: 700;
  }
  .back {
    padding: 0 14px 0 10px;
  }
  .swap {
    width: 44px;
    opacity: 0.4;
  }
  .topbar svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(20px, 6vw, 32px);
    line-height: 1.1 !important;
    text-align: center;
    text-transform: uppercase;
  }
  .versus {
    container-type: inline-size;
    overflow: hidden;
    border-radius: 20px;
    background: #0b1626;
    box-shadow: 0 18px 40px rgba(11, 22, 38, 0.22);
  }
  .arena {
    position: relative;
    height: clamp(150px, 46cqi, 250px);
    overflow: hidden;
    background: #2b3448;
  }
  .half {
    position: absolute;
    right: 50%;
    top: 50%;
    width: 300%;
    height: 600%;
    translate: 0 -50%;
    transform-origin: 100% 50%;
    rotate: 14deg;
    background: #3a3242;
  }
  .seam {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 4px;
    height: 200%;
    translate: -50% -50%;
    rotate: 14deg;
    background: rgba(255, 218, 85, 0.45);
  }
  .portrait {
    position: absolute;
    top: 50%;
    width: 21%;
    max-width: 104px;
    translate: -50% -50%;
  }
  /* B answers A: the same shake, half a beat later, mirrored */
  .portrait--b {
    --i: 6;
    scale: -1 1;
  }
  .portrait--a {
    left: 25%;
  }
  .portrait--b {
    left: 75%;
  }
  .vs {
    position: absolute;
    z-index: 3;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    display: grid;
    place-items: center;
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: radial-gradient(
      circle at 35% 30%,
      #fff2b0,
      #ffda55 55%,
      #f2b600
    );
    box-shadow:
      0 0 0 3px #0b1626,
      0 6px 18px rgba(0, 0, 0, 0.45);
    color: #0b1626;
    font-family: var(--font-display);
    font-size: 18px;
    line-height: 1 !important;
  }
  /* a shockwave every beat, in time with the balls */
  .vs::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid #ffda55;
    border-radius: 50%;
    animation: vs-wave 1.6s ease-out infinite;
  }
  @keyframes vs-wave {
    from {
      opacity: 0.9;
    }
    to {
      opacity: 0;
      scale: 2.2;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .vs::after {
      animation: none;
      opacity: 0;
    }
  }
  .plates {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 4px solid rgba(255, 218, 85, 0.55);
  }
  .plate {
    display: grid;
    justify-items: center;
    align-content: start;
    gap: 10px;
    min-height: 120px;
    padding: 16px 10px;
  }
  .plate + .plate {
    border-left: 2px solid rgba(255, 255, 255, 0.08);
  }
  .plate .name {
    width: 70%;
    height: 22px;
  }
  .chips {
    display: flex;
    gap: 6px;
  }
  .verdict {
    display: grid;
    justify-items: center;
    gap: 8px;
    margin-top: 18px;
  }
  /* one line on wide screens, two on phones */
  .verdict-text {
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 9px;
    width: 100%;
    min-height: 26px;
  }
  .verdict-text .bone {
    width: min(395px, 90%);
    height: 18px;
  }
  .verdict-text .bone + .bone {
    display: none;
    width: 55%;
  }
  .verdict .share {
    width: 164px;
    height: 44px;
    margin-top: 2px;
  }
  @media (max-width: 600px) {
    .plate {
      min-height: 130px;
    }
    .verdict-text {
      min-height: 51px;
    }
    .verdict-text .bone + .bone {
      display: block;
    }
  }
  @media (min-width: 960px) {
    max-width: 792px;
  }
  .matchup {
    margin-top: 22px;
  }
  .matchup h2 {
    margin: 0 0 10px;
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 400;
    text-align: center;
    text-transform: uppercase;
  }
  .matchup-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .matchup-grid .bone {
    height: 156px;
    border-radius: 14px;
  }
`

function PlateBones() {
  return (
    <div className="plate">
      <span className="bone name" />
      <span className="bone" style={{ width: 92, height: 22 }} />
      <span className="chips">
        <span className="bone bone--pill" style={{ width: 44, height: 20 }} />
        <span className="bone bone--pill" style={{ width: 44, height: 20 }} />
      </span>
    </div>
  )
}

export default function CompareSkeleton() {
  return (
    <CompareSkeletonStyle role="status" aria-busy="true">
      <span className="sr-only">Đang dựng sàn đấu…</span>
      <div aria-hidden="true">
        <div className="topbar">
          <span className="back">
            <svg viewBox="0 0 24 24">
              <path d="M20 12H5M11 5l-7 7 7 7" />
            </svg>
            Quay lại
          </span>
          <p className="title">So sánh</p>
          <span className="swap">
            <svg viewBox="0 0 24 24">
              <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
            </svg>
          </span>
        </div>
        <div className="versus" data-tone="dark">
          <div className="arena">
            <span className="half" />
            <span className="seam" />
            <span className="catch-ball portrait portrait--a" />
            <span className="catch-ball portrait portrait--b" />
            <span className="vs">VS</span>
          </div>
          <div className="plates">
            <PlateBones />
            <PlateBones />
          </div>
        </div>
        <div className="verdict">
          <span className="verdict-text">
            <span className="bone" />
            <span className="bone" />
          </span>
          <span className="bone bone--pill share" />
        </div>
        <div className="matchup">
          <h2>Ai khắc ai?</h2>
          <div className="matchup-grid">
            <span className="bone" />
            <span className="bone" />
          </div>
        </div>
      </div>
    </CompareSkeletonStyle>
  )
}
