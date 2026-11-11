/**
 * Every planned mark, frame by frame, as one whole shape: where the body
 * around it went, how far it turned and grew. The flow (each frame's cells →
 * where they sit in frame 0) is fitted, per mark, by the similarity (move,
 * turn, scale) that best carries its neighbourhood in frame 0 onto frame K.
 * Drawn per frame from these, a mark can follow a waving tail but never
 * tear or smear the way a per-pixel lookup of a noisy flow does.
 */

// the neighbourhood a mark follows: a gaussian this × its size wide
const REACH = 0.6
// never narrower than this many flow cells
const MIN_CELLS = 1.5
// below this total weight (sure cells) the mark keeps where it last was
const MIN_WEIGHT = 3
// a mark grows or shrinks at most this far
const GROW = 4 / 3
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
 * side); `flow` the decoded flow.webp ({ data, width, height }, RGBA bytes);
 * `json` the rig's ({ frames, frame: { w, h }, flow: { cols, tile } });
 * `body` (optional) each frame's alpha laid out like the flow, one tile per
 * frame (RGBA bytes, alpha read): where frame K no longer shows what sat
 * around a mark in frame 0 — a tail swung behind the body — the mark fades
 * out (`opacity` 0) rather than stay on whatever moved over its place.
 * Returns one shapes array per frame; frame 0 is `shapes` itself.
 */
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
        P.push([
          (flow.data[o] / 255) * w,
          (flow.data[o + 1] / 255) * h,
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
  // how much of each mark shows, frame by frame, then faded over the loop
  const fades = shapes.map((s, i) =>
    fade(
      out.map((_, K) =>
        seen && seen[i] > 0 && K > 0
          ? smoothstep(HIDDEN, SHOWN, shown(s, K, flow, body, json) / seen[i])
          : 1
      ),
      json
    )
  )
  return out.map((frame, K) =>
    K === 0 && fades.every((o) => o[0] === 1)
      ? frame
      : frame.map((m, i) => ({ ...m, opacity: fades[i][K] }))
  )
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
      const d =
        ((flow.data[o] / 255) * w - cx) ** 2 +
        ((flow.data[o + 1] / 255) * h - cy) ** 2
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
  return {
    ...prev,
    ...s,
    x: (qx + c * dx - sn * dy) / w,
    y: (qy + sn * dx + c * dy) / h,
    angle: s.angle + turn,
    size: s.size * k,
  }
}
