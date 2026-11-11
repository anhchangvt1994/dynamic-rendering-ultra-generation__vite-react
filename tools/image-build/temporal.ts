/**
 * Smoothing along time for an upscaled animation.
 *
 * The upscaler redraws every frame on its own, so edges and colours shift a
 * pixel or two from one frame to the next. Blending each frame with its
 * neighbours averages that out, but blending where the drawing really moved
 * leaves the old stroke behind as a pale second line. The small source frames
 * say exactly where nothing moved, so the blend only happens there.
 */
import sharp from 'sharp'

/** changes[t]: 1 where source frame t and t+1 (looped) differ */
export function sourceChanges(
  frames: Buffer[],
  w: number,
  h: number,
  threshold = 24
) {
  return frames.map((a, t) => {
    const b = frames[(t + 1) % frames.length]
    const c = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) {
      const o = i * 4
      const va = a[o + 3] >= 128
      const vb = b[o + 3] >= 128
      if (va !== vb) c[i] = 1
      else if (
        va &&
        Math.abs(a[o] - b[o]) +
          Math.abs(a[o + 1] - b[o + 1]) +
          Math.abs(a[o + 2] - b[o + 2]) >
          threshold
      )
        c[i] = 1
    }
    return c
  })
}

/**
 * 255 where no change happens from source frame `lo` up to `hi` (indices
 * wrap round the loop), 0 within `margin` pixels of one.
 */
export function stillMask(
  changes: Uint8Array[],
  lo: number,
  hi: number,
  w: number,
  h: number,
  margin = 1
) {
  const n = changes.length
  const moved = new Uint8Array(w * h)
  for (let t = lo; t < hi; t++) {
    const c = changes[((t % n) + n) % n]
    for (let i = 0; i < w * h; i++) moved[i] |= c[i]
  }
  const still = Buffer.alloc(w * h, 255)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!moved[y * w + x]) continue
      for (let dy = -margin; dy <= margin; dy++)
        for (let dx = -margin; dx <= margin; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (xx >= 0 && yy >= 0 && xx < w && yy < h) still[yy * w + xx] = 0
        }
    }
  return still
}

const binomial = (r: number) => {
  const taps = [1]
  for (let j = 0; j < 2 * r; j++)
    for (let q = taps.length; q > 0; q--) taps[q] = (taps[q] ?? 0) + taps[q - 1]
  return taps
}

export type TimeSmoothing = {
  /** source size */
  w: number
  h: number
  /** output size */
  tw: number
  th: number
  /** output frames; every source frame became `k` of them */
  frames: number
  k: number
  changes: Uint8Array[]
}

/**
 * In place on `out` (frames of tw x th RGBA, looped). Colours get a short
 * blend, the dark ink and the alpha a wider one; a neighbour frame only
 * counts where the source stood still between the two.
 */
export async function smoothAlongTime(
  out: Buffer,
  { w, h, tw, th, frames: m, k, changes }: TimeSmoothing
) {
  const R = 3 // ink and alpha reach; colours use the nearest frame each side
  const COLOUR = 0.8
  const ALPHA = 0.8
  const INK = 0.9
  const fs4 = tw * th * 4
  const taps = binomial(R)
  const masks = new Map<string, Promise<Buffer>>()
  // weight (0-255, at output size) that frame f may take from frame f + off
  const weight = (f: number, off: number) => {
    const lo = Math.floor(Math.min(f, f + off) / k)
    const hi = Math.ceil(Math.max(f, f + off) / k)
    const n = changes.length
    const key = `${((lo % n) + n) % n}:${hi - lo}`
    let got = masks.get(key)
    if (!got) {
      got = sharp(stillMask(changes, lo, hi, w, h), {
        raw: { width: w, height: h, channels: 1 },
      })
        .resize(tw, th, { kernel: 'cubic', fit: 'fill' })
        .blur(Math.max(0.3, (tw / w) * 0.375))
        .extractChannel(0)
        .raw()
        .toBuffer()
      masks.set(key, got)
    }
    return got
  }
  const src = Buffer.from(out)
  for (let f = 0; f < m; f++) {
    const b = f * fs4
    const near = await Promise.all(
      taps.map((_, j) => (j === R ? null : weight(f, j - R)))
    )
    const bases = taps.map((_, j) => ((((f + j - R) % m) + m) % m) * fs4)
    for (let i = 0; i < tw * th; i++) {
      const p = b + i * 4
      let wide = taps[R]
      let short = taps[R]
      let r = src[p] * wide
      let g = src[p + 1] * wide
      let bl = src[p + 2] * wide
      let a = src[p + 3] * wide
      let sr = r
      let sg = g
      let sb = bl
      for (let j = 0; j < taps.length; j++) {
        const still = near[j]
        if (!still || !still[i]) continue
        const wt = (taps[j] * still[i]) / 255
        const o = bases[j] + i * 4
        r += wt * src[o]
        g += wt * src[o + 1]
        bl += wt * src[o + 2]
        a += wt * src[o + 3]
        wide += wt
        if (j === R - 1 || j === R + 1) {
          sr += wt * src[o]
          sg += wt * src[o + 1]
          sb += wt * src[o + 2]
          short += wt
        }
      }
      const l = (src[p] + src[p + 1] + src[p + 2]) / 3
      const ink = l < 110 ? INK : l < 150 ? (INK * (150 - l)) / 40 : 0
      const mix = (own: number, near: number, wideSum: number) => {
        const v = own * (1 - COLOUR) + near * COLOUR
        return Math.round(v * (1 - ink) + wideSum * ink)
      }
      out[p] = mix(src[p], sr / short, r / wide)
      out[p + 1] = mix(src[p + 1], sg / short, g / wide)
      out[p + 2] = mix(src[p + 2], sb / short, bl / wide)
      // alpha: blended, then pushed back to crisp so no edge leaves a tail
      const al = (src[p + 3] * (1 - ALPHA) + (a / wide) * ALPHA - 128) * 2 + 128
      out[p + 3] = al < 0 ? 0 : al > 255 ? 255 : Math.round(al)
    }
  }
}
