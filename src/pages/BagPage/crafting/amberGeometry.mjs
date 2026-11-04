import { fractureLayout } from './fracture.mjs'

const randomFor = (seed) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 4294967296
}

const cross = (a, b, p) =>
  (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

const unit = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** The finished stone: a rough irregular rock in 3D (lumped, chipped, uneven),
 * seen from above-left and flat-shaded face by face. */
function stoneGeometry(speciesId, required) {
  const random = randomFor(speciesId * 104729 + required * 31 + 7)
  const j = (m) => (random() - 0.5) * 2 * m
  const g = (1 + Math.sqrt(5)) / 2
  let verts = [
    [-1, g, 0],
    [1, g, 0],
    [-1, -g, 0],
    [1, -g, 0],
    [0, -1, g],
    [0, 1, g],
    [0, -1, -g],
    [0, 1, -g],
    [g, 0, -1],
    [g, 0, 1],
    [-g, 0, -1],
    [-g, 0, 1],
  ].map(unit)
  let tris = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ]
  const cache = new Map()
  const mid = (a, b) => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`
    if (!cache.has(key)) {
      cache.set(
        key,
        verts.push(
          unit([
            verts[a][0] + verts[b][0],
            verts[a][1] + verts[b][1],
            verts[a][2] + verts[b][2],
          ])
        ) - 1
      )
    }
    return cache.get(key)
  }
  tris = tris.flatMap(([a, b, c]) => {
    const ab = mid(a, b)
    const bc = mid(b, c)
    const ca = mid(c, a)
    return [
      [a, ab, ca],
      [b, bc, ab],
      [c, ca, bc],
      [ab, bc, ca],
    ]
  })
  // lumpy: a few big bulges and dents, then per-vertex roughness
  const bumps = Array.from({ length: 6 }, () => ({
    d: unit([j(1), j(1), j(1)]),
    a: j(0.3),
  }))
  const axes = [
    0.82 + random() * 0.3,
    0.8 + random() * 0.28,
    0.8 + random() * 0.3,
  ]
  verts = verts.map((v) => {
    let r = 1 + j(0.06)
    for (const b of bumps) r += b.a * Math.max(0, dot3(v, b.d)) ** 3
    return [v[0] * r * axes[0], v[1] * r * axes[1], v[2] * r * axes[2]]
  })
  // chipped flats: shave the rock along a few random planes
  const cuts = Array.from({ length: 5 }, () => ({
    n: unit([j(1), j(1), j(1)]),
    h: 0.72 + random() * 0.16,
  }))
  verts = verts.map((v) => {
    const w = [...v]
    for (const { n, h } of cuts) {
      const over = dot3(w, n) - h
      if (over > 0) {
        w[0] -= n[0] * over
        w[1] -= n[1] * over
        w[2] -= n[2] * over
      }
    }
    return w
  })
  // orient: yaw around the vertical, then tip the top toward the viewer
  const yaw = random() * Math.PI * 2
  const tip = 0.5 + j(0.12)
  const [cy, sy, cx, sx] = [
    Math.cos(yaw),
    Math.sin(yaw),
    Math.cos(tip),
    Math.sin(tip),
  ]
  verts = verts.map(([x, y, z]) => {
    const x1 = x * cy + z * sy
    const z1 = -x * sy + z * cy
    return [x1, y * cx - z1 * sx, y * sx + z1 * cx]
  })
  // fit into the frame: x right, y up, z towards the viewer
  const xs = verts.map((v) => v[0])
  const ys = verts.map((v) => v[1])
  const [x0, x1, y0, y1] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ]
  const scale = 84 / Math.max(x1 - x0, y1 - y0)
  const screen = verts.map(([x, y]) => [
    50 + (x - (x0 + x1) / 2) * scale,
    50 - (y - (y0 + y1) / 2) * scale,
  ])
  const light = unit([-0.55, 0.65, 0.55])
  const facets = []
  for (const [a, b, c] of tris) {
    const [A, B, C] = [verts[a], verts[b], verts[c]]
    let n = unit([
      (B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]),
      (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]),
      (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]),
    ])
    const centre = [
      (A[0] + B[0] + C[0]) / 3,
      (A[1] + B[1] + C[1]) / 3,
      (A[2] + B[2] + C[2]) / 3,
    ]
    if (dot3(n, centre) < 0) n = [-n[0], -n[1], -n[2]]
    if (n[2] <= 0.02) continue
    facets.push({
      points: [screen[a], screen[b], screen[c]],
      tone: clamp((dot3(n, light) - 0.38) * 2.6 + j(0.1), -1, 1),
      z: centre[2],
    })
  }
  facets.sort((p, q) => p.z - q.z)
  // silhouette of the rock = convex hull of its projection
  const pts = [...screen].sort((p, q) => p[0] - q[0] || p[1] - q[1])
  const turn = (o, p, q) =>
    (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0])
  const half = (list) => {
    const out = []
    for (const q of list) {
      while (
        out.length > 1 &&
        turn(out[out.length - 2], out[out.length - 1], q) <= 0
      )
        out.pop()
      out.push(q)
    }
    out.pop()
    return out
  }
  const outline = [...half(pts), ...half([...pts].reverse())]
  const bands = Array.from({ length: 6 }, () => ({
    at: 0.05 + random() * 0.9,
    w: 0.04 + random() * 0.16,
    tone: random() * 2 - 1,
  })).sort((p, q) => p.at - q.at)
  return { outline, facets, bands, tilt: (random() - 0.5) * 50 }
}

/** Visual geometry only: the original fracture ranks and inventory rules stay intact. */
export function amberGeometry(speciesId, required) {
  const random = randomFor(speciesId * 7919 + required)
  const stone = stoneGeometry(speciesId, required)
  const outline = stone.outline
  const pieces = fractureLayout(speciesId, required).pieces.map((piece) => {
    // Warp the square partition into the stone, rather than clipping away
    // corner shards (which would lose inventory-visible pieces).
    const points = piece.points.map(([x, y]) => {
      const dx = x - 0.5,
        dy = y - 0.5
      const radius = Math.hypot(dx, dy)
      if (radius < 1e-10) return [50, 50]
      const direction = [dx / radius, dy / radius]
      let edge = 100
      outline.forEach((a, i) => {
        const b = outline[(i + 1) % outline.length]
        const denominator =
          (b[0] - a[0]) * direction[1] - (b[1] - a[1]) * direction[0]
        if (denominator < -1e-9)
          edge = Math.min(edge, -cross(a, b, [50, 50]) / denominator)
      })
      const distance = Math.max(Math.abs(dx), Math.abs(dy)) * 2 * edge
      return [50 + direction[0] * distance, 50 + direction[1] * distance]
    })
    const center = points.reduce(
      ([x, y], p) => [x + p[0] / points.length, y + p[1] / points.length],
      [0, 0]
    )
    const inner = points.map(([x, y]) => [
      x + (center[0] - x) * 0.17,
      y + (center[1] - y) * 0.17,
    ])
    // conchoidal fracture: shell-like arcs hugging the longest broken edge
    const at = points.reduce(
      (best, a, i) => {
        const b = points[(i + 1) % points.length]
        const len = Math.hypot(b[0] - a[0], b[1] - a[1])
        return len > best.len ? { len, i } : best
      },
      { len: -1, i: 0 }
    )
    const a = points[at.i]
    const b = points[(at.i + 1) % points.length]
    const along = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    const toward = (q, s) => [
      q[0] + (center[0] - q[0]) * s,
      q[1] + (center[1] - q[1]) * s,
    ]
    const ripples = [1, 2, 3].map((k) => [
      toward(along(0.1 + 0.04 * k), 0.1 * k),
      toward(along(0.5), 0.1 * k + 0.14),
      toward(along(0.9 - 0.04 * k), 0.1 * k),
    ])
    // chipped, uneven breaks: the bulge depends only on the edge's two ends,
    // so neighbouring shards share exactly the same curve
    const rounded = (q) => q.map((v) => Math.round(v * 1000))
    const edges = points.map((a, i) => {
      const b = points[(i + 1) % points.length]
      const [ra, rb] = [rounded(a), rounded(b)]
      const forward = ra[0] < rb[0] || (ra[0] === rb[0] && ra[1] <= rb[1])
      const [s, e] = forward ? [a, b] : [b, a]
      const [rs, re] = forward ? [ra, rb] : [rb, ra]
      const r = randomFor(
        (Math.imul(rs[0], 73856093) ^
          Math.imul(rs[1], 19349663) ^
          Math.imul(re[0], 83492791) ^
          Math.imul(re[1], 2654435761)) >>>
          0
      )
      r()
      r()
      const dx = e[0] - s[0]
      const dy = e[1] - s[1]
      const len = Math.hypot(dx, dy) || 1
      const [nx, ny] = [-dy / len, dx / len]
      const d1 = (r() - 0.5) * len * 0.34
      const d2 = (r() - 0.5) * len * 0.34
      const c1 = [s[0] + dx / 3 + nx * d1, s[1] + dy / 3 + ny * d1]
      const c2 = [s[0] + (dx * 2) / 3 + nx * d2, s[1] + (dy * 2) / 3 + ny * d2]
      return forward ? { c1, c2 } : { c1: c2, c2: c1 }
    })
    const sparks = [0, 1, 2].map((k) => {
      const q = inner[(k * 2 + 1) % inner.length]
      return {
        x: center[0] + (q[0] - center[0]) * 0.6,
        y: center[1] + (q[1] - center[1]) * 0.6,
        r: 0.9 + random() * 0.9,
      }
    })
    // uneven angular planes: a fan from an off-centre pivot, each tilted
    const pivot = [
      center[0] + (random() - 0.5) * 6,
      center[1] + (random() - 0.5) * 6,
    ]
    const planes = points.map((a, i) => ({
      points: [a, points[(i + 1) % points.length], pivot],
      tone: random() * 2 - 1,
    }))
    return {
      ...piece,
      planes,
      depth: 0.15 + random() * 0.85,
      edges,
      sparks,
      points,
      inner,
      facets: points.map((p, i) => {
        const next = (i + 1) % points.length
        const light = points[next][0] - p[0] - (points[next][1] - p[1])
        return {
          points: [p, points[next], inner[next], inner[i]],
          light: light > 0,
        }
      }),
      lens: {
        x: (random() - 0.5) * 3,
        y: (random() - 0.5) * 3,
        scale: 1.02 + random() * 0.05,
      },
      glint: inner[0],
      ripples,
      thickness: random(),
      spangle: {
        x: center[0] + (random() - 0.5) * 8,
        y: center[1] + (random() - 0.5) * 8,
        r: 1.4 + random() * 1.2,
        rot: random() * 180,
      },
    }
  })
  return { outline, pieces, stone }
}
