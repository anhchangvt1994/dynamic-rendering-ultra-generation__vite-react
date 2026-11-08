import assert from 'node:assert/strict'
import test from 'node:test'
import { trackMarks } from './track.mjs'

const TILE = 32
const COLS = 2
// a 200×100 frame: one isotropic px is 1/200 of the long side
const FRAME = { w: 200, h: 100 }
const LONG = 200
// frame K: the body turned by ANGLE[K] about PIVOT and moved by MOVE[K]
// (isotropic px), every cell of it sure
const ANGLE = [0, 0.4, -0.3, 0.15]
const MOVE = [
  [0, 0],
  [12, -6],
  [-8, 4],
  [0, 10],
]
const SCALE = [1, 1.1, 0.9, 1]
const PIVOT = [100, 50]
const toPx = ([u, v]) => [u * FRAME.w, v * FRAME.h]
const toUv = ([x, y]) => [x / FRAME.w, y / FRAME.h]
// frame 0 → frame K
const forward = (K, p) => {
  const [x, y] = toPx(p)
  const dx = x - PIVOT[0]
  const dy = y - PIVOT[1]
  const c = Math.cos(ANGLE[K]) * SCALE[K]
  const s = Math.sin(ANGLE[K]) * SCALE[K]
  return toUv([
    PIVOT[0] + c * dx - s * dy + MOVE[K][0],
    PIVOT[1] + s * dx + c * dy + MOVE[K][1],
  ])
}
const backward = (K, q) => {
  const [x, y] = toPx(q)
  const dx = x - PIVOT[0] - MOVE[K][0]
  const dy = y - PIVOT[1] - MOVE[K][1]
  const c = Math.cos(-ANGLE[K]) / SCALE[K]
  const s = Math.sin(-ANGLE[K]) / SCALE[K]
  return toUv([PIVOT[0] + c * dx - s * dy, PIVOT[1] + s * dx + c * dy])
}
const inBody = ([u, v]) => u > 0.1 && u < 0.9 && v > 0.1 && v < 0.9

const flowOf = ({ noise = 0, sure = () => true } = {}) => {
  const frames = ANGLE.length
  const width = COLS * TILE
  const height = Math.ceil(frames / COLS) * TILE
  const data = new Uint8ClampedArray(width * height * 4)
  let n = 1
  const rand = () => ((n = (n * 16807) % 2147483647) / 2147483647 - 0.5) * 2
  for (let K = 0; K < frames; K++)
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const q = [(x + 0.5) / TILE, (y + 0.5) / TILE]
        const p = backward(K, q)
        const o =
          ((Math.floor(K / COLS) * TILE + y) * width + (K % COLS) * TILE + x) *
          4
        data[o] = Math.round(p[0] * 255 + (K ? noise * rand() : 0))
        data[o + 1] = Math.round(p[1] * 255 + (K ? noise * rand() : 0))
        data[o + 2] = inBody(p) && sure(K, p) ? 255 : 0
        data[o + 3] = 255
      }
  return { data, width, height }
}
// frame K's body alpha laid out like the flow (one tile per frame); `gone`
// takes cells out (whatever sits there in frame 0 went behind something)
const alphaOf = (gone = () => false) => {
  const { data, width, height } = flowOf()
  for (let K = 0; K < ANGLE.length; K++)
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const p = backward(K, [(x + 0.5) / TILE, (y + 0.5) / TILE])
        const o =
          ((Math.floor(K / COLS) * TILE + y) * width + (K % COLS) * TILE + x) *
          4
        data[o + 3] = inBody(p) && !gone(K, p) ? 255 : 0
      }
  return { data, width, height }
}
const json = {
  frames: ANGLE.length,
  frame: FRAME,
  flow: { cols: COLS, tile: TILE },
}
const heart = {
  kind: 'hearts',
  x: 0.4,
  y: 0.55,
  size: 0.1,
  angle: 0.2,
  tone: 'accent',
}
const star = {
  kind: 'stars',
  x: 0.62,
  y: 0.35,
  size: 0.08,
  angle: -1,
  tone: 'light',
}

const near = (a, b, tol, what) =>
  assert.ok(
    Math.abs(a - b) <= tol,
    `${what}: ${a.toFixed(4)} vs ${b.toFixed(4)}`
  )
// isotropic px between two uv points
const apart = (a, b) =>
  Math.hypot((a[0] - b[0]) * FRAME.w, (a[1] - b[1]) * FRAME.h)

test('frame 0 holds every mark as planned', () => {
  const frames = trackMarks([heart, star], flowOf(), json)
  assert.equal(frames.length, 4)
  assert.deepEqual(frames[0], [heart, star])
})

test('each mark moves, turns and scales with the body around it, whole', () => {
  const frames = trackMarks([heart, star], flowOf(), json)
  for (let K = 1; K < 4; K++)
    for (const [i, s] of [heart, star].entries()) {
      const m = frames[K][i]
      const want = forward(K, [s.x, s.y])
      assert.ok(
        apart([m.x, m.y], want) < 1.5,
        `K=${K} ${s.kind} at ${apart([m.x, m.y], want).toFixed(2)}px`
      )
      near(m.angle, s.angle + ANGLE[K], 0.05, `K=${K} ${s.kind} angle`)
      near(m.size, s.size * SCALE[K], 0.006, `K=${K} ${s.kind} size`)
      assert.equal(m.kind, s.kind)
      assert.equal(m.tone, s.tone)
    }
})

test('coarse, noisy flow still places a mark within a pixel or two', () => {
  const frames = trackMarks([heart], flowOf({ noise: 2 }), json)
  for (let K = 1; K < 4; K++) {
    const want = forward(K, [heart.x, heart.y])
    assert.ok(apart([frames[K][0].x, frames[K][0].y], want) < 2.5, `K=${K}`)
    near(frames[K][0].angle, heart.angle + ANGLE[K], 0.12, `K=${K} angle`)
  }
})

test('a mark with nothing sure around it keeps where it last was', () => {
  // frame 2: nothing sure near the heart (hidden behind an arm)
  const hidden = (K, p) => !(K === 2 && apart(p, [heart.x, heart.y]) < 40)
  const frames = trackMarks([heart], flowOf({ sure: hidden }), json)
  assert.ok(
    apart([frames[1][0].x, frames[1][0].y], [heart.x, heart.y]) > 5,
    'frame 1 moved'
  )
  assert.deepEqual(frames[2][0], frames[1][0])
  assert.notDeepEqual(frames[3][0], frames[1][0], 'found again after')
})

test('a mark whose place went behind the body fades out, and back in', () => {
  // frame 2: nothing of frame K sits where the heart was (a tail swung behind)
  const gone = (K, p) => K === 2 && apart(p, [heart.x, heart.y]) < 30
  const slow = { ...json, delays: [300, 300, 300, 300] }
  const frames = trackMarks([heart, star], flowOf(), slow, alphaOf(gone))
  assert.equal(frames[2][0].opacity, 0, 'heart hidden')
  assert.equal(frames[2][1].opacity, 1, 'star still there')
  for (const K of [1, 3]) assert.equal(frames[K][0].opacity, 1, `K=${K}`)
})

const goneAt2 = (K, p) => K === 2 && apart(p, [heart.x, heart.y]) < 30

test('a mark fades out over the frames before it hides, and in after', () => {
  // 100 ms frames: the 120 ms fade starts a frame ahead and ends a frame after
  const fast = { ...json, delays: [100, 100, 100, 100] }
  const o = trackMarks([heart], flowOf(), fast, alphaOf(goneAt2)).map(
    (f) => f[0].opacity ?? 1
  )
  assert.deepEqual(
    o.map((v) => +v.toFixed(3)),
    [1, 0.833, 0, 0.833]
  )
})

test('a blink shorter than a few frames never hides a mark', () => {
  const blink = { ...json, delays: [30, 30, 30, 30] }
  const o = trackMarks([heart], flowOf(), blink, alphaOf(goneAt2)).map(
    (f) => f[0].opacity ?? 1
  )
  assert.deepEqual(o, [1, 1, 1, 1])
})

test('an unsure flow alone never hides a mark (a flat, dark body)', () => {
  const unsure = (K, p) => !(K === 2 && apart(p, [heart.x, heart.y]) < 40)
  const frames = trackMarks([heart], flowOf({ sure: unsure }), json, alphaOf())
  assert.equal(frames[2][0].opacity, 1)
})

test('without the body alpha every mark shows', () => {
  const frames = trackMarks([heart], flowOf(), json)
  for (let K = 1; K < 4; K++) assert.equal(frames[K][0].opacity, 1)
})

test('a mark never grows or shrinks past a third', () => {
  const big = { ...json }
  const flow = flowOf()
  // frame 1 claims the heart's neighbourhood spread twice as far
  const { data, width } = flow
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const o = (y * width + TILE + x) * 4
      const p = [(x + 0.5) / TILE, (y + 0.5) / TILE]
      data[o] = Math.round((heart.x + (p[0] - heart.x) / 2) * 255)
      data[o + 1] = Math.round((heart.y + (p[1] - heart.y) / 2) * 255)
      data[o + 2] = 255
    }
  const m = trackMarks([heart], flow, big)[1][0]
  assert.ok(m.size <= heart.size * 1.34, `size ${m.size}`)
})
