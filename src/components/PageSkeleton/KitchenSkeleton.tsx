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
    flex: 1 1 88px;
    height: 40px;
  }
  .menu-card > .bone--round {
    grid-row: 1 / 3;
    width: 88px;
    height: 88px;
  }
  .menu-kicker .bone {
    width: 70px;
    height: 10px;
  }
  .dish-name .bone {
    width: 82%;
    height: 18px;
    margin-top: 3px;
  }
  .stat-chips {
    display: flex;
    flex-wrap: wrap;
    align-content: start;
    gap: 4px;
    padding: 0;
    list-style: none;
  }
  .stat-chips .bone {
    width: 76px;
    height: 20px;
  }
  .recipe .bone {
    grid-column: 1 / -1;
    width: 100%;
    height: 28px;
    border-radius: 9px;
  }
  .menu-hint .bone {
    height: 10px;
    margin-block: 5px;
  }
  .menu-hint .bone:last-child {
    width: 60%;
  }
  .skeleton-action {
    grid-column: 2;
    grid-row: 5;
    align-self: end;
    justify-self: end;
    width: 84px;
    height: 44px;
    margin-top: 6px;
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
    .flavor-key li:last-child .bone {
      width: 150px;
    }
    .kitchen-lede .bone:last-child {
      justify-self: center;
    }
  }
`

/** /che-bien while it loads: blocks the size of what is coming, no text. */
export default function KitchenSkeleton({
  note = '',
}: {
  line?: string
  note?: string
}) {
  return (
    <KitchenSkeletonStyle
      className="kitchen-page"
      data-page-skeleton
      aria-busy="true"
      role="status"
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
            {Array.from({ length: 5 }, (_, i) => (
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
        <div className="menu-filter">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="bone bone--pill" />
          ))}
        </div>
        <ol className="menu-list">
          {CARDS.map((card, i) => (
            <li
              key={i}
              className="menu-card"
              data-secret={card.secret || undefined}
            >
              <span className="bone bone--round" />
              <div className="menu-body">
                <div className="menu-kicker">
                  <span className="bone" />
                </div>
                <div className="dish-name">
                  <span className="bone" />
                </div>
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
              </div>
              <span className="bone skeleton-action" />
            </li>
          ))}
        </ol>
      </section>
    </KitchenSkeletonStyle>
  )
}
