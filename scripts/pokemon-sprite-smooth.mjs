// Pixel-art smoothing for the animated room sprites: Scale2x (EPX) applied
// `steps` times on raw RGBA frames, so staircase edges become clean curves
// instead of blocks. Pure functions, one frame at a time (no big buffers).
const same = (a, b) => a === b

/** One Scale2x pass over a w*h RGBA frame (Uint32Array view); returns 2w*2h. */
export function scale2x(src, w, h) {
  const out = new Uint32Array(w * 2 * h * 2)
  const W = w * 2
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = src[y * w + x]
      const a = y > 0 ? src[(y - 1) * w + x] : 0
      const d = y < h - 1 ? src[(y + 1) * w + x] : 0
      const c = x > 0 ? src[y * w + x - 1] : 0
      const b = x < w - 1 ? src[y * w + x + 1] : 0
      let p1 = p
      let p2 = p
      let p3 = p
      let p4 = p
      if (same(c, a) && !same(c, d) && !same(a, b)) p1 = a
      if (same(a, b) && !same(a, c) && !same(b, d)) p2 = b
      if (same(d, c) && !same(d, b) && !same(c, a)) p3 = c
      if (same(b, d) && !same(b, a) && !same(d, c)) p4 = d
      const o = y * 2 * W + x * 2
      out[o] = p1
      out[o + 1] = p2
      out[o + W] = p3
      out[o + W + 1] = p4
    }
  return out
}

/** Scale2x `steps` times; fully transparent pixels are normalised to 0. */
export function smooth(rgba, w, h, steps) {
  let cur = new Uint32Array(rgba.buffer, rgba.byteOffset, w * h).slice()
  for (let i = 0; i < cur.length; i++) if (cur[i] >>> 24 === 0) cur[i] = 0
  let cw = w
  let ch = h
  for (let s = 0; s < steps; s++) {
    cur = scale2x(cur, cw, ch)
    cw *= 2
    ch *= 2
  }
  return { data: cur, width: cw, height: ch }
}
