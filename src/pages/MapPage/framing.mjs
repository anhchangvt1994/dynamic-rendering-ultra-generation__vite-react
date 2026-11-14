// Screen-space helpers (pure): how far the camera must stand to fit something,
// how big a sprite must be to stay tappable, which sprites to keep when they crowd,
// and which one a finger meant.
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** Camera distance at which a box of half-size (halfW, halfH) fits the view with some margin. */
export function fitDistance({ halfW, halfH, fovDeg, aspect, margin = 1.1 }) {
  const t = Math.tan((fovDeg * Math.PI) / 360)
  return Math.max(halfH / t, halfW / (t * aspect)) * margin
}

/** On-screen height in pixels of something `size` tall, `dist` away. */
export const pixelsOf = (size, dist, fovDeg, viewportH) => (size * viewportH) / (2 * dist * Math.tan((fovDeg * Math.PI) / 360))

/** World size that keeps a sprite between minPx and maxPx tall on screen. */
export function spriteScale({ base, dist, fovDeg, viewportH, minPx, maxPx }) {
  const px = pixelsOf(base, dist, fovDeg, viewportH)
  return px <= 0 ? base : (base * clamp(px, minPx, maxPx)) / px
}

/** Sprite pixel limits for a viewport width: phones get big, easy to tap sprites. */
export const spriteLimits = (viewportW) => (viewportW < 480 ? { minPx: 40, maxPx: 62 } : viewportW < 900 ? { minPx: 44, maxPx: 74 } : { minPx: 50, maxPx: 84 })

/**
 * Which points to keep when they crowd: highest priority first; a point is dropped
 * when it lands within `gap` × the pair's average size of one already kept.
 * points: [{ x, y, size, priority }] → Set of kept indexes.
 */
export function declutter(points, gap = 0.7, max = Infinity) {
  const order = points.map((_, i) => i).sort((a, b) => points[b].priority - points[a].priority || a - b)
  const kept = []
  for (const i of order) {
    if (kept.length >= max) break
    const p = points[i]
    if (kept.every((j) => Math.hypot(points[j].x - p.x, points[j].y - p.y) >= ((points[j].size + p.size) / 2) * gap)) kept.push(i)
  }
  return new Set(kept)
}

/**
 * The point a pointer meant: any within max(minRadius, its own radius), the nearest to
 * the camera first (depth), then the closest on screen. points: [{ x, y, r, depth }] → index or -1.
 */
export function pickNearest(points, pointer, minRadius = 28) {
  let best = -1
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const d = Math.hypot(p.x - pointer.x, p.y - pointer.y)
    if (d > Math.max(minRadius, p.r)) continue
    if (best < 0) best = i
    else {
      const b = points[best]
      if (p.depth < b.depth - 1e-6 || (Math.abs(p.depth - b.depth) <= 1e-6 && d < Math.hypot(b.x - pointer.x, b.y - pointer.y))) best = i
    }
  }
  return best
}
