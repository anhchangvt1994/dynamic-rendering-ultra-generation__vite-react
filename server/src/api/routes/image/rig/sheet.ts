/**
 * The room's sprite sheet: every displayed frame on one WebP page of at most
 * 4096², at the largest cell side that fits; past 256 frames some are dropped
 * evenly, each kept frame lasting until the next kept one.
 */
import sharp from 'sharp'

export const PAGE = 4096
const SIDES = [512, 384, 320, 256]
const MAX_FRAMES = (PAGE / SIDES.at(-1)!) ** 2

export type SheetPlan = {
  /** longest side of a cell, px */
  size: number
  cols: number
  rows: number
  /** indices of the frames kept, ascending */
  keep: number[]
  /** one per kept frame, ms */
  delays: number[]
}

export function sheetPlan(m: number, delays: number[] = []): SheetPlan {
  const size =
    SIDES.find((s) => Math.floor(PAGE / s) ** 2 >= m) ?? SIDES.at(-1)!
  const count = Math.min(m, MAX_FRAMES)
  const keep = Array.from({ length: count }, (_, i) =>
    Math.floor((i * m) / count)
  )
  const merged = keep.map((k, i) => {
    let sum = 0
    for (let f = k; f < (keep[i + 1] ?? m); f++) sum += delays[f] ?? 100
    return sum
  })
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)))
  return {
    size,
    cols,
    rows: Math.max(1, Math.ceil(count / cols)),
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

/** The cells, left to right then top to bottom, on one WebP page. */
export async function encodeSheet(
  frames: Uint8Array[],
  w: number,
  h: number,
  cols: number,
  rows: number
) {
  const width = cols * w
  const sheet = Buffer.alloc(width * rows * h * 4)
  frames.forEach((frame, K) => {
    const ox = (K % cols) * w
    const oy = Math.floor(K / cols) * h
    for (let y = 0; y < h; y++)
      sheet.set(
        frame.subarray(y * w * 4, (y + 1) * w * 4),
        ((oy + y) * width + ox) * 4
      )
  })
  return sharp(sheet, { raw: { width, height: rows * h, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer()
}
