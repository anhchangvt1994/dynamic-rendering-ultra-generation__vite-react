// The shard shelf shows its stones a page at a time: scrolling brings the
// next few pages on its own, then a button asks, so the bag's end is reachable.
export const SHELF_STEP = 12
export const SHELF_AUTO_PAGES = 3

/** What `pages` pages of `total` rows show, what the next page adds. */
export function shelfWindow({ total, pages, step = SHELF_STEP }) {
  const count = Number.isFinite(pages) && pages >= 1 ? Math.floor(pages) : 1
  const shown = Math.min(total, count * step)
  const next = Math.min(step, total - shown)
  const done = next <= 0
  return {
    shown,
    next: Math.max(0, next),
    done,
    auto: !done && count < SHELF_AUTO_PAGES,
  }
}

/** Distance between row starts: the mounted rows' mean height plus the gap. */
export function shelfRowPitch({ heights, gap, fallback = 454 }) {
  const real = heights.filter((h) => Number.isFinite(h) && h > 0)
  if (!real.length) return fallback
  const mean = Math.round(real.reduce((s, h) => s + h, 0) / real.length)
  return mean + (Number.isFinite(gap) && gap > 0 ? gap : 0)
}

/** Visible item indexes and the space retained for unmounted rows. */
export function shelfRenderWindow({
  total,
  columns,
  rowHeight,
  scrollTop,
  viewportHeight,
  overscan = 1,
  direction = 'down',
  directionalOverscan = 0,
}) {
  if (!total) return { start: 0, end: 0, top: 0, bottom: 0 }
  const cols = Math.max(1, Math.floor(columns))
  const rowSize = Math.max(1, rowHeight)
  const count = Math.ceil(total / cols)
  const before =
    Math.max(0, Math.floor(overscan)) +
    (direction === 'up' ? Math.max(0, Math.floor(directionalOverscan)) : 0)
  const after =
    Math.max(0, Math.floor(overscan)) +
    (direction === 'down' ? Math.max(0, Math.floor(directionalOverscan)) : 0)
  const firstRow = Math.max(
    0,
    Math.floor(Math.max(0, scrollTop) / rowSize) - before
  )
  const lastRow = Math.min(
    count,
    Math.ceil(
      (Math.max(0, scrollTop) + Math.max(0, viewportHeight)) / rowSize
    ) + after
  )
  const start = Math.min(total, firstRow * cols)
  const end = Math.min(total, lastRow * cols)
  return {
    start,
    end,
    top: firstRow * rowSize,
    bottom: (count - lastRow) * rowSize,
  }
}

const FILTERS = {
  all: () => true,
  ready: (row) => row.count >= row.required,
  amber: (row) => row.cardCount > 0,
}

/** The rows a shelf filter keeps; an unknown filter keeps them all. */
export const shelfFilter = (rows, filter) =>
  rows.filter(FILTERS[filter] ?? FILTERS.all)

/** How many rows each filter keeps, and the finished stones in all. */
export const shelfCounts = (rows) => ({
  all: rows.length,
  ready: rows.filter(FILTERS.ready).length,
  amber: rows.filter(FILTERS.amber).length,
  stones: rows.reduce((sum, row) => sum + row.cardCount, 0),
})
