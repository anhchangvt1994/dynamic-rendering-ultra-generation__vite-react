import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { TYPE_DATA } from 'components/pokemon-page/type-data.mjs'
import type { Build } from 'pages/BagPage/individuals/client'
import { mergeLearnset, METHOD_VI, titleCase } from './format.mjs'
import type { Learnset } from './useLearnset'

const FILTERS = [
  ['all', 'Tất cả'],
  ['level-up', METHOD_VI['level-up']],
  ['machine', METHOD_VI.machine],
  ['egg', METHOD_VI.egg],
  ['tutor', METHOD_VI.tutor],
] as const

type Props = {
  open: boolean
  slot: number
  data: Learnset | null
  build: Build
  bag: Record<string, number>
  affection: number
  busy: boolean
  error: string | null
  onClose: () => void
  onPick: (move: string | null) => Promise<boolean>
}

/** A bottom sheet of the species' moves; locked ones stay, dimmed, with why. */
export default function MovePicker({
  open,
  slot,
  data,
  build,
  bag,
  affection,
  busy,
  error,
  onClose,
  onPick,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all')
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const rows = useMemo(
    () =>
      data
        ? mergeLearnset(data.learnset, data.moves, build, bag, affection)
        : [],
    [data, build, bag, affection]
  )
  const text = query.trim().toLowerCase().replace(/\s+/g, '-')
  const shown = rows.filter(
    (row) =>
      (filter === 'all' || row.method === filter) &&
      (!text || row.move.includes(text))
  )
  const current = build.moves[slot]
  const taken = new Set(build.moves.filter((m, i) => m && i !== slot))

  return (
    <dialog
      ref={ref}
      className="rm-feed rm-picker"
      aria-labelledby="bp-pick-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="rm-feed-inner">
        <header>
          <h2 id="bp-pick-title">Chiêu ô {slot + 1}</h2>
          <button
            type="button"
            className="rm-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            ✕
          </button>
        </header>
        <input
          className="bp-search"
          type="search"
          value={query}
          placeholder="Tìm chiêu"
          aria-label="Tìm chiêu"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="bp-filters" role="group" aria-label="Cách học">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {!data ? (
          <p className="rm-feed-note" role="status">
            Đang tải chiêu…
          </p>
        ) : (
          <ul className="bp-moves">
            {current && (
              <li>
                <button
                  type="button"
                  className="bp-move bp-clear"
                  aria-disabled={busy || undefined}
                  onClick={() =>
                    !busy && onPick(null).then((ok) => ok && onClose())
                  }
                >
                  <b>Bỏ chiêu {titleCase(current)}</b>
                  <small>Để trống ô này</small>
                </button>
              </li>
            )}
            {shown.map((row) => {
              const used = taken.has(row.move)
              const reason = used ? 'Đang ở ô khác' : row.reason
              const color =
                TYPE_DATA[row.type as keyof typeof TYPE_DATA]?.color ?? '#888'
              return (
                <li key={row.move}>
                  <button
                    type="button"
                    className="bp-move"
                    data-locked={reason ? true : undefined}
                    data-current={row.move === current || undefined}
                    aria-disabled={busy || !!reason || undefined}
                    style={{ '--tc': color } as CSSProperties}
                    onClick={() =>
                      !busy &&
                      !reason &&
                      onPick(row.move).then((ok) => ok && onClose())
                    }
                  >
                    <i aria-hidden="true" />
                    <b>{titleCase(row.move)}</b>
                    <small>
                      {reason ??
                        `${METHOD_VI[row.method]}${row.method === 'level-up' ? ` ${row.level}` : ''}`}
                      {' · '}
                      {row.power ? `${row.power} sức` : '—'} · PP{' '}
                      {row.pp ?? '—'}
                    </small>
                  </button>
                </li>
              )
            })}
            {shown.length === 0 && (
              <li className="rm-muted">Không có chiêu phù hợp.</li>
            )}
          </ul>
        )}
        <p className="rm-alert" role="alert">
          {open ? error : ''}
        </p>
      </div>
    </dialog>
  )
}
