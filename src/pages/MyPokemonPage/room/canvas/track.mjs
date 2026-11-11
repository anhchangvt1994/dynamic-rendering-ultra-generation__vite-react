/**
 * Every planned mark, frame by frame, as one whole shape: where the body
 * around it went, how far it turned and grew. The flow (each frame's cells →
 * where they sit in frame 0) is fitted, per mark, by the affine map that best
 * carries its neighbourhood in frame 0 onto frame K: a similarity (move, turn,
 * scale) plus a residual `lin` (shear, stretch). Drawn per frame from these,
 * a mark can follow a waving tail but never tear or smear the way a
 * per-pixel lookup of a noisy flow does.
 */

// the neighbourhood a mark follows: a gaussian this × its size wide
const REACH = 0.6
// never narrower than this many flow cells
const MIN_CELLS = 1.5
// below this total weight (sure cells) the mark keeps where it last was
const MIN_WEIGHT = 3
// a mark grows or shrinks at most this far
const GROW = 4 / 3
// the weighted normal matrix of the affine fit: below this share of its trace²
// (cells all in a line) the residual stays identity
const MIN_SPREAD = 1e-3
// how much of a mark's frame-0 neighbourhood frame K still shows (share of
// frame 0's): below HIDDEN it went behind something, above SHOWN it is all there
const HIDDEN = 0.2
const SHOWN = 0.4
// a mark fades in and out over this long (ms), finishing out by the time its
// place is gone and starting in once it is back
const FADE_MS = 120
// gone for less than this (ms) a mark stays: a blink reads as a flicker
const MIN_HIDE_MS = 90

/**
 * `shapes` from planMarks (frame-0 0–1 coordinates, size a share of the long
 * side); `flow` the decoded flow.webp ({ data, width, height, low? }, RGBA bytes;
 * `low` the decoded flow-lo.webp, the low bytes of u and v);
 * `json` the rig's ({ frames, frame: { w, h }, flow: { cols, tile } });
 * `body` (optional) each frame's alpha laid out like the flow, one tile per
 * frame (RGBA bytes, alpha read): where frame K no longer shows what sat
 * around a mark in frame 0 — a tail swung behind the body — the mark fades
 * out (`opacity` 0) rather than stay on whatever moved over its place.
 * Returns one shapes array per frame; frame 0 is `shapes` itself. Frames
 * 1.. carry `lin` ([a, b, c, d], canvas order: x' = a·x + c·y, y' = b·x +
 * d·y), the 2×2 residual applied in the mark's own frame after its rotation,
 * and are smoothed over the loop ([1,2,1]/4) unless `json.smooth === false`.
 */
/**
 * A flow cell's frame-0 place [u, v] at byte offset `o`: 16-bit when the low
 * bytes (`flow.low`, flow-lo.webp) come along, else the 8-bit data alone.
 */
export const flowUv = (flow, o) =>
  flow.low
    ? [
        (flow.data[o] * 256 + flow.low[o]) / 65535,
        (flow.data[o + 1] * 256 + flow.low[o + 1]) / 65535,
      ]
    : [flow.data[o] / 255, flow.data[o + 1] / 255]

export function trackMarks(shapes, flow, json, body) {
  const { w, h } = json.frame
  const long = Math.max(w, h)
  const { cols, tile } = json.flow
  const cell = long / tile
  const out = [shapes]
  let last = shapes
  const seen = body ? shapes.map((s) => shown(s, 0, flow, body, json)) : null
  for (let K = 1; K < json.frames; K++) {
    const ox = (K % cols) * tile
    const oy = Math.floor(K / cols) * tile
    // per cell: where it sits in frame 0 and in frame K (isotropic px), how surely
    const P = []
    for (let y = 0; y < tile; y++)
      for (let x = 0; x < tile; x++) {
        const o = ((oy + y) * flow.width + ox + x) * 4
        const c = flow.data[o + 2] / 255
        if (c <= 0) continue
        const [u, v] = flowUv(flow, o)
        P.push([
          u * w,
          v * h,
          ((x + 0.5) / tile) * w,
          ((y + 0.5) / tile) * h,
          c,
        ])
      }
    const now = shapes.map(
      (s, i) => fit(s, last[i], P, w, h, long, cell) ?? last[i]
    )
    out.push(now)
    last = now
  }
  const steady = (json.smooth === false ? out : smooth(out)).map((frame, K) =>
    K === 0 ? frame : frame.map((m) => (m.lin ? m : { ...m, lin: I2 }))
  )
  // how much of each mark shows, frame by frame, then faded over the loop
  const fades = shapes.map((s, i) =>
    fade(
      steady.map((_, K) =>
        seen && seen[i] > 0 && K > 0
          ? smoothstep(HIDDEN, SHOWN, shown(s, K, flow, body, json) / seen[i])
          : 1
      ),
      json
    )
  )
  return steady.map((frame, K) =>
    K === 0 && fades.every((o) => o[0] === 1)
      ? frame
      : frame.map((m, i) => ({ ...m, opacity: fades[i][K] }))
  )
}

// 2×2 matrices as [a, b, c, d] = [[a, c], [b, d]] (canvas order)
const I2 = [1, 0, 0, 1]
const mul2 = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
]
const rot2 = (t) => [Math.cos(t), Math.sin(t), -Math.sin(t), Math.cos(t)]

// `m` with its singular values held within [1/GROW, GROW]; identity when it
// flips (a mirrored fit is noise, not skin)
function limit(m) {
  const E = (m[0] + m[3]) / 2
  const F = (m[0] - m[3]) / 2
  const G = (m[1] + m[2]) / 2
  const H = (m[1] - m[2]) / 2
  const q = Math.hypot(E, H)
  const r = Math.hypot(F, G)
  const s1 = q + r
  const s2 = q - r
  if (!(s2 > 0)) return I2
  const a1 = Math.atan2(G, F)
  const a2 = Math.atan2(H, E)
  const clamp = (v) => Math.min(GROW, Math.max(1 / GROW, v))
  return mul2(
    mul2(rot2((a2 + a1) / 2), [clamp(s1), 0, 0, clamp(s2)]),
    rot2((a2 - a1) / 2)
  )
}

// frames 1.. averaged [1,2,1]/4 with their neighbours round the loop (frame 0
// is a neighbour of the last frame, and never changes itself)
function smooth(out) {
  const n = out.length
  if (n < 2) return out
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
  const avg = (a, b, c) => (a + 2 * b + c) / 4
  return out.map((frame, K) => {
    if (K === 0) return frame
    const before = out[K - 1]
    const after = out[(K + 1) % n]
    return frame.map((m, i) => {
      const lo = before[i]
      const hi = after[i]
      const [l0, l1, l2] = [lo.lin ?? I2, m.lin ?? I2, hi.lin ?? I2]
      return {
        ...m,
        x: avg(lo.x, m.x, hi.x),
        y: avg(lo.y, m.y, hi.y),
        size: avg(lo.size, m.size, hi.size),
        angle:
          m.angle + (wrap(lo.angle - m.angle) + wrap(hi.angle - m.angle)) / 4,
        lin: l1.map((v, j) => avg(l0[j], v, l2[j])),
      }
    })
  })
}

// the loop's frames as times: blinks shorter than MIN_HIDE_MS dropped, then
// each frame no brighter than any hidden one plus how far apart they are
// (FADE_MS from 0 to 1), round the loop both ways
function fade(raw, json) {
  const n = raw.length
  const delay = (K) => json.delays?.[K] || 100
  const at = [0]
  for (let K = 1; K < n; K++) at.push(at[K - 1] + delay(K - 1))
  const loop = at[n - 1] + delay(n - 1)
  const o = raw.slice()
  const start = raw.findIndex((v) => v >= 0.5)
  if (start >= 0)
    for (let i = 1; i <= n; i++) {
      const K = (start + i) % n
      if (raw[K] >= 0.5 || raw[(K - 1 + n) % n] < 0.5) continue
      // a hidden run starts at K
      let len = 0
      let j = K
      while (raw[j] < 0.5) {
        len += delay(j)
        j = (j + 1) % n
      }
      if (len < MIN_HIDE_MS) for (let k = K; k !== j; k = (k + 1) % n) o[k] = 1
    }
  return o.map((_, K) => {
    let v = 1
    for (let j = 0; j < n; j++) {
      if (o[j] >= 1) continue
      const d = Math.abs(at[K] - at[j])
      v = Math.min(v, o[j] + Math.min(d, loop - d) / FADE_MS)
    }
    return v
  })
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// how much of the body around mark `s` (as frame 0 has it) frame K shows:
// its body cells, weighted by how near their frame-0 place is to the mark
function shown(s, K, flow, body, json) {
  const { w, h } = json.frame
  const long = Math.max(w, h)
  const { cols, tile } = json.flow
  const sigma = Math.max(REACH * s.size * long, MIN_CELLS * (long / tile))
  const cx = s.x * w
  const cy = s.y * h
  const ox = (K % cols) * tile
  const oy = Math.floor(K / cols) * tile
  let sum = 0
  for (let y = 0; y < tile; y++)
    for (let x = 0; x < tile; x++) {
      const o = ((oy + y) * flow.width + ox + x) * 4
      if (body.data[((oy + y) * body.width + ox + x) * 4 + 3] < 128) continue
      const [u, v] = flowUv(flow, o)
      const d = (u * w - cx) ** 2 + (v * h - cy) ** 2
      sum += Math.exp(-d / (2 * sigma * sigma))
    }
  return sum
}

function fit(s, prev, P, w, h, long, cell) {
  const cx = s.x * w
  const cy = s.y * h
  const sigma = Math.max(REACH * s.size * long, MIN_CELLS * cell)
  const cut = (2.5 * sigma) ** 2
  let W = 0
  let px = 0
  let py = 0
  let qx = 0
  let qy = 0
  const near = []
  for (const p of P) {
    const d = (p[0] - cx) ** 2 + (p[1] - cy) ** 2
    if (d > cut) continue
    const wt = p[4] * Math.exp(-d / (2 * sigma * sigma))
    near.push([p, wt])
    W += wt
    px += wt * p[0]
    py += wt * p[1]
    qx += wt * p[2]
    qy += wt * p[3]
  }
  if (W < 1e-6) return null
  px /= W
  py /= W
  qx /= W
  qy /= W
  // weighted Procrustes: q - q̄ ≈ k·R(θ)·(p - p̄)
  let a = 0
  let b = 0
  let n = 0
  for (const [p, wt] of near) {
    const X = p[0] - px
    const Y = p[1] - py
    const U = p[2] - qx
    const V = p[3] - qy
    a += wt * (X * U + Y * V)
    b += wt * (X * V - Y * U)
    n += wt * (X * X + Y * Y)
  }
  const turn = n > 1e-9 ? Math.atan2(b, a) : 0
  const k =
    n > 1e-9 ? Math.min(GROW, Math.max(1 / GROW, Math.hypot(a, b) / n)) : 1
  const c = Math.cos(turn) * k
  const sn = Math.sin(turn) * k
  const dx = cx - px
  const dy = cy - py
  // the affine A (q - q̄ = A·(p - p̄)) over the similarity: what is left of it
  // (shear, stretch) rides on the mark as `lin`, in the mark's own frame
  let lin = I2
  let ax = c * dx - sn * dy
  let ay = sn * dx + c * dy
  const A = affine(near, px, py, qx, qy)
  if (A) {
    const M = [c, sn, -sn, c]
    const L = limit(
      mul2(
        [c, -sn, sn, c].map((v) => v / (k * k)),
        A
      )
    )
    const full = mul2(M, L)
    ax = full[0] * dx + full[2] * dy
    ay = full[1] * dx + full[3] * dy
    lin = mul2(mul2(rot2(-s.angle), L), rot2(s.angle))
  }
  return {
    ...prev,
    ...s,
    x: (qx + ax) / w,
    y: (qy + ay) / h,
    angle: s.angle + turn,
    size: s.size * k,
    lin,
  }
}

// the weighted least-squares A (canvas order) with q - q̄ = A·(p - p̄) over
// `near`; null when the cells are (nearly) in a line or the result is not finite
function affine(near, px, py, qx, qy) {
  let xx = 0
  let xy = 0
  let yy = 0
  let ux = 0
  let uy = 0
  let vx = 0
  let vy = 0
  for (const [p, wt] of near) {
    const X = p[0] - px
    const Y = p[1] - py
    const U = p[2] - qx
    const V = p[3] - qy
    xx += wt * X * X
    xy += wt * X * Y
    yy += wt * Y * Y
    ux += wt * U * X
    uy += wt * U * Y
    vx += wt * V * X
    vy += wt * V * Y
  }
  const det = xx * yy - xy * xy
  if (!(det > MIN_SPREAD * (xx + yy) ** 2)) return null
  // [[ux, uy], [vx, vy]] · [[yy, -xy], [-xy, xx]] / det
  const A = [
    (ux * yy - uy * xy) / det,
    (vx * yy - vy * xy) / det,
    (-ux * xy + uy * xx) / det,
    (-vx * xy + vy * xx) / det,
  ]
  return A.every(Number.isFinite) ? A : null
}
