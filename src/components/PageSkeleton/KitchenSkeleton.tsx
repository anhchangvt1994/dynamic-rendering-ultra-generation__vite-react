import { KitchenStyle } from 'pages/KitchenPage/styles'
import { boneCss } from './bone'

// The kitchen's own layout (KitchenStyle): the hero, the tabs and menu
// cards at their sizes; the chef, the dishes and their text wait.
const KitchenSkeletonStyle = styled(KitchenStyle)`
  ${boneCss}
  .chef .bone {
    width: 150px;
    height: 150px;
  }
  .menu-card .bone--round {
    grid-row: 1 / 3;
    width: 88px;
    height: 88px;
  }
  .lines {
    display: grid;
    gap: 8px;
  }
  .lines .bone {
    height: 14px;
  }
  @media (max-width: 599px) {
    .chef .bone {
      width: 110px;
      height: 110px;
    }
  }
`

export default function KitchenSkeleton() {
  return (
    <KitchenSkeletonStyle className="kitchen-page" aria-busy="true">
      <header className="kitchen-hero">
        <div className="chef">
          <span className="bone bone--round" />
        </div>
        <div className="kitchen-intro">
          <p className="kitchen-kicker">Tiệm bếp của Nhà Huấn luyện</p>
          <h1 className="kitchen-title">Bếp Pokémon</h1>
          <div className="lines">
            <span className="bone" style={{ width: '90%' }} />
            <span className="bone" style={{ width: '70%' }} />
          </div>
        </div>
      </header>
      <div className="kitchen-tabs">
        <button type="button" disabled>
          Thực đơn
        </button>
        <button type="button" disabled>
          Tự pha chế
        </button>
      </div>
      <ol className="menu-list">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="menu-card">
            <span className="bone bone--round" />
            <div className="lines">
              <span className="bone" style={{ width: '40%' }} />
              <span className="bone" style={{ width: '75%' }} />
              <span className="bone" style={{ width: '60%' }} />
            </div>
          </li>
        ))}
      </ol>
    </KitchenSkeletonStyle>
  )
}
