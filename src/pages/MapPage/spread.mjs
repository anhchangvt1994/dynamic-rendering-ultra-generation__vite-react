/**
 * Push points apart until each pair is at least a.r + b.r away (pure, deterministic).
 * points: [{ x, z, r, fixed?, clamp? }]; a fixed point never moves; clamp(p) keeps a mover legal.
 */
export function spread(points, { iterations = 120 } = {}) {
  const P = points.map((p) => ({ ...p }))
  for (let it = 0; it < iterations; it++) {
    let moved = false
    for (let i = 0; i < P.length; i++)
      for (let j = i + 1; j < P.length; j++) {
        const a = P[i]
        const b = P[j]
        const need = a.r + b.r
        let dx = b.x - a.x
        let dz = b.z - a.z
        let d = Math.hypot(dx, dz)
        if (d >= need) continue
        if (d < 1e-6) {
          const t = i * 2.399 + j
          dx = Math.cos(t)
          dz = Math.sin(t)
          d = 1
        }
        const push = (need - d) / d
        const wa = a.fixed ? 0 : b.fixed ? 1 : 0.5
        const wb = b.fixed ? 0 : a.fixed ? 1 : 0.5
        a.x -= dx * push * wa
        a.z -= dz * push * wa
        b.x += dx * push * wb
        b.z += dz * push * wb
        moved = true
      }
    for (const p of P)
      if (!p.fixed && p.clamp) {
        const c = p.clamp(p)
        p.x = c.x
        p.z = c.z
      }
    if (!moved) break
  }
  return P
}
