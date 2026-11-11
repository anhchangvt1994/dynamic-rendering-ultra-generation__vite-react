/**
 * The room's sprite sheet: every displayed frame as a 512px cell, 64 cells to
 * a WebP page of 4096² at most, at most 4 pages; past 256 frames some are
 * dropped evenly, each kept frame lasting until the next kept one.
 */
import sharp from 'sharp'

export const PAGE = 4096
export const CELL = 512
export const PER_PAGE = (PAGE / CELL) ** 2
export const MAX_PAGES = 4

export type SheetPlan = {
  /** longest side of a cell, px */
  size: 512
  /** per page */
  cols: number
  rows: number
  /** frames per page (the last page may hold fewer) */
  per: number
  pages: number
  /** indices of the frames kept, ascending */
  keep: number[]
  /** one per kept frame, ms */
  delays: number[]
}

export function sheetPlan(m: number, delays: number[] = []): SheetPlan {
  const count = Math.min(m, PER_PAGE * MAX_PAGES)
  const keep = Array.from({ length: count }, (_, i) =>
    Math.floor((i * m) / count)
  )
  const merged = keep.map((k, i) => {
    let sum = 0
    for (let f = k; f < (keep[i + 1] ?? m); f++) sum += delays[f] ?? 100
    return sum
  })
  const per = Math.min(count, PER_PAGE)
  const cols = count <= PER_PAGE ? Math.max(1, Math.ceil(Math.sqrt(count))) : PAGE / CELL
  return {
    size: CELL,
    cols,
    rows: Math.max(1, Math.ceil(per / cols)),
    per,
    pages: Math.ceil(count / per),
    keep,
    delays: merged,
  }
}

/** Cell size for a frame of w×h whose longest side becomes `size`. */
export const cellOf = (w: number, h: number, size: number) => {
  const s = size / Math.max(w, h)
  return {
    w: Math.max(1, Math.round(w * s)),
    h: Math.max(1, Math.round(h * s)),
  }
}

/** The cells, left to right then top to bottom, one WebP per page. */
export function encodeSheet(
  frames: Uint8Array[],
  w: number,
  h: number,
  plan: Pick<SheetPlan, 'cols' | 'rows' | 'per' | 'pages'>,
  quality = 98
) {
  const width = plan.cols * w
  return Promise.all(
    Array.from({ length: plan.pages }, (_, page) => {
      const sheet = Buffer.alloc(width * plan.rows * h * 4)
      frames.slice(page * plan.per, (page + 1) * plan.per).forEach((frame, k) => {
        const ox = (k % plan.cols) * w
        const oy = Math.floor(k / plan.cols) * h
        for (let y = 0; y < h; y++)
          sheet.set(
            frame.subarray(y * w * 4, (y + 1) * w * 4),
            ((oy + y) * width + ox) * 4
          )
      })
      return sharp(sheet, {
        raw: { width, height: plan.rows * h, channels: 4 },
      })
        .webp({ quality, alphaQuality: 100, effort: 6 })
        .toBuffer()
    })
  )
}
