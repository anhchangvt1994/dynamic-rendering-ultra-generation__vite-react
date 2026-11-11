/** Which item a scroll-snap row is showing: nearest item start, clamped to 0..count-1. */
export function activeIndex(scrollLeft, itemWidth, count) {
  if (!Number.isFinite(scrollLeft) || !Number.isFinite(itemWidth) || itemWidth <= 0 || !(count > 0)) return 0
  return Math.min(count - 1, Math.max(0, Math.round(scrollLeft / itemWidth)))
}
