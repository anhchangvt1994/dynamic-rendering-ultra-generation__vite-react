import styled from 'styled-components'
import { boneCss } from './bone'

// Mirrors QuizStyle. The title, the score labels, the mode switch and the
// stage never depend on data, so they are drawn for real: the spotlight
// turns its rays and a "?" shadow waits in it. Only the generation picker,
// the scores and the four answers wait.
const QuizSkeletonStyle = styled.section`
  ${boneCss}
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 16px 32px;
  color: var(--ink);

  .intro {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    /* the title's tilt and shadow make the row 1.5× the font */
    min-height: calc(clamp(34px, 9vw, 56px) * 1.5);
    margin-bottom: 14px;
  }
  .title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(34px, 9vw, 56px);
    line-height: 1 !important;
    letter-spacing: -0.01em;
    text-transform: uppercase;
    color: var(--yellow, #ffda55);
    -webkit-text-stroke: 2px #2a4c8f;
    paint-order: stroke fill;
    text-shadow:
      0 4px 0 #2a4c8f,
      0 10px 18px rgba(23, 45, 69, 0.25);
    transform: rotate(-3deg);
    transform-origin: left bottom;
  }
  .title span {
    color: #fff;
  }
  .score {
    display: flex;
    gap: 14px;
  }
  .score > span {
    display: grid;
    justify-items: end;
    gap: 4px;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
  }
  .settings {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 12px;
    margin-bottom: 14px;
  }
  .select {
    flex: 1 1 200px;
    height: 50px;
    border-radius: 12px;
  }
  .mode {
    display: inline-flex;
    padding: 3px;
    border-radius: 14px;
    background: var(--surface, #fff);
    box-shadow: inset 0 0 0 1px var(--line, #dfe6ed);
  }
  .mode span {
    display: grid;
    place-items: center;
    min-height: 44px;
    padding: 0 14px;
    border-radius: 11px;
    color: var(--muted);
    font-size: 13px;
    font-weight: 700;
  }
  .mode span:first-child {
    background: var(--ink, #172d45);
    color: #fff;
  }

  .stage {
    position: relative;
    display: grid;
    place-items: center;
    aspect-ratio: 4 / 3;
    max-width: 560px;
    max-height: 420px;
    overflow: hidden;
    border-radius: var(--radius-card, 20px);
    background: radial-gradient(circle at 50% 46%, #6fd0ff 0, #1e5bb8 70%);
    box-shadow:
      inset 0 0 0 4px #ffda55,
      0 18px 34px rgba(23, 45, 69, 0.25);
    isolation: isolate;
  }
  /* the anime's spotlight rays, turning slowly */
  .stage::before {
    content: '';
    position: absolute;
    inset: -50%;
    z-index: -1;
    background: repeating-conic-gradient(
      from 0deg at 50% 50%,
      rgba(255, 255, 255, 0.13) 0 7deg,
      transparent 7deg 20deg
    );
    animation: quiz-rays 18s linear infinite;
  }
  @keyframes quiz-rays {
    to {
      rotate: 1turn;
    }
  }
  .stage svg {
    width: 34%;
    fill: #0b1626;
    filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.55))
      drop-shadow(0 0 18px rgba(120, 200, 255, 0.6));
    animation: quiz-shadow 1.6s ease-in-out infinite alternate;
  }
  @keyframes quiz-shadow {
    to {
      scale: 0.94;
      rotate: -6deg;
    }
  }
  .options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 14px;
  }
  .option {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 56px;
    padding: 0 10px;
    border-radius: 12px;
    background: var(--surface);
    box-shadow:
      inset 0 0 0 1px var(--line),
      0 3px 0 var(--line);
  }
  .option b {
    display: grid;
    place-items: center;
    flex: none;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #eef2f7;
    color: var(--muted);
    font-size: 13px;
  }
  .option .bone {
    width: 55%;
    height: 14px;
  }
  @media (max-width: 680px) {
    .select {
      height: 44px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .stage::before,
    .stage svg {
      animation: none;
    }
  }
`

export default function QuizSkeleton() {
  return (
    <QuizSkeletonStyle role="status" aria-busy="true">
      <span className="sr-only">Đang chuẩn bị câu đố…</span>
      <div aria-hidden="true">
        <div className="intro">
          <p className="title">
            <span>Ai</span> đây?
          </p>
          <div className="score">
            {['Chuỗi', 'Kỷ lục'].map((label) => (
              <span key={label}>
                {label}
                <span className="bone" style={{ width: 22, height: 26 }} />
              </span>
            ))}
          </div>
        </div>
        <div className="settings">
          <span className="bone select" />
          <span className="mode">
            <span>Dễ · 4 lựa chọn</span>
            <span>Khó · tự gõ tên</span>
          </span>
        </div>
        <div className="stage">
          <svg viewBox="0 0 24 24">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 16h-2v-2h2zm2.1-7.7-.9.9c-.7.7-1.2 1.3-1.2 2.8h-2v-.5c0-1.1.4-2.1 1.2-2.8l1.2-1.3a2 2 0 1 0-3.4-1.4H8a4 4 0 1 1 7.1 2.3z" />
          </svg>
        </div>
        <div className="options">
          {[1, 2, 3, 4].map((number) => (
            <span key={number} className="option">
              <b>{number}</b>
              <span className="bone" />
            </span>
          ))}
        </div>
      </div>
    </QuizSkeletonStyle>
  )
}
