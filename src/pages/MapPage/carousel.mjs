// The island carousel (pure). Islands sit on a row: the active one in the middle at full
// size, its neighbours smaller, turned in and a little further back. `d` is an island's
// distance from the carousel's position (index − position). x, y, z are in island widths.
export const SPACING = 1.55
export const clampIndex = (i, n) => Math.min(n - 1, Math.max(0, i))

export function slotAt(d) {
  const ad = Math.abs(d)
  const s = Math.sign(d) || 1
  return {
    scale: ad <= 1 ? 1 - 0.46 * ad : Math.max(0, 0.54 - (ad - 1) * 0.18),
    x: s * (ad <= 1 ? ad * SPACING : SPACING + (ad - 1) * 0.95),
    y: 0 - Math.min(ad, 2) * 0.06,
    z: 0 - Math.min(ad, 2.5) * 0.5,
    yaw: 0 - Math.max(-1, Math.min(1, d)) * 0.5,
    visible: ad < 2.6,
  }
}

/** The index a swipe settles on: where it is plus a little of its speed (indexes per second). */
export const settle = (pos, vel, n) => clampIndex(Math.round(pos + vel * 0.18), n)

/** Ease the position toward its target; frame-rate independent. */
export const approach = (pos, target, dt) => pos + (target - pos) * (1 - Math.exp(-dt * 7))
