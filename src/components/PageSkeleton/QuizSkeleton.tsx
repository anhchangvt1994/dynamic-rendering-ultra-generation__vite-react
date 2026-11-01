import type { CSSProperties } from 'react'
import { QuizStyle } from 'pages/QuizPage/styles'
import { boneCss } from './bone'

// The page's own eyecatch layout (QuizStyle), so the two can not drift: the
// title, the bag and settings buttons, the stage with its turning sunburst
// and the four sticker slabs with their numbers are drawn for real; a "?"
// shadow waits on the stage. Only the turns, streak, records, settings and
// names wait.
const QuizSkeletonStyle = styled(QuizStyle)`
  ${boneCss}

  .qmark {
    width: min(34%, calc(var(--stage-h) * 0.4));
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
  .medal-num .bone {
    width: 34px;
    height: 16px;
    border-radius: 999px;
  }
  /* the prize orb hanging from the stage, empty (Prize.tsx's geometry) */
  .prize-slot {
    --orb: clamp(76px, 22cqw, 104px);
    position: relative;
    z-index: 6;
    display: grid;
    justify-items: center;
    gap: 6px;
    margin-top: calc(var(--orb) / -2);
  }
  .prize-orb {
    width: var(--orb);
    height: var(--orb);
    border-radius: 50%;
    background: radial-gradient(circle at 50% 30%, #1d3a66, #071225 75%);
    box-shadow:
      0 0 0 4px #071225,
      0 0 0 6px #5b7aa8;
  }
  .prize-slot .bone {
    width: 130px;
    height: 29px;
    border-radius: 999px;
  }
  .options .bone {
    width: 55%;
    height: 14px;
    --bone: rgba(23, 45, 69, 0.18);
    --shine: rgba(23, 45, 69, 0.08);
  }
  .settings .bone {
    height: 50px;
    border-radius: 12px;
  }
  .settings .bone + .bone {
    height: 50px;
    border-radius: 14px;
  }
  @media (min-width: 900px) {
    .medal-num .bone {
      height: 22px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .qmark {
      animation: none;
    }
  }
`

const GEAR =
  'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.4 2.7a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 0 0 1.7 1L11 21h4l.4-2.7a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z'

const BAG =
  'M9 6V5a3 3 0 0 1 6 0v1h2.5A2.5 2.5 0 0 1 20 8.5v10A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-10A2.5 2.5 0 0 1 6.5 6zm2 0h2V5a1 1 0 0 0-2 0zm-3 6v2h8v-2z'

export default function QuizSkeleton() {
  return (
    <QuizSkeletonStyle
      className="quiz-page"
      role="status"
      aria-busy="true"
      data-tone="dark"
      data-page-skeleton
    >
      <span className="sr-only">Đang chuẩn bị câu đố…</span>
      <div className="arena" aria-hidden="true">
        <header className="hud">
          <p className="title">
            <span>Who’s that</span> <span>Pokémon?</span>
          </p>
          <span className="bag-toggle">
            <svg viewBox="0 0 24 24">
              <path d={BAG} />
            </svg>
          </span>
          <span className="settings-toggle">
            <svg viewBox="0 0 24 24">
              <path d={GEAR} />
            </svg>
          </span>
        </header>
        <div className="trainer">
          {[
            ['turns', 'Lượt', 5],
            ['streak', 'Chuỗi', 10],
            ['records', 'Kỷ lục', 10],
          ].map(([kind, label, goal]) => (
            <span
              key={kind}
              className="meter"
              data-kind={kind}
              style={{ '--p': 0, '--n': goal } as CSSProperties}
            >
              <span className="meter-ring">
                <span className="meter-ball" />
              </span>
              <span className="meter-label">{label}</span>
            </span>
          ))}
        </div>
        <div className="settings">
          <span className="bone" />
          <span className="bone" />
          <p className="settings-note">Thay đổi áp dụng từ lượt sau.</p>
        </div>
        <div className="stage-wrap">
          <div className="stage">
            <span className="burst" />
            <span className="ring" />
            <svg className="qmark" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 16h-2v-2h2zm2.1-7.7-.9.9c-.7.7-1.2 1.3-1.2 2.8h-2v-.5c0-1.1.4-2.1 1.2-2.8l1.2-1.3a2 2 0 1 0-3.4-1.4H8a4 4 0 1 1 7.1 2.3z" />
            </svg>
          </div>
          <div className="prize-slot">
            <span className="prize-orb" />
            <span className="bone" />
          </div>
        </div>
        <ol className="options">
          {[1, 2, 3, 4].map((number, index) => (
            <li key={number}>
              <button
                type="button"
                tabIndex={-1}
                style={{ '--i': index } as CSSProperties}
              >
                <kbd>{number}</kbd>
                <span className="bone" />
              </button>
            </li>
          ))}
        </ol>
        <div className="result">
          <p className="result-line" />
        </div>
      </div>
    </QuizSkeletonStyle>
  )
}
