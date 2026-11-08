const THRESHOLD = 52

export function dockGesture(open, dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy) * 0.6 || Math.abs(dy) < THRESHOLD) return null
  if (!open && dy < 0) return true
  if (open && dy > 0) return false
  return null
}

/**
 * A down-drag that began on the open sheet's content closes it only when the
 * content was already at its top (`startTop`, read at touchstart): otherwise
 * the drag is a scroll.
 */
export function sheetDragClose(startTop, dx, dy) {
  return startTop <= 0 && dockGesture(true, dx, dy) === false
}
