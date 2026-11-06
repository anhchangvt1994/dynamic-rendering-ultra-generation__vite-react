// The room's Pokémon, best source first: our own animated WebP (the showdown
// sprite smoothed offline by scripts/prepare-pokemon-sprites.mjs, crisp at any
// zoom), then PokéAPI's pixel gif (only ~60px: a wall of blocks at 5x, so it
// is shown with whole-pixel scaling), then the letter.
import { fitMon, MODEL_MAX } from '../../BlogDetailPage/mons.mjs'
import { alphaCenter } from '../../PokemonPage/artCenter.mjs'

const BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
const artwork = (id) => `${BASE}/other/official-artwork/${id}.png`

export function spriteFor(id) {
  return {
    src: `/api/image/${id}.webp`,
    fallback:
      id > MODEL_MAX ? artwork(id) : `${BASE}/other/showdown/${id}.gif`,
  }
}

/** Pixel sprites at a whole multiple of their size, never blurred. */
export const fitSprite = (width, height, box) =>
  fitMon(width, height, true, box)

/**
 * The box round a picture's visible pixels (alpha above the threshold), from
 * canvas ImageData; null when nothing shows. Sprites sit off-centre in their
 * frames, so the body, not the frame, is what gets centred.
 */
export function alphaBox(data, width, height, threshold = 24) {
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > threshold) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
  if (right < 0) return null
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}

/** The visual centre and usual size of a picture's body, from RGBA data. */
export function bodyCenter(data, width, height) {
  const alpha = new Uint8Array(width * height)
  for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3]
  return alphaCenter(alpha, width, height)
}

/**
 * Size and shift a picture so its visible body fills the box (times the
 * individual's size) and its centre sits on the box's centre. Pixel sprites
 * scale by whole device pixels (the nearest step, never more than a fifth
 * over), so every sprite pixel stays a crisp, even square;
 * offsets land on device pixels too, never between them.
 */
export function placeSprite({
  natural,
  content,
  box,
  size = 1,
  pixel,
  round = false,
  dpr = 1,
}) {
  const snap = (v) => Math.round(v * dpr) / dpr
  if (!content) {
    const fit = fitSprite(natural.width, natural.height, box)
    return {
      ...fit,
      x: 0,
      y: 0,
      scale: fit.width / natural.width,
      content: null,
    }
  }
  const target = box * size
  // round: the body's box corners are empty, so only its half-diagonal has to
  // clear the circle (a little under, corners are rarely filled)
  const fill = round
    ? Math.min(
        target / Math.max(content.width, content.height),
        (target * 1.08) / Math.hypot(content.width, content.height)
      )
    : target / Math.max(content.width, content.height)
  // whole device pixels, the nearest step: a 1x screen has few, and 0.65x of
  // the target reads worse than 1.3x, so it may overshoot by up to a third 
  let steps = Math.round(fill * dpr)
  if (steps / dpr > fill * (4 / 3)) steps -= 1
  const scale = pixel ? Math.max(1, steps) / dpr : fill
  return {
    width: snap(natural.width * scale),
    height: snap(natural.height * scale),
    x: snap(
      (natural.width / 2 - (content.cx ?? content.x + content.width / 2)) *
        scale
    ),
    y: snap(
      (natural.height / 2 - (content.cy ?? content.y + content.height / 2)) *
        scale
    ),
    scale,
    content: { width: content.width * scale, height: content.height * scale },
  }
}
