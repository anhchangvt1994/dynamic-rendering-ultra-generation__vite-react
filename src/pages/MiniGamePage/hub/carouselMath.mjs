/** Which item a scroll-snap row is showing: nearest item start, clamped to 0..count-1. */
export function activeIndex(scrollLeft, itemWidth, count) {
  if (!Number.isFinite(scrollLeft) || !Number.isFinite(itemWidth) || itemWidth <= 0 || !(count > 0)) return 0
  return Math.min(count - 1, Math.max(0, Math.round(scrollLeft / itemWidth)))
}

/** Signed distance of every item from the viewport start, in item widths (0 = in place, 1 = one item to the right). */
export function offsets(scrollLeft, itemWidth, count) {
  const n = count > 0 ? Math.floor(count) : 0
  const raw = Number.isFinite(scrollLeft) && Number.isFinite(itemWidth) && itemWidth > 0 ? scrollLeft / itemWidth : 0
  const p = Math.min(Math.max(0, n - 1), Math.max(0, raw))
  return Array.from({ length: n }, (_, i) => Math.round((i - p) * 1000) / 1000 || 0)
}
