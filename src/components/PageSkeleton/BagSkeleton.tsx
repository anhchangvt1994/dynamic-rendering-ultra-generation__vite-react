import { BagStyle } from 'pages/BagPage/styles'
import { boneCss } from './bone'

// The bag page's own layout (BagStyle): the hero, the pockets and the menu
// rows are drawn for real at their sizes; the bag, numbers and names wait
// (dashes and zeros where the numbers will be, so nothing moves).
// the pockets and sorts by name only: bag.mjs would bring the whole item
// catalogue into the skeletons' chunk
const POCKETS = [
  'Tất cả',
  'Tăng chỉ số',
  'Thân thiện',
  'Tiến hoá',
  'Hồi phục',
  'Chiêu thức',
]
const SORTS = ['Giá trị', 'Số lượng', 'Tên']

const BagSkeletonStyle = styled(BagStyle)`
  ${boneCss}

  /* the sort's buttons, as spans of the same size */
  .sort-item {
    display: grid;
    place-items: center;
    min-height: 36px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 800;
    color: var(--dim-text);
  }
  .bag-art .bone {
    width: 100%;
    height: 100%;
    border-radius: 30%;
  }
  .bag-stats dd,
  .tier-legend {
    color: var(--dim-text);
  }
  .slot .bone {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }
  .row-name .bone {
    width: 60%;
    height: 14px;
  }
  .row-meta .bone {
    width: 40%;
    height: 10px;
  }
`

export default function BagSkeleton() {
  return (
    <BagSkeletonStyle
      className="bag-page"
      role="status"
      aria-busy="true"
      data-tone="dark"
      data-page-skeleton
    >
      <span className="sr-only">Đang mở túi đồ…</span>
      <header className="bag-hero" aria-hidden="true">
        <div className="bag-art">
          <span className="bone" />
        </div>
        <div className="bag-intro">
          <p className="bag-kicker">Túi của Nhà Huấn luyện</p>
          <p className="bag-title">Túi đồ</p>
          <dl className="bag-stats">
            {['Vật phẩm', 'Sưu tầm', 'Quý hiếm+'].map((label) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>—</dd>
              </div>
            ))}
          </dl>
          <span className="tier-bar" />
          <ul className="tier-legend">
            {['★★★★', '★★★', '★★', '★'].map((stars) => (
              <li key={stars}>{stars} 0</li>
            ))}
          </ul>
        </div>
      </header>
      <div className="pockets" aria-hidden="true">
        {POCKETS.map((pocket) => (
          <span key={pocket} className="pocket">
            {pocket}
            <b>…</b>
          </span>
        ))}
      </div>
      <div className="bag-toolbar" aria-hidden="true">
        <span className="sort">
          {SORTS.map((sort) => (
            <span key={sort} className="sort-item">
              {sort}
            </span>
          ))}
        </span>
        <span className="toggle">
          <span />
          Hiện món chưa có
        </span>
      </div>
      <ol className="bag-list" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i}>
            <span className="bag-row">
              <span className="slot">
                <span className="bone" />
              </span>
              <span className="row-text">
                <span className="row-name">
                  <span className="bone" />
                </span>
                <span className="row-meta">
                  <span className="bone" />
                </span>
              </span>
            </span>
          </li>
        ))}
      </ol>
    </BagSkeletonStyle>
  )
}
