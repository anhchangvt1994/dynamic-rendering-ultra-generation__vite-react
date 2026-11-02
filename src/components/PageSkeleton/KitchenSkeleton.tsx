import KitchenHeader, { KitchenFilter } from 'pages/KitchenPage/KitchenHeader'
import { KitchenStyle } from 'pages/KitchenPage/styles'
import StatChips from 'pages/KitchenPage/StatChips'
import { publicMenu } from 'pages/KitchenPage/menu.mjs'
import { hintText } from 'pages/KitchenPage/kitchen.mjs'
import { itemById } from 'pages/QuizPage/items.mjs'
import { boneCss } from './bone'

const KitchenSkeletonStyle = styled(KitchenStyle)`
  ${boneCss}
  .menu-card .bone--round {
    grid-row: 1 / 3;
    align-self: start;
    width: 88px;
    height: 88px;
  }
  .menu-body {
    position: relative;
  }
  .menu-body > * {
    visibility: hidden;
  }
  .menu-body::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
    background: repeating-linear-gradient(
      to bottom,
      #e3e9f0 0 14px,
      transparent 14px 28px
    );
    opacity: 0.65;
  }
`

export default function KitchenSkeleton({
  line,
  note = '',
}: {
  line?: string
  note?: string
}) {
  return (
    <KitchenSkeletonStyle
      className="kitchen-page"
      aria-busy="true"
      aria-label="Đang tải bếp"
    >
      <KitchenHeader line={line} />
      <div className="kitchen-tabs">
        <button type="button" aria-selected="true" disabled>
          Thực đơn
        </button>
        <button type="button" aria-selected="false" disabled>
          Tự pha chế
        </button>
      </div>
      {note && (
        <p className="kitchen-note" role="status">
          {note}
        </p>
      )}
      <section>
        <KitchenFilter />
        <ol className="menu-list" aria-hidden="true">
          {publicMenu().dishes.map((dish) => (
            <li
              key={dish.id}
              className="menu-card"
              data-secret={!dish.known || undefined}
            >
              <span className="bone bone--round" />
              <div className="menu-body">
                <p className="menu-kicker">★ Món ăn</p>
                <h3 className="dish-name">{dish.name ?? '???'}</h3>
                {dish.known ? (
                  <>
                    <StatChips stats={dish.stats ?? {}} />
                    <ul className="recipe">
                      {[...new Set(dish.ingredients)].map((id) => (
                        <li key={id as string}>
                          <span className="portion-name">
                            {itemById(id).name}
                          </span>
                          <span className="portion-tray" />
                          <span className="portion-ticket" />
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="menu-hint">{hintText(dish)}</p>
                )}
              </div>
              <button
                type="button"
                className={dish.known ? 'cook' : 'try'}
                disabled
              >
                {dish.known ? 'Nấu' : 'Tự pha chế'}
              </button>
            </li>
          ))}
        </ol>
      </section>
    </KitchenSkeletonStyle>
  )
}
