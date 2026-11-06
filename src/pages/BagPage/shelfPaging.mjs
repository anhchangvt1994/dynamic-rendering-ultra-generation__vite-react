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
  return { shown, next: Math.max(0, next), done, auto: !done && count < SHELF_AUTO_PAGES }
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
