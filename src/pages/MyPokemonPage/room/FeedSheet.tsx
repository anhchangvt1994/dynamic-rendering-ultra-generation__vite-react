import { useEffect, useRef } from 'react'
import DishArt from 'pages/KitchenPage/DishArt'
import StatChips from 'pages/KitchenPage/StatChips'
import type { DishView, Menu } from 'pages/KitchenPage/engine/types'
import { tasteOf } from '../care/likes.mjs'
import { myPokemonPath } from '../paths.mjs'

const TASTE_LABEL: Record<string, string> = {
  liked: 'Thích',
  disliked: 'Không thích',
}

type Props = {
  open: boolean
  onClose: () => void
  individualId: string
  personality: number
  name: string
  counts: Record<string, number> | null
  menu: Menu | null
  busy: boolean
  error: string | null
  onFeed: (dishId: string) => void
}

/** The dishes in the bag, to feed one: count, stats and whether it's liked. */
export default function FeedSheet({
  open,
  onClose,
  individualId,
  personality,
  name,
  counts,
  menu,
  busy,
  error,
  onFeed,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const byId = new Map<string, DishView>(
    (menu?.dishes ?? []).map((dish) => [dish.id, dish])
  )
  const owned = Object.entries(counts ?? {})
    .filter(([id, count]) => count > 0 && byId.get(id)?.name)
    .map(([id, count]) => ({ dish: byId.get(id)!, count }))
  const loading = !counts || (!menu && Object.keys(counts).length > 0)

  return (
    <dialog
      ref={ref}
      className="rm-feed"
      aria-labelledby="rm-feed-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="rm-feed-inner">
        <header>
          <h2 id="rm-feed-title">Cho {name} ăn</h2>
          <button
            type="button"
            className="rm-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            ✕
          </button>
        </header>
        {loading ? (
          <p className="rm-feed-note" role="status">
            Đang tải món…
          </p>
        ) : owned.length === 0 ? (
          <div className="rm-feed-note">
            <p>Chưa có món nào trong túi.</p>
            <LinkCustom
              className="rm-btn rm-primary"
              to="/che-bien"
              state={{ returnTo: myPokemonPath(individualId) }}
            >
              Nấu món mới
            </LinkCustom>
          </div>
        ) : (
          <ul className="rm-dishes">
            {owned.map(({ dish, count }) => {
              const taste = tasteOf(personality, dish)
              return (
                <li key={dish.id}>
                  <button
                    type="button"
                    className="rm-dish"
                    aria-disabled={busy || undefined}
                    data-taste={taste}
                    onClick={() => !busy && onFeed(dish.id)}
                  >
                    <span className="rm-dish-art" aria-hidden="true">
                      <DishArt kind={dish.kind} top={dish.top} size={48} />
                    </span>
                    <span className="rm-dish-text">
                      <strong>
                        {dish.name} <small>×{count}</small>
                      </strong>
                      {dish.stats && <StatChips stats={dish.stats} />}
                    </span>
                    {TASTE_LABEL[taste] && (
                      <span className="rm-taste">{TASTE_LABEL[taste]}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <p className="rm-alert" role="alert">
          {open ? error : ''}
        </p>
      </div>
    </dialog>
  )
}
