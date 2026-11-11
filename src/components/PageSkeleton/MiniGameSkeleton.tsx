import { GAMES } from 'pages/MiniGamePage/games/index.mjs'
import HubShell, { HubBooths } from 'pages/MiniGamePage/hub/HubShell'
import styled from 'styled-components'
import { boneCss } from './bone'

const Bones = styled.div`
  display: contents;
  ${boneCss}
`

const fill = <span className="bone bone-fill" />

/** /mini-game while it loads: the same shell and region boxes as the page. */
export default function MiniGameSkeleton() {
  return (
    <HubShell skeleton data-page-skeleton role="status" aria-busy="true" aria-label="Đang tải mini game…">
      <Bones>
        <section data-region="title">
          <span className="bone" style={{ width: 'min(320px, 80%)', height: 40, marginBottom: 12 }} />
          <span className="bone" style={{ width: 'min(440px, 92%)', height: 16 }} />
        </section>
        <HubBooths>
          {GAMES.map((g) => (
            <article key={g.id} data-region="booth">
              {fill}
            </article>
          ))}
        </HubBooths>
        <section data-region="quests">{fill}</section>
      </Bones>
    </HubShell>
  )
}
