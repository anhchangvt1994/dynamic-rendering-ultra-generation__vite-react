// Geometry of the evolution effect's last scene: where the new form and the
// "phiếu ghi nhận" ticket sit inside a stage of w × h px.
export const HERO = 300 // design size of the animated form box
const PAD = 12
const SKIP = 56 // room for the skip button above a side-by-side ticket

/**
 * Wide stages (landscape phones, desktop) put the ticket on the right; the
 * rest stack the form over the ticket. `k` scales the form box to its cell.
 * The skip button (top-right, 88 × 44) is kept clear of the ticket.
 */
export function fxLayout(w, h) {
  const side = w >= 520 && w >= h * 1.15
  const th = Math.min(204, h - PAD * 2 - (side ? SKIP : 0))
  const start = { x: w / 2, y: h / 2 }
  if (side) {
    const tw = Math.min(300, Math.round(w * 0.46))
    const ticket = { x: w - tw - PAD, y: Math.max(SKIP, Math.round((h - th) / 2)), w: tw, h: th }
    const cellW = ticket.x - PAD * 2
    const k = Math.min(1.3, cellW / HERO, (h - PAD * 2) / HERO)
    return { mode: 'side', k, start, end: { x: PAD + cellW / 2, y: h / 2 }, ticket, from: { x: 36, y: 0 } }
  }
  const tw = Math.min(w - PAD * 2, 360)
  const ticket = { x: Math.round((w - tw) / 2), y: h - th - PAD, w: tw, h: th }
  const cellH = ticket.y - PAD * 2 - 44 // the skip button row stays free
  const k = Math.min(1.3, (w - PAD * 2) / HERO, cellH / HERO)
  return { mode: 'stack', k, start, end: { x: w / 2, y: PAD + 44 + cellH / 2 }, ticket, from: { x: 0, y: 40 } }
}
