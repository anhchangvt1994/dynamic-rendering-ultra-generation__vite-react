// Which Pokémon a landed piece wears. Pure: a steady sequence for the round's companion,
// so the board is varied (no neighbour repeats) yet a resumed round looks the same.
export const POOL = [
  1, 4, 7, 25, 35, 39, 52, 54, 58, 60, 63, 66, 69, 74, 79, 81, 83, 92, 94, 95, 98, 104, 113, 120, 123, 129, 131, 133,
  137, 143, 147, 150, 151, 152, 155, 158, 175, 179, 183, 197, 213, 252, 255, 258, 280, 302, 318, 359, 387, 390, 393,
  403, 425, 447, 456, 468, 495, 498, 501, 570, 607, 650, 653, 656, 700, 722, 725, 728, 778, 810, 813, 816, 906, 909, 912,
]

const mix = (n) => {
  let t = (Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) + 0x7f4a7c15) | 0
  t = Math.imul(t ^ (t >>> 15), 0x2c1b3c6d)
  t = Math.imul(t ^ (t >>> 12), 0x297a2d39)
  return (t ^ (t >>> 15)) >>> 0
}

/** The Pokémon for the n-th piece of a round with this companion. */
export function speciesFor(companion, n) {
  if (n === 0 || n % 5 === 0) return companion
  const prev = speciesFor(companion, n - 1)
  const pick = POOL[mix(companion * 7919 + n) % POOL.length]
  return pick === prev || pick === companion ? POOL[(mix(companion * 7919 + n) + 1) % POOL.length] : pick
}
