/**
 * Visual centre of a Pokémon's artwork or sprite, measured on its alpha channel.
 *
 * A picture's canvas is rarely centred on its character, and an animated
 * sprite moves inside its frames. For an animation the centre is the middle of
 * the range its per-frame centres move through (the rarest 8% of frames at
 * each end ignored, a burst or a lunge must not drag it): the Pokémon then
 * swings equally far to either side of the circle's centre, and its usual size
 * is the median over frames.
 *
 * One frame's centre is the midpoint of its visible pixels' box (what the eye
 * reads as "edge to edge") blended with their alpha-weighted centre of mass
 * (what it reads as "weight"), so a long tail or antenna does not make the
 * body look off-centre.
 */

const THRESHOLD = 24 // alpha 0..255 counted as "character" (drops soft shadows)
const BOX = 0.7 // weight of the box midpoint against the centre of mass
const EDGE = 0.08 // the rarest 8% of frames at each end do not count
const LIMIT = 0.16 // never push art further than this (tall/wide outliers)

/** Weighted quantile (each value counts for its weight: how long it shows). */
const quantile = (values, weights, p) => {
  const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b])
  const goal = weights.reduce((sum, w) => sum + w, 0) * p
  let run = 0
  for (const i of order) {
    run += weights[i]
    if (run >= goal) return values[i]
  }
  return values[order.at(-1)]
}
/** Middle of the range a value moves through, ignoring the rarest extremes. */
const middle = (values, weights) =>
  (quantile(values, weights, EDGE) + quantile(values, weights, 1 - EDGE)) / 2

/**
 * @param {ArrayLike<number>} alpha  width * (height * frames) alpha values,
 *   the frames stacked top to bottom
 * @param {ArrayLike<number>} [delays]  how long each frame shows (any unit)
 * @returns {{x:number,y:number,width:number,height:number}|null} centre and
 *   the usual box size, in pixels; null when nothing shows
 */
export function alphaCenter(alpha, width, height, frames = 1, delays = []) {
  const xs = []
  const ys = []
  const ws = []
  const hs = []
  const ts = []
  for (let f = 0; f < frames; f++) {
    const base = f * width * height
    let l = width
    let r = -1
    let t = height
    let b = -1
    let total = 0
    let sx = 0
    let sy = 0
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const a = alpha[base + y * width + x]
        if (a < THRESHOLD) continue
        if (x < l) l = x
        if (x > r) r = x
        if (y < t) t = y
        if (y > b) b = y
        total += a
        sx += a * (x + 0.5)
        sy += a * (y + 0.5)
      }
    if (!total) continue
    xs.push(BOX * ((l + r + 1) / 2) + (1 - BOX) * (sx / total))
    ys.push(BOX * ((t + b + 1) / 2) + (1 - BOX) * (sy / total))
    ws.push(r - l + 1)
    hs.push(b - t + 1)
    ts.push(delays[f] > 0 ? delays[f] : 1)
  }
  if (!xs.length) return null
  return {
    x: middle(xs, ts),
    y: middle(ys, ts),
    width: quantile(ws, ts, 0.5),
    height: quantile(hs, ts, 0.5),
  }
}

/**
 * @param {Uint8Array|Uint8ClampedArray} alpha  size*size alpha values
 * @param {number} size  side of the square alpha map
 * @param {ArrayLike<number>} [delays]  how long each frame shows (any unit)
 * @returns {{x:number,y:number}}  offset from the canvas centre, in canvas sides
 */
export function measureArtCenter(alpha, size) {
  const c = alphaCenter(alpha, size, size)
  if (!c) return { x: 0, y: 0 }
  const clamp = (v) => Math.max(-LIMIT, Math.min(LIMIT, v))
  return { x: clamp(c.x / size - 0.5), y: clamp(c.y / size - 0.5) }
}
