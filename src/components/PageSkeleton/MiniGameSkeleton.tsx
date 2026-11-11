import { GAMES } from 'pages/MiniGamePage/games/index.mjs'
import { MiniGamePageStyle } from 'pages/MiniGamePage/pageStyles'
import { boneCss } from './bone'

const MiniGameSkeletonStyle = styled(MiniGamePageStyle)`
  ${boneCss}
`

/** /mini-game while it loads: the page's shell, blocks where the words go. */
export default function MiniGameSkeleton() {
  return (
    <MiniGameSkeletonStyle data-page-skeleton>
      <div role="status" aria-busy="true" aria-label="Đang tải mini game…">
        <p className="mgp-kicker">
          <span className="bone" style={{ width: 90, height: 12 }} />
        </p>
        <h1>
          <span className="bone" style={{ width: 'min(300px, 80%)', height: 30 }} />
        </h1>
        <p className="mgp-sub">
          <span className="bone" style={{ width: 'min(420px, 90%)', height: 14, marginBlock: 5 }} />
        </p>
        <ul className="mgp-list" aria-hidden="true">
          {GAMES.map((g) => (
            <li key={g.id} className="mgp-card">
              <span className="bone" style={{ width: '60%', height: 22 }} />
              <p>
                <span className="bone" style={{ height: 12, marginBlock: 5 }} />
                <span className="bone" style={{ width: '70%', height: 12, marginBlock: 5 }} />
              </p>
              <div className="mgp-turns">
                <span className="bone" style={{ width: 150, height: 14 }} />
              </div>
              <span className="bone" style={{ height: 48, borderRadius: 14 }} />
            </li>
          ))}
        </ul>
      </div>
    </MiniGameSkeletonStyle>
  )
}
