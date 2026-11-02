import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { TIERS, itemSprite } from 'pages/QuizPage/items.mjs'
import { COMBO_AT, badgeCount, fullCount } from 'pages/QuizPage/progress.mjs'
import { useAccount } from 'app/supabase/account'
import { useBagStore } from './bagStore'
import ItemDialog, { ItemCard } from 'pages/QuizPage/ItemDialog'
import {
  POCKETS,
  SORTS,
  bagRows,
  bagStats,
  pocketOf,
  rowCount,
} from './bag.mjs'
import { BagStyle } from './styles'
import { useDishes } from 'pages/KitchenPage/useDishes'
import DishShelf from 'pages/KitchenPage/DishShelf'

const WIDE = '(min-width: 900px)'
const DISHES_POCKET = { id: 'dishes', label: 'Món ăn', color: '#f07cb4' }

/** From 900px the chosen item's card stands beside the list. */
function useWide() {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const query = matchMedia(WIDE)
    const update = () => setWide(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return wide
}

function Backpack() {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true">
      {/* straps */}
      <path
        d="M58 70c-18 6-24 40-18 80M142 70c18 6 24 40 18 80"
        fill="none"
        stroke="#172d45"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* handle */}
      <path
        d="M80 52c0-26 40-26 40 0"
        fill="none"
        stroke="#172d45"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* body */}
      <rect
        className="bag-body"
        x="40"
        y="50"
        width="120"
        height="134"
        rx="34"
        stroke="#172d45"
        strokeWidth="6"
      />
      <path
        className="bag-shade"
        d="M132 56c16 6 25 20 25 40v54c0 16-8 28-22 31z"
      />
      {/* front pocket, with a Poké Ball patch */}
      <rect
        className="bag-shade"
        x="60"
        y="118"
        width="80"
        height="52"
        rx="16"
        stroke="#172d45"
        strokeWidth="5"
      />
      <rect
        x="66"
        y="124"
        width="68"
        height="40"
        rx="11"
        fill="none"
        stroke="rgba(255,255,255,.45)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <circle
        cx="100"
        cy="144"
        r="12"
        fill="#f4f4f4"
        stroke="#172d45"
        strokeWidth="4"
      />
      <path
        d="M88 144a12 12 0 0 1 24 0z"
        fill="#e5483b"
        stroke="#172d45"
        strokeWidth="4"
      />
      <circle
        cx="100"
        cy="144"
        r="4"
        fill="#f4f4f4"
        stroke="#172d45"
        strokeWidth="3"
      />
      {/* the flap, with its buckle: it lifts when a pocket opens */}
      <g className="bag-flap">
        <path
          className="bag-light"
          d="M40 86c0-22 14-36 36-36h48c22 0 36 14 36 36v10c-36 18-84 18-120 0z"
          stroke="#172d45"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <path
          d="M56 70c6-8 14-11 26-11"
          fill="none"
          stroke="rgba(255,255,255,.7)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <rect
          x="88"
          y="94"
          width="24"
          height="26"
          rx="6"
          fill="#ffda55"
          stroke="#172d45"
          strokeWidth="5"
        />
        <rect x="96" y="102" width="8" height="10" rx="2" fill="#172d45" />
      </g>
    </svg>
  )
}

/**
 * The bag: every gift won in "Who's That Pokémon?", by pocket. Kept on the
 * account (this browser's under yarn dev); the items will be used by the
 * raising features to come.
 */
export default function BagPage() {
  setSeoTag({
    title: 'Túi đồ – Vật phẩm của bạn | Pokédex',
    description:
      'Túi đồ của Nhà Huấn luyện: Rare Candy, đá tiến hoá, TM, quả mọng… nhận được khi chơi Who’s That Pokémon?',
    robots: 'noindex, follow',
  })

  // the account's bag (signed in), this browser's (yarn dev), none (guest)
  const { bag, mode } = useBagStore()
  const location = useLocation()
  const accounts = useAccount().status !== 'off'
  const [pocket, setPocket] = useState('all')
  const [sort, setSort] = useState('value')
  const [missing, setMissing] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [dialog, setDialog] = useState<string | null>(null)

  const stats = useMemo(() => bagStats(bag ?? {}), [bag])
  const rows = useMemo(
    () => bagRows(bag ?? {}, { pocket, sort, missing }),
    [bag, pocket, sort, missing]
  )
  // the kitchen's dishes: a pocket of their own, after the quiz's
  const onDishes = pocket === DISHES_POCKET.id
  const { dishes, menu } = useDishes(onDishes)
  const dishTotal = Object.values(dishes ?? {}).reduce((sum, n) => sum + n, 0)
  const current = onDishes ? DISHES_POCKET : pocketOf(pocket)
  // the card beside the list shows the chosen item, else the first one
  const shown =
    rows.find((row) => row.item.id === selected)?.item.id ?? rows[0]?.item.id

  const wide = useWide()
  // a tap picks an item and opens its actions; a second tap closes them
  const choose = (id: string) =>
    setSelected((current) => (current === id ? null : id))
  const empty = bag !== null && stats.total === 0

  return (
    <BagStyle
      className="bag-page"
      style={{ '--pocket': current.color } as CSSProperties}
    >
      <header className="bag-hero">
        <div key={pocket} className="bag-art">
          <Backpack />
          <i aria-hidden="true" />
          <i aria-hidden="true" />
          <i aria-hidden="true" />
        </div>
        <div className="bag-intro">
          <p className="bag-kicker">Túi của Nhà Huấn luyện</p>
          <h1 className="bag-title">Túi đồ</h1>
          <dl className="bag-stats">
            <div>
              <dt>Vật phẩm</dt>
              <dd>{bag ? fullCount(stats.total) : '…'}</dd>
            </div>
            <div>
              <dt>Sưu tầm</dt>
              <dd>
                {stats.kinds}
                <small>/{stats.catalogue}</small>
              </dd>
            </div>
            <div>
              <dt>Quý hiếm+</dt>
              <dd>{fullCount(stats.valuable)}</dd>
            </div>
          </dl>
          {stats.total > 0 && (
            <>
              <span className="tier-bar" aria-hidden="true">
                {[4, 3, 2, 1].map(
                  (tier) =>
                    stats.tiers[tier] > 0 && (
                      <i
                        key={tier}
                        style={
                          {
                            '--share': stats.tiers[tier],
                            '--tier': TIERS[tier].color,
                          } as CSSProperties
                        }
                      />
                    )
                )}
              </span>
              <ul className="tier-legend" aria-label="Theo độ hiếm">
                {[4, 3, 2, 1].map((tier) => (
                  <li
                    key={tier}
                    style={{ '--tier': TIERS[tier].color } as CSSProperties}
                  >
                    <b>{'★'.repeat(tier)}</b> {fullCount(stats.tiers[tier])}
                    <span className="sr-only"> {TIERS[tier].label}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </header>

      <nav className="pockets" aria-label="Ngăn túi">
        {POCKETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="pocket"
            aria-pressed={pocket === p.id}
            onClick={() => setPocket(p.id)}
            style={{ '--c': p.color } as CSSProperties}
          >
            {p.label}
            <b>
              <span className="sr-only">, </span>
              {badgeCount(stats.pockets[p.id] ?? 0)}
            </b>
          </button>
        ))}
        <button
          type="button"
          className="pocket"
          aria-pressed={onDishes}
          onClick={() => setPocket(DISHES_POCKET.id)}
          style={{ '--c': DISHES_POCKET.color } as CSSProperties}
        >
          {DISHES_POCKET.label}
          <b>
            <span className="sr-only">, </span>
            {badgeCount(dishTotal)}
          </b>
        </button>
      </nav>

      {/* nothing to sort in an empty bag: the empty state offers the catalogue */}
      {(!empty || missing) && !onDishes && (
        <div className="bag-toolbar">
          <div className="sort" role="group" aria-label="Sắp xếp">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={sort === s.id}
                onClick={() => setSort(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="toggle"
            aria-pressed={missing}
            onClick={() => setMissing((value) => !value)}
          >
            <span aria-hidden="true" />
            Hiện món chưa có
          </button>
        </div>
      )}

      {mode === 'guest' ? (
        // a guest: items are kept on an account
        <div className="bag-empty bag-guest">
          <strong>Đăng nhập để có túi đồ</strong>
          <p>
            Quà từ Who’s That Pokémon? được cất vào túi đồ của tài khoản: Rare
            Candy, đá tiến hoá, TM… không ai sửa được, không mất khi đổi máy.
          </p>
          {accounts && (
            <LinkCustom
              className="play"
              to="/dang-nhap"
              state={{ from: location.pathname }}
            >
              Đăng nhập ►
            </LinkCustom>
          )}
          <LinkCustom className="bag-guest-play" to="/whos-that-pokemon">
            Chơi thử không cần đăng nhập
          </LinkCustom>
        </div>
      ) : onDishes ? (
        // the menu names the dishes: none cooked needs no menu
        dishes &&
        (menu || !dishTotal) && <DishShelf dishes={dishes} menu={menu} />
      ) : bag === null ? null : rows.length ? (
        <div className="bag-body">
          <ol className="bag-list" aria-label={`Ngăn ${current.label}`}>
            {rows.map(({ item, count }, index) => (
              <li
                key={item.id}
                data-open={
                  (item.id === selected && (count > 0 || !wide)) || undefined
                }
              >
                <button
                  type="button"
                  className="bag-row"
                  data-missing={count === 0 || undefined}
                  aria-current={
                    item.id === selected ||
                    (wide && item.id === shown) ||
                    undefined
                  }
                  aria-expanded={item.id === selected}
                  aria-controls={
                    item.id === selected ? `bag-actions-${item.id}` : undefined
                  }
                  onClick={() => choose(item.id)}
                  style={
                    {
                      '--tier': TIERS[item.tier].color,
                      '--i': index,
                    } as CSSProperties
                  }
                >
                  <span className="slot" aria-hidden="true">
                    <img
                      src={itemSprite(item.id)}
                      alt=""
                      width={30}
                      height={30}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="row-text">
                    <span className="row-name">{item.name}</span>
                    <span className="row-meta">
                      <b>{'★'.repeat(item.tier)}</b>{' '}
                      <span className="row-tier">{TIERS[item.tier].label}</span>
                    </span>
                  </span>
                  <span className="row-count">
                    {count ? (
                      <>
                        <small aria-hidden="true">×</small>
                        <span className="sr-only">số lượng </span>
                        {rowCount(count)}
                      </>
                    ) : (
                      'Chưa có'
                    )}
                  </span>
                </button>
                {item.id === selected && (count > 0 || !wide) && (
                  // what can be done with it: its card now; using it on a
                  // Pokémon and dropping it come with the raising features
                  <div
                    id={`bag-actions-${item.id}`}
                    className="row-actions"
                    role="group"
                    aria-label={`Thao tác với ${item.name}`}
                  >
                    <button
                      type="button"
                      className="command"
                      data-command="info"
                      onClick={() => setDialog(item.id)}
                    >
                      <span className="command-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M10.4 10h3.2v8.5h-3.2ZM12 4.6a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8Z" />
                        </svg>
                      </span>
                      <span className="command-label">Chi tiết</span>
                    </button>
                    {count > 0 && (
                      <>
                        <button
                          type="button"
                          className="command"
                          data-command="use"
                          disabled
                          title="Sắp có: dùng cho Pokémon trong bộ sưu tập"
                        >
                          <span className="command-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                              <path d="M12 3a9 9 0 0 1 8.95 8h-5.1a3.9 3.9 0 0 0-7.7 0h-5.1A9 9 0 0 1 12 3Zm0 7.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM3.05 13h5.1a3.9 3.9 0 0 0 7.7 0h5.1a9 9 0 0 1-17.9 0Z" />
                            </svg>
                          </span>
                          <span className="command-label">Dùng</span>
                          <span className="command-soon">Sắp có</span>
                        </button>
                        <button
                          type="button"
                          className="command"
                          data-command="drop"
                          disabled
                          title="Sắp có: bỏ bớt vật phẩm"
                        >
                          <span className="command-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                              <path d="M9 3h6l1 2h4v2H4V5h4Zm-3 6h12l-1 12H7Z" />
                            </svg>
                          </span>
                          <span className="command-label">Bỏ</span>
                          <span className="command-soon">Sắp có</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
          <aside className="bag-detail" aria-label="Thông tin vật phẩm">
            {shown && (
              <ItemCard
                key={shown}
                id={shown}
                count={bag[shown] ?? 0}
                headingId="bag-item-name"
              />
            )}
          </aside>
        </div>
      ) : (
        <div className="bag-empty">
          <strong>{empty ? 'Túi còn trống' : 'Ngăn này còn trống'}</strong>
          <p>
            Quà đến từ Who’s That Pokémon?: đoán đúng thật sớm để giữ quà quý,
            đủ chuỗi {COMBO_AT} để mở Premier Ball.
          </p>
          <LinkCustom className="play" to="/whos-that-pokemon">
            Chơi ngay ►
          </LinkCustom>
          {!missing && (
            <button
              type="button"
              className="toggle"
              aria-pressed={missing}
              onClick={() => setMissing(true)}
            >
              <span aria-hidden="true" />
              Xem {stats.catalogue} món có thể nhận
            </button>
          )}
        </div>
      )}

      <p className="bag-note">
        {mode === 'server'
          ? 'Túi đồ được lưu trong tài khoản của bạn. '
          : mode === 'local'
            ? 'Túi đồ được lưu trên trình duyệt này. '
            : ''}
        Vật phẩm sẽ dùng được cho Pokémon trong bộ sưu tập khi các tính năng
        nuôi dưỡng ra mắt.
      </p>

      <ItemDialog
        id={dialog}
        count={dialog ? (bag?.[dialog] ?? 0) : 0}
        onClose={() => setDialog(null)}
      />
    </BagStyle>
  )
}
