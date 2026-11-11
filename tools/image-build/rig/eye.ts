/**
 * Pick the largest near-white connected component with a substantial dark
 * border. Eye whites form a compact polygon enclosed by the iris/lid; body
 * highlights tend to have an open edge and pale belly regions lack a dark rim.
 */
export function eyeMask(rgba: Uint8Array, width: number, height: number) {
  const length = width * height
  if (rgba.length !== length * 4) throw new Error('invalid RGBA frame')
  const white = new Uint8Array(length)
  const seen = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    const o = i * 4
    const lo = Math.min(rgba[o], rgba[o + 1], rgba[o + 2])
    const hi = Math.max(rgba[o], rgba[o + 1], rgba[o + 2])
    white[i] =
      rgba[o + 3] >= 128 && lo >= 175 && hi - lo <= 80 ? 1 : 0
  }

  let best: number[] = []
  const minArea = Math.max(4, Math.ceil(length * 0.00003))
  for (let seed = 0; seed < length; seed++) {
    if (!white[seed] || seen[seed]) continue
    const component: number[] = []
    const queue = [seed]
    seen[seed] = 1
    let darkBorder = 0
    let perimeter = 0
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head]
      component.push(i)
      const x = i % width
      const y = Math.floor(i / width)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          perimeter++
          continue
        }
        const j = ny * width + nx
        if (white[j]) {
          if (!seen[j]) {
            seen[j] = 1
            queue.push(j)
          }
          continue
        }
        perimeter++
        const o = j * 4
        if (rgba[o + 3] >= 128 && Math.max(rgba[o], rgba[o + 1], rgba[o + 2]) < 130)
          darkBorder++
      }
    }
    if (
      component.length >= minArea &&
      darkBorder >= 5 &&
      darkBorder / Math.max(1, perimeter) >= 0.15 &&
      component.length > best.length
    ) best = component
  }

  const mask = new Uint8Array(length)
  if (!best.length) return mask
  // Avoid protecting bright body markings when they win the size-based
  // component selection. In these sprites the sclera is compact and sits
  // above the body's center; large lower components are belly highlights.
  let minX = width, minY = height, maxX = 0, maxY = 0
  for (const i of best) {
    const x = i % width
    const y = Math.floor(i / width)
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  if (minY > height * 0.55)
    return mask
  // A dark iris can split the sclera into separate bright pieces. Recover
  // lightly shaded antialiased pixels nearby, while keeping the search tight.
  const pad = Math.max(2, Math.round(Math.min(width, height) * 0.006))
  for (let y = Math.max(0, minY - pad); y <= Math.min(height - 1, maxY + pad); y++)
    for (let x = Math.max(0, minX - pad); x <= Math.min(width - 1, maxX + pad); x++) {
      const i = y * width + x
      const o = i * 4
      const r = rgba[o], g = rgba[o + 1], b = rgba[o + 2]
      const lo = Math.min(r, g, b)
      const hi = Math.max(r, g, b)
      if (
        rgba[o + 3] >= 128 &&
        lo >= 135 &&
        hi - lo <= 100 &&
        (r + g + b) / 3 >= 155
      ) mask[i] = 255
    }
  return mask
}

/** The eye atlas's cell side, px (the mask is read at a coarser grain than the sprite). */
export const EYE_SIDE = 256

/** `mask` (w×h, 0/255) max-pooled down to ew×eh: any covered pixel set → 255. */
export function shrinkMask(
  mask: Uint8Array,
  w: number,
  h: number,
  ew: number,
  eh: number
) {
  const out = new Uint8Array(ew * eh)
  for (let y = 0; y < h; y++) {
    const ey = Math.min(eh - 1, Math.floor((y * eh) / h))
    for (let x = 0; x < w; x++)
      if (mask[y * w + x]) out[ey * ew + Math.min(ew - 1, Math.floor((x * ew) / w))] = 255
  }
  return out
}
