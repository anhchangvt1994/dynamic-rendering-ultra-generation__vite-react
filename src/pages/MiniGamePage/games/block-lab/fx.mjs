// Block Lab particle math: pure, deterministic for a seeded rng. Units are px and ms.
export const MAX_PARTICLES = 220
const TAU = Math.PI * 2

const make = (kind, x, y, vx, vy, life, size, hue, vr = 0) => ({ kind, x, y, vx, vy, rot: 0, vr, life, max: life, size, hue })

/**
 * `shatter` stone shards that tumble down, `firework` a radial spark burst,
 * `impact` short streaks thrown up from a landing. `existing` caps the total.
 */
export function burst(kind, at, rng, { power = 1, hue, existing = 0 } = {}) {
  const room = Math.max(0, MAX_PARTICLES - existing)
  const want = kind === 'firework' ? Math.round(14 * power) : kind === 'impact' ? 6 : Math.round(8 * power)
  const out = []
  for (let i = 0; i < Math.min(want, room); i += 1) {
    if (kind === 'shatter') {
      out.push(make(kind, at.x, at.y, (rng() - 0.5) * 0.5, -0.1 - rng() * 0.25, 600 + rng() * 200, 3 + rng() * 4, hue ?? Math.floor(rng() * 360), (rng() - 0.5) * 0.02))
    } else if (kind === 'firework') {
      const a = (i / want) * TAU + rng() * 0.4
      const v = (0.12 + rng() * 0.22) * power
      out.push(make(kind, at.x, at.y, Math.cos(a) * v, Math.sin(a) * v, 700 + rng() * 200, 2 + rng() * 2, hue ?? Math.floor(rng() * 360)))
    } else {
      out.push(make(kind, at.x + (rng() - 0.5) * 24, at.y, (rng() - 0.5) * 0.06, -0.25 - rng() * 0.2, 180 + rng() * 30, 2 + rng() * 2, hue ?? 190))
    }
  }
  return out
}

/** Moves every particle by `dtMs` and drops the ones whose life ran out. */
export function stepParticles(list, dtMs) {
  const out = []
  for (const p of list) {
    const life = p.life - dtMs
    if (life <= 0) continue
    let { vx, vy } = p
    if (p.kind === 'shatter') vy += 0.0012 * dtMs
    else if (p.kind === 'firework') {
      const drag = Math.max(0, 1 - 0.0018 * dtMs)
      vx *= drag
      vy = vy * drag + 0.0003 * dtMs
    }
    out.push({ ...p, x: p.x + vx * dtMs, y: p.y + vy * dtMs, vx, vy, rot: p.rot + p.vr * dtMs, life })
  }
  return out
}

/** Staggered firework bursts for a clear: one per line cleared, many for a Tetris. */
export function fireworkPlan(lines, rows) {
  if (lines <= 0 || !rows.length) return []
  const count = lines === 1 ? 1 : lines * 2
  return Array.from({ length: count }, (_, i) => ({ delayMs: i * 70, row: rows[i % rows.length], power: 1 + lines * 0.2 }))
}
