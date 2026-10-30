import styled from 'styled-components'
import { boneCss } from './bone'

// Mirrors QuizStyle. The stage is drawn for real (it never depends on
// data): the blue spotlight with a "?" shadow breathing in it.
const QuizSkeletonStyle = styled.section`
  ${boneCss}
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 16px 32px;

  .intro {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    /* the real title's tilt and shadow make the row 1.5× the font */
    min-height: calc(clamp(34px, 9vw, 56px) * 1.5);
    margin-bottom: 14px;
  }
  .title {
    width: clamp(180px, 50vw, 300px);
    height: clamp(34px, 9vw, 56px);
    border-radius: 12px;
    rotate: -3deg;
    transform-origin: left bottom;
    --bone: rgba(255, 218, 85, 0.4);
    --shine: rgba(255, 218, 85, 0.7);
  }
  .score {
    display: flex;
    gap: 14px;
  }
  .score > div {
    display: grid;
    justify-items: end;
    gap: 6px;
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
    width: 251px;
    height: 50px;
    border-radius: 14px;
  }
  .stage {
    display: grid;
    place-items: center;
    aspect-ratio: 4 / 3;
    max-width: 560px;
    max-height: 420px;
    border-radius: var(--radius-card, 20px);
    background: radial-gradient(circle at 50% 46%, #6fd0ff 0, #1e5bb8 70%);
    box-shadow:
      inset 0 0 0 4px #ffda55,
      0 18px 34px rgba(23, 45, 69, 0.25);
  }
  .stage svg {
    width: 38%;
    fill: #0b1626;
    opacity: 0.85;
    animation: quiz-shadow 1.6s ease-in-out infinite alternate;
  }
  @keyframes quiz-shadow {
    to {
      opacity: 0.55;
      scale: 0.96;
    }
  }
  .options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 14px;
  }
  .options .bone {
    height: 56px;
    border-radius: 12px;
  }
  @media (max-width: 680px) {
    .select {
      height: 44px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
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
          <span className="bone title" />
          <div className="score">
            {[0, 1].map((index) => (
              <div key={index}>
                <span className="bone" style={{ width: 36, height: 12 }} />
                <span className="bone" style={{ width: 24, height: 28 }} />
              </div>
            ))}
          </div>
        </div>
        <div className="settings">
          <span className="bone select" />
          <span className="bone mode" />
        </div>
        <div className="stage">
          <svg viewBox="0 0 24 24">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 16h-2v-2h2zm2.1-7.7-.9.9c-.7.7-1.2 1.3-1.2 2.8h-2v-.5c0-1.1.4-2.1 1.2-2.8l1.2-1.3a2 2 0 1 0-3.4-1.4H8a4 4 0 1 1 7.1 2.3z" />
          </svg>
        </div>
        <div className="options">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} className="bone" />
          ))}
        </div>
      </div>
    </QuizSkeletonStyle>
  )
}
