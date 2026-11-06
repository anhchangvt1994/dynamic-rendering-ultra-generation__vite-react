import type { ReactNode } from 'react'
import { KitchenStyle } from 'pages/KitchenPage/styles'
import { publicMenu } from 'pages/KitchenPage/menu.mjs'
import { boneCss } from './bone'

// The menu a first visit gets (no secret in it): only its shape is read
// here, how many stats and ingredients each card has, never its words
const CARDS = publicMenu().dishes.map((dish) => ({
  secret: !dish.known,
  stats: Object.keys(dish.stats ?? {}).length,
  ingredients: new Set(dish.ingredients ?? []).size,
}))

const KitchenSkeletonStyle = styled(KitchenStyle)`
  ${boneCss}
  .kitchen-loading {
    display: contents;
  }
  /* blocks only: every row is held by KitchenStyle's shared geometry (the
     same line boxes as the loaded page), never by text in a fallback font */
  .chef-art {
    width: 150px;
    height: 150px;
  }
  .chef-line {
    border-color: transparent;
    background: none;
  }
  .chef-line .bone {
    width: 140px;
    height: 12px;
  }
  .kitchen-kicker,
  .kitchen-title,
  .kitchen-found {
    display: flex;
    align-items: center;
    text-shadow: none;
    -webkit-text-stroke: 0;
  }
  .kitchen-kicker .bone {
    width: 210px;
    height: 10px;
  }
  .kitchen-title .bone {
    width: min(340px, 80%);
    height: 38px;
    border-radius: 12px;
  }
  .kitchen-lede {
    display: grid;
    align-content: start;
  }
  .kitchen-lede .bone {
    height: 11px;
    margin-block: 5px;
  }
  .kitchen-lede .bone:last-child {
    width: 55%;
  }
  .flavor-key li {
    background: none;
    box-shadow: none;
  }
  .flavor-key .bone {
    width: 104px;
    height: 22px;
  }
  .kitchen-found .bone {
    width: 170px;
    height: 12px;
  }
  .kitchen-tabs > .bone {
    flex: 1 1 0;
    height: 48px;
    border-radius: 16px;
  }
  .menu-filter > .bone {
    height: 40px;
  }
  .menu-sort.bone {
    display: block;
    width: 100%;
    height: 44px;
    margin: 0;
  }
  @media (min-width: 960px) {
    .menu-sort.bone {
      width: 196px;
      margin-left: 16px;
    }
  }
  .menu-card {
    --dish: #b9c5d2;
  }
  .menu-head::before {
    display: none;
  }
  .dish-stage {
    background: var(--bone, #e3e9f0);
  }
  .menu-kicker {
    border-color: transparent;
    background: none;
    padding: 0;
  }
  .menu-kicker .bone {
    width: 84px;
    height: 22px;
    border-radius: 999px;
  }
  .dish-name .bone {
    width: 82%;
    height: 20px;
  }
  .stat-chips {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .stat-chips .bone {
    width: 76px;
    height: 21px;
  }
  .stat-chips:has(> :nth-child(4)) {
    min-height: 46px;
  }
  .recipe li {
    background: none;
    box-shadow: none;
    padding: 0;
  }
  .recipe .bone {
    grid-column: 1 / -1;
    width: 100%;
    height: 40px;
    border-radius: 999px;
  }
  .menu-hint .bone {
    height: 10px;
    margin-block: 5px;
  }
  .menu-hint .bone:last-child {
    width: 60%;
  }
  .skeleton-action {
    align-self: flex-end;
    width: 96px;
    height: 44px;
    margin-top: auto;
    border-radius: 14px;
  }
  /* the intro fits one line on a wide screen */
  @media (min-width: 1200px) {
    .kitchen-lede .bone:last-child {
      display: none;
    }
  }
  @media (max-width: 679px) {
    .chef-art {
      width: 110px;
      height: 110px;
    }
    .kitchen-kicker,
    .kitchen-title,
    .kitchen-found {
      justify-content: center;
    }
    .flavor-key .bone {
      width: 100%;
    }
    .kitchen-lede .bone:last-child {
      justify-self: center;
    }
  }
`

/** /che-bien while it loads: blocks the size of what is coming, no text. */
export default function KitchenSkeleton({
  note = '',
  back,
}: {
  line?: string
  note?: string
  /** the way back to the room, live while the rest loads */
  back?: ReactNode
}) {
  return (
    <KitchenSkeletonStyle className="kitchen-page" data-page-skeleton>
      {back}
      <div
        className="kitchen-loading"
        role="status"
        aria-busy="true"
        aria-label="Đang tải bếp…"
      >
        <header className="kitchen-hero" aria-hidden="true">
          <div className="chef">
            <span className="bone bone--round chef-art" />
            <div className="chef-line">
              <span className="bone" />
            </div>
          </div>
          <div className="kitchen-intro">
            <div className="kitchen-kicker">
              <span className="bone" />
            </div>
            <div className="kitchen-title">
              <span className="bone" />
            </div>
            <div className="kitchen-lede">
              <span className="bone" />
              <span className="bone" />
            </div>
            <ul className="flavor-key">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i}>
                  <span className="bone bone--pill" />
                </li>
              ))}
            </ul>
            <div className="kitchen-found">
              <span className="bone" />
            </div>
          </div>
        </header>
        <div className="kitchen-tabs" aria-hidden="true">
          <span className="bone" />
          <span className="bone" />
        </div>
        {note && (
          <p className="kitchen-note" role="alert">
            {note}
          </p>
        )}
        <section aria-hidden="true">
          <div className="menu-tools">
            <div className="menu-filter">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="bone bone--pill" />
              ))}
            </div>
            <span className="bone bone--pill menu-sort" />
          </div>
          <ol className="menu-list">
            {CARDS.map((card, i) => (
              <li
                key={i}
                className="menu-card"
                data-secret={card.secret || undefined}
              >
                <div className="menu-head">
                  <span className="dish-stage bone bone--round" />
                  <div className="menu-titles">
                    <div className="menu-kicker">
                      <span className="bone" />
                    </div>
                    <div className="dish-name">
                      <span className="bone" />
                    </div>
                  </div>
                </div>
                <div className="menu-body">
                  {card.secret ? (
                    <div className="menu-hint">
                      <span className="bone" />
                      <span className="bone" />
                    </div>
                  ) : (
                    <>
                      <ul className="stat-chips">
                        {Array.from({ length: card.stats }, (_, j) => (
                          <li key={j} className="bone bone--pill" />
                        ))}
                      </ul>
                      <ul className="recipe">
                        {Array.from({ length: card.ingredients }, (_, j) => (
                          <li key={j}>
                            <span className="bone" />
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <span className="bone skeleton-action" />
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </KitchenSkeletonStyle>
  )
}
