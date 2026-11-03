const BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

// Gen V "pixel" animations (the PC-box look): species 1–649.
// Showdown's animated models: species 1–1010 (a few late ones may 404, the
// rail then asks again).
export const PIXEL_MAX = 649
export const MODEL_MAX = 1010

/**
 * A random animated Pokémon for the reading rail.
 * @param {() => number} [random] Math.random-like, injectable for tests
 * @returns {{ id: number, pixel: boolean, src: string }}
 */
export function pickMon(random = Math.random) {
  const pixel = random() < 0.5
  const max = pixel ? PIXEL_MAX : MODEL_MAX
  const id = Math.min(max, 1 + Math.floor(random() * max))
  return {
    id,
    pixel,
    src: pixel
      ? `${BASE}/versions/generation-v/black-white/animated/${id}.gif`
      : `${BASE}/other/showdown/${id}.gif`,
  }
}

/**
 * Pixel art is shown at a whole multiple of its size (never blurred); anything
 * taller than the slot is scaled down. Returns the CSS pixel size.
 */
export function fitMon(width, height, pixel, box = 54) {
  if (!width || !height) return { width: box, height: box }
  const k = pixel && height < box ? Math.floor(box / height) : 0
  if (k >= 1) return { width: width * k, height: height * k }
  const scale = Math.min(1, box / height, box / width)
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}
