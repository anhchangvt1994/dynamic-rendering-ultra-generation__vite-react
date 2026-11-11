const clamp = (n, m) => Math.max(-m, Math.min(m, n))
const ZERO = { rx: 0, ry: 0, sx: 50, sy: 50 }

/** Pointer position inside a box -> rotation (deg) and foil position (%). */
export function tiltFromPointer({ x, y, width, height }, max = 12) {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return { ...ZERO }
  const px = clamp(x / width, 1) , py = clamp(y / height, 1)
  const nx = Math.max(0, Math.min(1, px)), ny = Math.max(0, Math.min(1, py))
  return {
    rx: Math.abs((0.5 - ny) * 2 * max) < 1e-9 ? 0 : (0.5 - ny) * 2 * max,
    ry: Math.abs((nx - 0.5) * 2 * max) < 1e-9 ? 0 : (nx - 0.5) * 2 * max,
    sx: nx * 100,
    sy: ny * 100,
  }
}

/** Device tilt (deg) -> rotation and foil position; neutral hold is beta 45. */
export function tiltFromOrientation({ beta, gamma }, max = 12) {
  const b = Number.isFinite(beta) ? beta : 45
  const g = Number.isFinite(gamma) ? gamma : 0
  const ry = clamp(g, max)
  const rx = clamp(45 - b, max)
  return { rx: rx || 0, ry: ry || 0, sx: 50 + (ry / max) * 50, sy: 50 - (rx / max) * 50 }
}
