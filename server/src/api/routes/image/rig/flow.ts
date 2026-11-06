/**
 * Where each displayed frame's body sits in frame 0: dense optical flow
 * (opencv-js Farneback) from frame K back to frame 0, smoothed inside the
 * body, with a forward-backward confidence. The room reads it to carry marks
 * drawn on frame 0 along with the body. Settings from the flow spike.
 */
export type Field = { u: Float32Array; v: Float32Array; conf: Float32Array }

/** Flow tile side in flow.png: one tile per frame. */
export const TILE = 128

const FARNEBACK = {
  pyrScale: 0.5,
  levels: 4,
  win: 41,
  iters: 6,
  polyN: 7,
  polySigma: 1.5,
}
const SMOOTH_PASSES = 3
const SIGMA_C = 0.08
const SIGMA_FB = 1.5
const DILATE = 4

let cvReady: Promise<any> | null = null
// opencv-js is a thenable until its wasm is up: drop `then` before resolving
const opencv = () =>
  (cvReady ??= new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cv = require('@techstark/opencv-js')
    const done = () => {
      delete cv.then
      resolve(cv)
    }
    if (cv.Mat) done()
    else cv.onRuntimeInitialized = done
  }))

/** RGBA bytes → premultiplied RGBA floats 0–1. */
export function premultiplied(raw: Uint8Array, w: number, h: number) {
  const out = new Float32Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const a = raw[i * 4 + 3] / 255
    out[i * 4] = (raw[i * 4] / 255) * a
    out[i * 4 + 1] = (raw[i * 4 + 1] / 255) * a
    out[i * 4 + 2] = (raw[i * 4 + 2] / 255) * a
    out[i * 4 + 3] = a
  }
  return out
}

const inBody = (img: Float32Array, i: number) => img[i * 4 + 3] > 0.5

function bilinear(
  arr: Float32Array,
  w: number,
  h: number,
  x: number,
  y: number
) {
  x = Math.max(0, Math.min(w - 1, x))
  y = Math.max(0, Math.min(h - 1, y))
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(w - 1, x0 + 1)
  const y1 = Math.min(h - 1, y0 + 1)
  const fx = x - x0
  const fy = y - y0
  return (
    (arr[y0 * w + x0] * (1 - fx) + arr[y0 * w + x1] * fx) * (1 - fy) +
    (arr[y1 * w + x0] * (1 - fx) + arr[y1 * w + x1] * fx) * fy
  )
}

// grey × alpha with a lifted floor, so dark bodies still stand off the void
function grey(cv: any, img: Float32Array, w: number, h: number) {
  const m = new cv.Mat(h, w, cv.CV_8UC1)
  for (let i = 0; i < w * h; i++) {
    const lum = 0.3 * img[i * 4] + 0.59 * img[i * 4 + 1] + 0.11 * img[i * 4 + 2]
    m.data[i] = Math.round(255 * (0.15 + 0.85 * lum) * img[i * 4 + 3])
  }
  return m
}

function farneback(
  cv: any,
  A: Float32Array,
  B: Float32Array,
  w: number,
  h: number
) {
  const a = grey(cv, A, w, h)
  const b = grey(cv, B, w, h)
  const f = new cv.Mat()
  try {
    const p = FARNEBACK
    cv.calcOpticalFlowFarneback(
      a,
      b,
      f,
      p.pyrScale,
      p.levels,
      p.win,
      p.iters,
      p.polyN,
      p.polySigma,
      0
    )
    const dx = new Float32Array(w * h)
    const dy = new Float32Array(w * h)
    for (let i = 0; i < w * h; i++) {
      dx[i] = f.data32F[i * 2]
      dy[i] = f.data32F[i * 2 + 1]
    }
    return { dx, dy }
  } finally {
    a.delete()
    b.delete()
    f.delete()
  }
}

// edge-aware smoothing inside A's body, then where it lands in B and how
// surely (the backward flow must bring it home)
function settle(
  A: Float32Array,
  B: Float32Array,
  w: number,
  h: number,
  fwd: { dx: Float32Array; dy: Float32Array },
  bwd: { dx: Float32Array; dy: Float32Array }
): Field {
  let { dx, dy } = fwd
  for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
    const ox = new Float32Array(dx)
    const oy = new Float32Array(dy)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (!inBody(A, i)) continue
        let sx = 0
        let sy = 0
        let sw = 0
        for (let qy = -2; qy <= 2; qy++)
          for (let qx = -2; qx <= 2; qx++) {
            const X = x + qx
            const Y = y + qy
            if (X < 0 || Y < 0 || X >= w || Y >= h) continue
            const j = Y * w + X
            if (!inBody(A, j)) continue
            const dc =
              (A[i * 4] - A[j * 4]) ** 2 +
              (A[i * 4 + 1] - A[j * 4 + 1]) ** 2 +
              (A[i * 4 + 2] - A[j * 4 + 2]) ** 2
            const wt = Math.exp(
              -dc / (2 * SIGMA_C * SIGMA_C) - (qx * qx + qy * qy) / 4.5
            )
            sx += wt * dx[j]
            sy += wt * dy[j]
            sw += wt
          }
        ox[i] = sx / sw
        oy[i] = sy / sw
      }
    dx = ox
    dy = oy
  }
  const alphaB = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) alphaB[i] = B[i * 4 + 3]
  const u = new Float32Array(w * h)
  const v = new Float32Array(w * h)
  const conf = new Float32Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const tx = x + (inBody(A, i) ? dx[i] : 0)
      const ty = y + (inBody(A, i) ? dy[i] : 0)
      u[i] = (tx + 0.5) / w
      v[i] = (ty + 0.5) / h
      if (!inBody(A, i) || bilinear(alphaB, w, h, tx, ty) <= 0.5) continue
      const ex = tx + bilinear(bwd.dx, w, h, tx, ty) - x
      const ey = ty + bilinear(bwd.dy, w, h, tx, ty) - y
      conf[i] = Math.exp(-(ex * ex + ey * ey) / (2 * SIGMA_FB * SIGMA_FB))
    }
  return { u, v, conf }
}

function identity(frame: Float32Array, w: number, h: number): Field {
  const u = new Float32Array(w * h)
  const v = new Float32Array(w * h)
  const conf = new Float32Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      u[i] = (x + 0.5) / w
      v[i] = (y + 0.5) / h
      conf[i] = inBody(frame, i) ? 1 : 0
    }
  return { u, v, conf }
}

/** Where frame (premultiplied RGBA, w×h) sits in `first`; K = 0 is the identity. */
export async function fieldFor(
  frame: Float32Array,
  first: Float32Array,
  w: number,
  h: number,
  K: number
): Promise<Field> {
  if (K === 0) return identity(first, w, h)
  const cv = await opencv()
  return settle(
    frame,
    first,
    w,
    h,
    farneback(cv, frame, first, w, h),
    farneback(cv, first, frame, w, h)
  )
}

/**
 * For every frame (premultiplied RGBA, all w×h): per pixel, where it sits in
 * frame 0 (u, v in 0–1) and how surely. Frame 0 is the identity.
 */
export async function flowToFirst(
  frames: Float32Array[],
  w: number,
  h: number
): Promise<Field[]> {
  const out: Field[] = []
  for (let K = 0; K < frames.length; K++)
    out.push(await fieldFor(frames[K], frames[0], w, h, K))
  return out
}

export type FlowSheet = {
  data: Buffer
  width: number
  height: number
  cols: number
}

/** An empty flow.png for m frames: `cols = ceil(sqrt(m))` tiles across. */
export function flowSheet(m: number): FlowSheet {
  const cols = Math.max(1, Math.ceil(Math.sqrt(m)))
  const width = cols * TILE
  const height = Math.max(1, Math.ceil(m / cols)) * TILE
  return { data: Buffer.alloc(width * height * 4), width, height, cols }
}

/**
 * Frame K's tile: R, G = u, v · 255, B = confidence · 255, A = 255. Each
 * cell is the confidence-weighted mean of its pixels, spread 4 cells into
 * the empty ones; cells still empty hold the identity.
 */
export function writeTile(
  sheet: FlowSheet,
  K: number,
  f: Field,
  w: number,
  h: number
) {
  const N = TILE * TILE
  const su = new Float32Array(N)
  const sv = new Float32Array(N)
  const sc = new Float32Array(N)
  const n = new Float32Array(N)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const j =
        Math.min(TILE - 1, Math.floor((y * TILE) / h)) * TILE +
        Math.min(TILE - 1, Math.floor((x * TILE) / w))
      const i = y * w + x
      const c = f.conf[i]
      su[j] += f.u[i] * c
      sv[j] += f.v[i] * c
      sc[j] += c
      n[j]++
    }
  const u = new Float32Array(N)
  const v = new Float32Array(N)
  const conf = new Float32Array(N)
  let has = new Uint8Array(N)
  for (let j = 0; j < N; j++) {
    const x = j % TILE
    u[j] = (x + 0.5) / TILE
    v[j] = ((j - x) / TILE + 0.5) / TILE
    if (n[j]) conf[j] = sc[j] / n[j]
    if (K > 0 && sc[j] > 1e-3) {
      u[j] = su[j] / sc[j]
      v[j] = sv[j] / sc[j]
      has[j] = 1
    }
  }
  for (let pass = 0; K > 0 && pass < DILATE; pass++) {
    const next = has.slice()
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const j = y * TILE + x
        if (has[j]) continue
        let a = 0
        let b = 0
        let k = 0
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const X = x + dx
          const Y = y + dy
          if (X < 0 || Y < 0 || X >= TILE || Y >= TILE) continue
          const q = Y * TILE + X
          if (!has[q]) continue
          a += u[q]
          b += v[q]
          k++
        }
        if (k) {
          u[j] = a / k
          v[j] = b / k
          next[j] = 1
        }
      }
    has = next
  }
  const ox = (K % sheet.cols) * TILE
  const oy = Math.floor(K / sheet.cols) * TILE
  const byte = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255)
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const j = y * TILE + x
      const o = ((oy + y) * sheet.width + ox + x) * 4
      sheet.data[o] = byte(u[j])
      sheet.data[o + 1] = byte(v[j])
      sheet.data[o + 2] = byte(conf[j])
      sheet.data[o + 3] = 255
    }
}

/** All frames' tiles at once (see writeTile). */
export function encodeFlow(fields: Field[], w: number, h: number) {
  const sheet = flowSheet(fields.length)
  fields.forEach((f, K) => writeTile(sheet, K, f, w, h))
  return sheet
}
