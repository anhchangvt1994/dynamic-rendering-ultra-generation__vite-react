// Pure helpers for the evolution prompt's "chamber" scene.
import { contrast } from '../room/roomTheme.mjs'

/** the dark the scene is painted on */
export const BASE = '#070b16'
export const HOLD_MS = 900
const DRAIN_MS = 450

/**
 * Slots on the ring, as fractions (0–1) of the square stage: centre x/y and
 * size. Two slots sit left/right, others start on top; spacing keeps them
 * from touching and size from growing past a thumb-friendly 20%.
 */
export function ringLayout(n) {
  if (n <= 0) return []
  const r = 0.39
  const size = Math.min(0.2, ((2 * Math.PI * r) / n) * 0.9)
  const start = n % 2 === 0 ? -90 + 180 / n : -90
  return Array.from({ length: n }, (_, i) => {
    const a = ((start + (360 / n) * i) * Math.PI) / 180
    return { x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a), size }
  })
}

/**
 * Two glow colours for a room palette (bg, a1, a2): the best-contrast one on
 * the scene base leads, the next one follows.
 */
export function accentFor(theme) {
  const ranked = [theme.a1, theme.a2, theme.bg].sort((x, y) => contrast(y, BASE) - contrast(x, BASE))
  return { a: ranked[0], b: ranked[1] }
}

/** Share of conditions met, 0–1. */
export const progressOf = (lines) =>
  lines?.length ? lines.filter((l) => l.ok).length / lines.length : 0

/** One frame of the hold gesture: `h` is 0–1; `done` once it reaches 1. */
export function holdStep(h, down, dt) {
  if (down) {
    const next = Math.min(1, h + dt / HOLD_MS)
    return { h: next, done: next >= 1 }
  }
  return { h: Math.max(0, h - dt / DRAIN_MS), done: false }
}

/**
 * Arcs of a full circle (degrees, 0 = 12 o'clock, clockwise), one per
 * condition with a small gap between neighbours; one condition is a whole ring.
 */
export function arcSpans(n, gap = 10) {
  const count = Math.max(1, n)
  if (count === 1) return [{ a0: 0, a1: 359.9 }]
  const span = 360 / count
  return Array.from({ length: count }, (_, i) => ({ a0: i * span + gap / 2, a1: (i + 1) * span - gap / 2 }))
}
