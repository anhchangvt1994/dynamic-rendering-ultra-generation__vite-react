import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { TIERS, itemById, itemSprite } from 'pages/QuizPage/items.mjs'
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
import BagBones from './BagBones'
import { useDishes } from 'pages/KitchenPage/useDishes'
import DishShelf from 'pages/KitchenPage/DishShelf'
import { Backpack, PocketGlyph, SortGlyph, MissingGlyph } from './BagArt'

const WIDE = '(min-width: 900px)'
const DISHES_POCKET = { id: 'dishes', label: 'Món ăn', color: '#f07cb4' }

/** From 900px the chosen item's card stands beside the grid. */
function useWide() {
  // read at once: the first paint already lays out for the width
  const [wide, setWide] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia(WIDE).matches
  )
  useEffect(() => {
    const query = matchMedia(WIDE)
    const update = () => setWide(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return wide
}

/** A sticker's number: short enough for its sticker (12.345 → 12k). */
const stickerCount = (n: number) =>
  n >= 10000 ? `${Math.floor(n / 1000)}k` : fullCount(n)

/** What can be done with an item: its card now; use and drop come later. */
function Commands({
  count,
  info,
  onInfo,
}: {
  count: number
  info: boolean
  onInfo: () => void
}) {
  return (
    <>
      {info && (
        <button
          type="button"
          className="command"
          data-command="info"
          onClick={onInfo}
        >
          <span className="command-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M10.4 10h3.2v8.5h-3.2ZM12 4.6a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8Z" />
            </svg>
          </span>
          <span className="command-label">Chi tiết</span>
        </button>
      )}
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
    </>
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
  // the entrances play for the player's own moves, not on the hand-over
  // from the skeleton (which already drew the page where it stands)
  const [moved, setMoved] = useState(false)
  const act = (run: () => void) => {
    setMoved(true)
    run()
  }

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
  const wide = useWide()
  // the card beside the grid shows the chosen item, else the first one
  const shown =
    rows.find((row) => row.item.id === selected)?.item.id ?? rows[0]?.item.id
  // phones: the chosen item's dock, the DS games' bottom screen
  const docked =
    !wide && !onDishes && selected && rows.some((r) => r.item.id === selected)
      ? itemById(selected)
      : null
  const choose = (id: string) =>
    setSelected((current) => (current === id ? null : id))
  const empty = bag !== null && stats.total === 0
  const tabs = [
    ...POCKETS.map((p) => ({ ...p, count: stats.pockets[p.id] ?? 0 })),
    { ...DISHES_POCKET, count: dishTotal },
  ]
  const shownCount = onDishes ? dishTotal : (stats.pockets[pocket] ?? 0)
  const stickers = [
    { label: 'Vật phẩm', value: stats.total, color: '#ffda55' },
    { label: 'Sưu tầm', value: stats.kinds, of: stats.catalogue, color: '#4fd18b' },
    { label: 'Quý hiếm+', value: stats.valuable, color: '#c38bff' },
  ]

  return (
    <BagStyle
      className="bag-page"
      data-tone="dark"
      data-docked={docked ? '' : undefined}
      style={{ '--pocket': current.color } as CSSProperties}
    >
      <header className="bag-hero">
        <div key={pocket} className="bag-art" data-moved={moved || undefined}>
          <Backpack />
          <i aria-hidden="true" />
          <i aria-hidden="true" />
          <i aria-hidden="true" />
        </div>
        <div className="bag-name">
          <p className="bag-kicker">Túi của Nhà Huấn luyện</p>
          <h1 className="bag-title">Túi đồ</h1>
        </div>
        {/* the numbers, as stickers slapped on the bag */}
        <dl className="stickers">
          {stickers.map((s, i) => (
            <div
              key={s.label}
              className="sticker"
              style={{ '--c': s.color, '--i': i } as CSSProperties}
            >
              <dt>{s.label}</dt>
              <dd>
                {bag ? stickerCount(s.value) : '—'}
                {s.of && <small>/{s.of}</small>}
              </dd>
            </div>
          ))}
        </dl>
        {/* always drawn, zeros and an empty track included: the hero keeps
            its height whatever the bag holds */}
        <div className="bag-tiers">
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
              <li key={tier}>
                <b>{'★'.repeat(tier)}</b> {fullCount(stats.tiers[tier])}
                <span className="sr-only"> {TIERS[tier].label}</span>
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* the pockets: luggage tags hung on the bag's zip; the open one drops */}
      <nav
        className="pockets"
        aria-label="Ngăn túi"
        data-moved={moved || undefined}
      >
        {tabs.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className="tag"
            aria-pressed={pocket === p.id}
            aria-label={`${p.label}, ${p.count}`}
            title={p.label}
            onClick={() =>
              act(() => {
                setPocket(p.id)
                setSelected(null)
              })
            }
            style={{ '--c': p.color, '--i': i } as CSSProperties}
          >
            <span className="tag-card">
              <span className="tag-glyph">
                <PocketGlyph id={p.id} />
              </span>
              <span className="tag-label">{p.label}</span>
              <b className="tag-count">{badgeCount(p.count)}</b>
            </span>
          </button>
        ))}
      </nav>

      <section className="pocket-panel" aria-labelledby="bag-pocket-name">
        <div className="bag-head">
          <h2 className="bag-pocket" id="bag-pocket-name">
            <span className="bag-pocket-name">{current.label}</span>
            <span className="bag-pocket-count">
              {bag ? fullCount(shownCount) : '—'}
            </span>
          </h2>
          {mode === 'guest' ? null : onDishes ? (
            <LinkCustom className="bag-tool-link" to="/che-bien">
              Vào bếp ►
            </LinkCustom>
          ) : (
            <div className="bag-tools">
              {/* the chosen order shows its name; the others, their sign */}
              <div className="sort" role="group" aria-label="Sắp xếp">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={sort === s.id}
                    aria-label={`Theo ${s.label.toLowerCase()}`}
                    title={s.label}
                    onClick={() => act(() => setSort(s.id))}
                  >
                    <SortGlyph id={s.id} />
                    <span className="sort-label">{s.label}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="seek"
                aria-pressed={missing}
                title="Hiện cả món chưa có"
                aria-label="Hiện cả món chưa có"
                onClick={() => act(() => setMissing(!missing))}
              >
                <MissingGlyph />
                <span>Chưa có</span>
              </button>
            </div>
          )}
        </div>

        {mode === 'guest' ? (
          // a guest: items are kept on an account
          <div className="bag-empty bag-guest">
            <strong>Đăng nhập để có túi đồ</strong>
            <p>
              Quà từ Who’s That Pokémon? được cất vào túi đồ của tài khoản:
              Rare Candy, đá tiến hoá, TM… không ai sửa được, không mất khi đổi
              máy.
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
          dishes && (menu || !dishTotal) ? (
            <DishShelf dishes={dishes} menu={menu} />
          ) : (
            <BagBones />
          )
        ) : bag === null ? (
          // the account's bag is on its way: the skeleton's slots stay
          <BagBones />
        ) : rows.length ? (
          <div className="bag-body">
            <ol
              className="bag-grid"
              aria-label={`Ngăn ${current.label}`}
              data-moved={moved || undefined}
            >
              {rows.map(({ item, count }, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="slot"
                    data-missing={count === 0 || undefined}
                    aria-current={
                      item.id === selected ||
                      (wide && item.id === shown) ||
                      undefined
                    }
                    aria-label={`${item.name}, ${TIERS[item.tier].label}, ${
                      count ? `số lượng ${rowCount(count)}` : 'chưa có'
                    }`}
                    onClick={() => choose(item.id)}
                    style={
                      {
                        '--tier': TIERS[item.tier].color,
                        '--i': index,
                      } as CSSProperties
                    }
                  >
                    <span className="slot-well" aria-hidden="true">
                      <img
                        src={itemSprite(item.id)}
                        alt=""
                        width={30}
                        height={30}
                        loading={index < 16 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                      <b className="slot-stars">{'★'.repeat(item.tier)}</b>
                      <b className="slot-count">
                        {count ? `×${rowCount(count)}` : '?'}
                      </b>
                    </span>
                    <span className="slot-name" aria-hidden="true">
                      {item.name}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <aside className="bag-detail" aria-label="Thông tin vật phẩm">
              {shown && (
                <>
                  <ItemCard
                    key={shown}
                    id={shown}
                    count={bag[shown] ?? 0}
                    headingId="bag-item-name"
                  />
                  {(bag[shown] ?? 0) > 0 && (
                    <div className="bag-detail-commands">
                      <Commands
                        count={bag[shown] ?? 0}
                        info={false}
                        onInfo={() => {}}
                      />
                    </div>
                  )}
                </>
              )}
            </aside>
          </div>
        ) : (
          <div className="bag-empty">
            <span className="bag-empty-art" aria-hidden="true">
              <Backpack />
            </span>
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
                className="bag-empty-more"
                onClick={() => act(() => setMissing(true))}
              >
                Xem {stats.catalogue} món có thể nhận
              </button>
            )}
          </div>
        )}
      </section>

      <p className="bag-note">
        {mode === 'server'
          ? 'Túi đồ được lưu trong tài khoản của bạn. '
          : mode === 'local'
            ? 'Túi đồ được lưu trên trình duyệt này. '
            : ''}
        Vật phẩm sẽ dùng được cho Pokémon trong bộ sưu tập khi các tính năng
        nuôi dưỡng ra mắt.
      </p>

      {docked && (
        <div
          key={docked.id}
          className="dock"
          role="group"
          aria-label={`Thao tác với ${docked.name}`}
          style={{ '--tier': TIERS[docked.tier].color } as CSSProperties}
        >
          <div className="dock-head">
            <span className="dock-well" aria-hidden="true">
              <img src={itemSprite(docked.id)} alt="" width={30} height={30} />
            </span>
            <span className="dock-text">
              <strong>{docked.name}</strong>
              <span>
                <b>{'★'.repeat(docked.tier)}</b> {TIERS[docked.tier].label}
              </span>
            </span>
            <span className="dock-count">
              {bag?.[docked.id] ? `×${rowCount(bag[docked.id])}` : 'Chưa có'}
            </span>
            <button
              type="button"
              className="dock-close"
              aria-label="Đóng"
              onClick={() => setSelected(null)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 4 6 6 6-6 2 2-6 6 6 6-2 2-6-6-6 6-2-2 6-6-6-6z" />
              </svg>
            </button>
          </div>
          <div className="dock-commands">
            <Commands
              count={bag?.[docked.id] ?? 0}
              info
              onInfo={() => setDialog(docked.id)}
            />
          </div>
        </div>
      )}

      <ItemDialog
        id={dialog}
        count={dialog ? (bag?.[dialog] ?? 0) : 0}
        onClose={() => setDialog(null)}
      />
    </BagStyle>
  )
}
