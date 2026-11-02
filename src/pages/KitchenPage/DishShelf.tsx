import styled from 'styled-components'
import DishArt from './DishArt'
import StatChips from './StatChips'
import type { Menu } from './engine/types'

/**
 * The bag's "Món ăn" pocket: the dishes cooked in the kitchen, each with its
 * drawing, count and what it will give (feeding comes with the care
 * feature). None yet: the way to the kitchen.
 */
export default function DishShelf({
  dishes,
  menu,
}: {
  dishes: Record<string, number>
  menu: Menu | null
}) {
  const rows = (menu?.dishes ?? []).filter((dish) => (dishes[dish.id] ?? 0) > 0)
  return (
    <DishShelfStyle className="dish-shelf">
      {rows.length ? (
        <ol aria-label="Món ăn">
          {rows.map((dish) => (
            <li key={dish.id} className="dish-row">
              <DishArt kind={dish.kind} top={dish.top} size={64} />
              <div>
                <strong>{dish.name}</strong>
                {dish.stats && <StatChips stats={dish.stats} />}
              </div>
              <b className="dish-count">{`×${dishes[dish.id]}`}</b>
            </li>
          ))}
        </ol>
      ) : (
        <div className="dish-empty">
          <strong>Chưa có món ăn nào</strong>
          <p>
            Mang quả mọng, đồ uống và bánh ngọt trong túi vào bếp, nấu thành món
            ăn tăng chỉ số cho Pokémon.
          </p>
          <LinkCustom to="/che-bien">Vào bếp ►</LinkCustom>
        </div>
      )}
    </DishShelfStyle>
  )
}

const DishShelfStyle = styled.div`
  ol {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .dish-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 10px 14px 10px 8px;
    border-radius: 18px;
    background: #fff8ef;
    color: #172d45;
  }
  .dish-row strong {
    display: block;
    margin-bottom: 4px;
    font-family: var(--font-display);
    font-size: 16px;
  }
  .dish-count {
    font-size: 16px;
  }
  .dish-empty {
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 24px 16px;
    text-align: center;
  }
  .dish-empty p {
    margin: 0;
    color: var(--dim-text, rgba(255, 255, 255, 0.7));
  }
  .dish-empty a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 18px;
    border-radius: 14px;
    background: #ff8fb3;
    color: #172d45;
    font-family: var(--font-display);
  }
`
