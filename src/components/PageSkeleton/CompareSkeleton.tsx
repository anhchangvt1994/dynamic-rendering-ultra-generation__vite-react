import styled from 'styled-components'
import { boneCss } from './bone'

// Mirrors CompareStyle: top bar, the versus card (tilted arena over two
// level plates), the verdict and the match-up cards.
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
  .topbar .bone {
    height: 44px;
    border-radius: 12px;
  }
  .topbar .title {
    justify-self: center;
    width: 150px;
    height: 26px;
    border-radius: 8px;
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
    width: 30%;
    max-width: 170px;
    aspect-ratio: 1;
    translate: -50% -50%;
  }
  .portrait--a {
    left: 25%;
  }
  .portrait--b {
    left: 75%;
  }
  .vs {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 56px;
    height: 56px;
    translate: -50% -50%;
    border: 3px solid rgba(255, 218, 85, 0.55);
    border-radius: 50%;
    background: #0b1626;
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
  .matchup .heading {
    width: 150px;
    height: 24px;
    margin: 0 auto 12px;
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
          <span className="bone" style={{ width: 106 }} />
          <span className="bone title" />
          <span className="bone" style={{ width: 44 }} />
        </div>
        <div className="versus" data-tone="dark">
          <div className="arena">
            <span className="half" />
            <span className="seam" />
            <span className="bone bone--round portrait portrait--a" />
            <span className="bone bone--round portrait portrait--b" />
            <span className="vs" />
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
          <span className="bone heading" />
          <div className="matchup-grid">
            <span className="bone" />
            <span className="bone" />
          </div>
        </div>
      </div>
    </CompareSkeletonStyle>
  )
}
