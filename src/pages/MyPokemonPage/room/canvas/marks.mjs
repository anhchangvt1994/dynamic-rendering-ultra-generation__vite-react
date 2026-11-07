/*
 * An individual's marks, planned once on frame 0 of its species' rig and
 * drawn once into a texture the shader carries along the body with the flow.
 * Positions are 0–1 of the frame; sizes are in units of the frame's longest
 * side, so a spot stays round on a tall sprite.
 */
const TONES = {
  spots: 'dark',
  stripes: 'dark',
  patch: 'dark',
  scar: 'light',
  flower: 'accent',
  stars: 'accent',
  hearts: 'accent',
}
// size range per kind, × body (the whole silhouette, not the main region)
const SIZES = {
  spots: [0.08, 0.12],
  patch: [0.18, 0.26],
  scar: [0.16, 0.22],
  flower: [0.1, 0.14],
  stars: [0.07, 0.1],
  hearts: [0.1, 0.14],
}
/** no mark is drawn smaller than this share of the frame's long side */
export const MIN_SIZE = 0.055
const MIN_STARS = 3
const STRIPE_LENGTH = 1.6
// a stripe on a thin limb still reads: never shorter than this × body
const STRIPE_MIN = 0.2
const SPACING = 1.5
// a heart leans at most this far either way: it stays upright
const HEART_TILT = 0.3
// a mark sits first within this share of its zone's radius from the centre
const CORE = 0.3
const TRIES = 40
const RELAX = 0.85
const TAU = Math.PI * 2

/** mulberry32: a seeded random 0–1 */
export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const unpack = (bits, size) => {
  const bin = atob(bits)
  const out = new Uint8Array(size * size)
  for (let i = 0; i < out.length; i++)
    out[i] = (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1
  return out
}

const SPREAD = 0.0016
const LIGHT_CHROMA = 0.04
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const oklab = (r, g, b) => {
  const [R, G, B] = [r, g, b].map((c) => linear(c / 255))
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/**
 * The whole silhouette the shader recolours, from frame 0's RGBA (w × h,
 * straight alpha): a size × size cell is on when at least half its pixels are
 * opaque, not locked (ink, pale highlight — the shader's rule) and near one
 * of the colour regions. → {size, mask}
 */
export function bodyMask(rgba, w, h, clusters, lock, size = 64) {
  const mask = new Uint8Array(size * size)
  const sources = (clusters ?? []).slice(0, 3).map((c) => c.lab)
  if (!w || !h || !sources.length) return { size, mask }
  const good = (i) => {
    if (rgba[i + 3] <= 127) return false
    const [L, a, b] = oklab(rgba[i], rgba[i + 1], rgba[i + 2])
    const C = Math.hypot(a, b)
    const locked = Math.max(
      1 - smooth(lock.ink - 0.03, lock.ink + 0.03, L),
      smooth(lock.light - 0.03, lock.light + 0.03, L) *
        (1 - smooth(LIGHT_CHROMA - 0.02, LIGHT_CHROMA + 0.02, C))
    )
    if (locked >= 0.5) return false
    let top = 0
    for (const s of sources)
      top = Math.max(top, Math.exp(-((a - s[1]) ** 2 + (b - s[2]) ** 2) / SPREAD))
    return top > 0.3
  }
  // each cell's pixel span; a frame smaller than the grid shares pixels
  const span = (c, n) => {
    const lo = Math.min(n - 1, Math.floor((c * n) / size))
    return [lo, Math.max(lo + 1, Math.floor(((c + 1) * n) / size))]
  }
  for (let cy = 0; cy < size; cy++) {
    const [y0, y1] = span(cy, h)
    for (let cx = 0; cx < size; cx++) {
      const [x0, x1] = span(cx, w)
      let hits = 0
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) if (good((y * w + x) * 4)) hits++
      if (2 * hits >= (x1 - x0) * (y1 - y0)) mask[cy * size + cx] = 1
    }
  }
  return { size, mask }
}

// the region in true units: cell sides sx/size × sy/size, and each inside
// cell's distance to the nearest outside cell or the frame's border
function region(mask, size, frame) {
  const { w = 1, h = 1 } = frame ?? {}
  const sx = w / Math.max(w, h)
  const sy = h / Math.max(w, h)
  const cw = sx / size
  const ch = sy / size
  const outside = []
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (mask[y * size + x]) continue
      const touches = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(
        ([dx, dy]) =>
          x + dx >= 0 && x + dx < size && mask[(y + dy) * size + x + dx] === 1
      )
      if (touches) outside.push([x, y])
    }
  const cells = []
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!mask[y * size + x]) continue
      let d = Math.min(
        (x + 0.5) * cw,
        (size - x - 0.5) * cw,
        (y + 0.5) * ch,
        (size - y - 0.5) * ch
      )
      for (const [ox, oy] of outside)
        d = Math.min(d, Math.hypot((x - ox) * cw, (y - oy) * ch))
      // from the centre to the outside cell's near side
      cells.push({ x, y, edge: Math.max(0, d - 0.5 * Math.min(cw, ch)) })
    }
  return { size, mask, sx, sy, cw, ch, cells }
}

// true-unit distance between two 0–1 points
const dist = (R, a, b) => Math.hypot((a.x - b.x) * R.sx, (a.y - b.y) * R.sy)

// a point inside a random cell of `cells` whose edge clears `margin`
function candidate(R, cells, random, margin) {
  const ok = cells.filter((c) => c.edge >= margin)
  if (!ok.length) return null
  const c = ok[Math.floor(random() * ok.length)]
  return {
    x: (c.x + 0.1 + 0.8 * random()) / R.size,
    y: (c.y + 0.1 + 0.8 * random()) / R.size,
  }
}

// `count` zones of equal area over the region, so marks spread over the
// whole body rather than gather in one place: bands along its long axis
// (about as many as keep a zone square), each band cut across into its
// share of the zones. The bands that take one zone more are picked at random.
function zones(R, random, count) {
  const { cells } = R
  const span = (k) => {
    let lo = Infinity
    let hi = -Infinity
    for (const c of cells) {
      lo = Math.min(lo, c[k])
      hi = Math.max(hi, c[k])
    }
    return hi - lo + 1
  }
  const w = span('x') * R.cw
  const h = span('y') * R.ch
  const [long, short] = h >= w ? ['y', 'x'] : ['x', 'y']
  const ratio = Math.max(w, h) / Math.max(Math.min(w, h), 1e-9)
  const rows = Math.max(1, Math.min(count, Math.round(Math.sqrt(count * ratio))))
  const per = Array(rows).fill(Math.floor(count / rows))
  const order = [...per.keys()]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  order.slice(0, count % rows).forEach((k) => per[k]++)
  const slice = (list, n, a, b) => {
    const sorted = [...list].sort((p, q) => p[a] - q[a] || p[b] - q[b])
    return Array.from({ length: n }, (_, k) =>
      sorted.slice(
        Math.round((k * sorted.length) / n),
        Math.round(((k + 1) * sorted.length) / n)
      )
    )
  }
  return slice(cells, rows, long, short).flatMap((band, k) =>
    slice(band, per[k], short, long)
  )
}

// a zone's cells near its centre first (a jittered grid, not darts that
// may all land on the zones' shared borders), then the whole zone
function cores(R, zone) {
  let cx = 0
  let cy = 0
  for (const c of zone) {
    cx += c.x
    cy += c.y
  }
  cx /= zone.length
  cy /= zone.length
  const r = Math.sqrt((zone.length * R.cw * R.ch) / Math.PI)
  const near = (c) => Math.hypot((c.x - cx) * R.cw, (c.y - cy) * R.ch)
  const core = zone.filter((c) => near(c) <= CORE * r)
  return core.length ? [core, zone] : [zone]
}

// one mark per zone, darts inside its core then the zone; the spacing gives
// way a step at a time rather than leave a mark out
function scatter(R, random, kind, count, body) {
  const [lo, hi] = SIZES[kind]
  const shapes = []
  for (const zone of zones(R, random, count)) {
    const cells = zone.length ? zone : R.cells
    const tiers = cores(R, cells)
    const size = Math.max(MIN_SIZE, (lo + (hi - lo) * random()) * body)
    let spacing = SPACING
    let placed = null
    for (let round = 0; !placed && round < 12; round++, spacing *= RELAX)
      for (let t = 0; !placed && t < TRIES; t++) {
        const pool = tiers[Math.min(tiers.length - 1, round >> 1)]
        const p = candidate(R, pool, random, 0.5 * size * (round < 6 ? 1 : 0))
        if (!p) break
        if (
          shapes.every((s) => dist(R, s, p) >= spacing * Math.max(s.size, size))
        )
          placed = p
      }
    if (!placed) placed = candidate(R, cells, random, 0)
    if (!placed) continue
    const turn = random()
    shapes.push({
      kind,
      x: placed.x,
      y: placed.y,
      size,
      angle: kind === 'hearts' ? (turn - 0.5) * 2 * HEART_TILT : turn * TAU,
      tone: TONES[kind],
    })
  }
  return shapes
}

const branchLength = (R, b) => {
  let len = 0
  for (let i = 1; i < b.points.length; i++)
    len += Math.hypot(
      (b.points[i][0] - b.points[i - 1][0]) * R.sx,
      (b.points[i][1] - b.points[i - 1][1]) * R.sy
    )
  return len
}

// the point, tangent and radius at arc fraction f of a branch
function along(R, b, f) {
  const pts = b.points
  if (pts.length < 2)
    return { x: pts[0][0], y: pts[0][1], tangent: 0, radius: b.radius[0] }
  const seg = pts
    .slice(1)
    .map((p, i) =>
      Math.hypot((p[0] - pts[i][0]) * R.sx, (p[1] - pts[i][1]) * R.sy)
    )
  let left = f * seg.reduce((a, b) => a + b, 0)
  let i = 0
  while (i < seg.length - 1 && left > seg[i]) left -= seg[i++]
  const t = seg[i] ? left / seg[i] : 0
  const [x0, y0] = pts[i]
  const [x1, y1] = pts[i + 1]
  return {
    x: x0 + (x1 - x0) * t,
    y: y0 + (y1 - y0) * t,
    tangent: Math.atan2((y1 - y0) * R.sy, (x1 - x0) * R.sx),
    radius: b.radius[i] + (b.radius[i + 1] - b.radius[i]) * t,
  }
}

const inside = (R, [x, y]) =>
  R.mask[
    Math.min(R.size - 1, Math.floor(y * R.size)) * R.size +
      Math.min(R.size - 1, Math.floor(x * R.size))
  ] === 1

// a branch's runs of points that lie on the main region
function runs(R, b, index) {
  const out = []
  let run = null
  b.points.forEach((p, i) => {
    if (!inside(R, p)) return (run = null)
    if (!run) out.push((run = { points: [], radius: [], index }))
    run.points.push(p)
    run.radius.push(b.radius[i])
  })
  return out
}

// across every limb of the main region (as many as the count allows, the
// longest first), shared out by length
function stripes(R, random, branches, count, body) {
  const ranked = branches
    .flatMap((b, index) => runs(R, b, index))
    .map((b) => ({ b, index: b.index, len: branchLength(R, b) }))
    .sort((a, b) => b.len - a.len || a.index - b.index)
  if (!ranked.length) return []
  const used = ranked.slice(0, Math.min(ranked.length, count))
  const total = used.reduce((s, r) => s + r.len, 0) || used.length
  const share = used.map((r) => ({ ...r, n: 1, rest: 0 }))
  let left = count - share.length
  share.forEach((r) => {
    const exact = (left * (r.len || 1)) / total
    r.n += Math.floor(exact)
    r.rest = exact - Math.floor(exact)
  })
  left = count - share.reduce((s, r) => s + r.n, 0)
  ;[...share]
    .sort((a, b) => b.rest - a.rest)
    .slice(0, left)
    .forEach((r) => r.n++)
  const scale = (R.sx + R.sy) / 2
  const shapes = []
  for (const r of share)
    for (let j = 0; j < r.n; j++) {
      const f = (j + 0.5 + 0.3 * (random() - 0.5)) / r.n
      const p = along(R, r.b, Math.min(1, Math.max(0, f)))
      shapes.push({
        kind: 'stripes',
        x: p.x,
        y: p.y,
        size: Math.max(
          STRIPE_LENGTH * p.radius * scale,
          STRIPE_MIN * body,
          MIN_SIZE
        ),
        angle: p.tangent + Math.PI / 2 + ((random() - 0.5) * Math.PI) / 18,
        tone: 'dark',
        branch: r.index,
      })
    }
  return shapes
}

const measure = (R) => Math.sqrt(R.cells.length * R.cw * R.ch)

/**
 * Where an individual's marks ({kind, count, seed} or null) sit on its rig:
 * [{kind, x, y, size, angle, tone, branch?}]; [] when there is nowhere to
 * put them. `body` ({size, mask} from bodyMask) is the whole silhouette:
 * marks are spread over it and sized by it; stripes keep to the limbs of the
 * main region. Without one (or an empty one) the main region stands in.
 */
export function planMarks(marks, rig, body = null) {
  if (!marks || !marks.count || !rig?.primary || rig.noMarks) return []
  const P = region(unpack(rig.primary.bits, rig.primary.size), rig.primary.size, rig.frame)
  const B = body?.mask?.some(Boolean) ? region(body.mask, body.size, rig.frame) : P
  if (!B.cells.length) return []
  const random = mulberry32(marks.seed)
  const unit = measure(B)
  if (marks.kind === 'stripes' && rig.branches?.length && P.cells.length) {
    const shapes = stripes(P, random, rig.branches, marks.count, unit)
    if (shapes.length) return shapes
  }
  if (marks.kind === 'stripes')
    // no skeleton: short dashes across the body instead
    return scatter(B, random, 'spots', marks.count, unit).map((s) => ({
      ...s,
      kind: 'stripes',
      size: s.size * 2,
    }))
  if (marks.kind === 'stars')
    return scatter(B, random, 'stars', Math.max(MIN_STARS, marks.count), unit)
  return SIZES[marks.kind]
    ? scatter(B, random, marks.kind, marks.count, unit)
    : []
}

const OUTLINE_PX = 3
const OUTLINE_ALPHA = 0.6
// the kinds drawn with a rim, and (on a glowing palette) a halo
const RIMMED = new Set(['stars', 'flower', 'hearts'])
// the halo's blur, × the mark's size in texture pixels
const GLOW_BLUR = 0.3
const GLOW_COLOUR = 'rgba(0,0,255,0.9)'
const COLOURS = {
  dark: 'rgb(255,0,0)',
  light: 'rgb(0,255,0)',
  accent: 'rgb(0,0,255)',
}

function path(ctx, s) {
  const r = s.size / 2
  ctx.beginPath()
  switch (s.kind) {
    case 'stripes': {
      // a slightly bent stroke, thin at both ends
      const L = s.size / 2
      const bend = 0.12 * s.size
      const wide = 0.3 * s.size
      ctx.moveTo(-L, 0)
      ctx.quadraticCurveTo(0, bend - wide, L, 0)
      ctx.quadraticCurveTo(0, bend + wide, -L, 0)
      break
    }
    case 'patch': {
      const random = mulberry32(Math.round(s.x * 1e6) ^ Math.round(s.y * 1e3))
      const pts = Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * TAU
        const k = r * (0.75 + 0.5 * random())
        return [Math.cos(a) * k, Math.sin(a) * k]
      })
      const mid = (i) => {
        const a = pts[i % 8]
        const b = pts[(i + 1) % 8]
        return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      }
      ctx.moveTo(...mid(7))
      for (let i = 0; i < 8; i++) ctx.quadraticCurveTo(...pts[i], ...mid(i))
      break
    }
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        ctx.ellipse(
          Math.cos(a) * r * 0.5,
          Math.sin(a) * r * 0.5,
          r * 0.5,
          r * 0.28,
          a,
          0,
          TAU
        )
      }
      break
    case 'stars':
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU - Math.PI / 2
        const k = i % 2 ? r * 0.45 : r
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * k, Math.sin(a) * k)
      }
      ctx.closePath()
      break
    case 'hearts':
      // plump: two round lobes, a soft point below
      ctx.moveTo(0, r * 0.95)
      ctx.bezierCurveTo(-r * 0.35, r * 0.62, -r * 1.02, r * 0.2, -r * 0.96, -r * 0.3)
      ctx.bezierCurveTo(-r * 0.9, -r * 0.88, -r * 0.2, -r * 0.98, 0, -r * 0.48)
      ctx.bezierCurveTo(r * 0.2, -r * 0.98, r * 0.9, -r * 0.88, r * 0.96, -r * 0.3)
      ctx.bezierCurveTo(r * 1.02, r * 0.2, r * 0.35, r * 0.62, 0, r * 0.95)
      ctx.closePath()
      break
    default:
      ctx.arc(0, 0, r, 0, TAU)
  }
}

/**
 * The marks into a px × px texture over frame 0 (`frame` its w, h): alpha is
 * coverage, red dark, green light, blue accent. `glow` (a cute palette) puts
 * a soft accent halo under stars, flowers and hearts.
 */
export function drawMarks(
  ctx,
  shapes,
  px = 512,
  frame = { w: 1, h: 1 },
  { glow = false } = {}
) {
  const long = Math.max(frame.w, frame.h)
  const sx = frame.w / long
  const sy = frame.h / long
  for (const s of shapes) {
    ctx.save()
    ctx.translate(s.x * px, s.y * px)
    ctx.scale(px / sx, px / sy)
    ctx.rotate(s.angle)
    path(ctx, s)
    if (s.kind === 'scar') {
      // a thin zigzag
      const L = s.size / 2
      ctx.beginPath()
      for (let i = 0; i <= 6; i++)
        ctx[i ? 'lineTo' : 'moveTo'](
          -L + (i / 6) * s.size,
          (i % 2 ? 1 : -1) * 0.12 * s.size
        )
      ctx.strokeStyle = COLOURS[s.tone]
      ctx.lineWidth = (1.5 * Math.min(sx, sy)) / px
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke()
    } else {
      if (glow && RIMMED.has(s.kind)) {
        ctx.shadowColor = GLOW_COLOUR
        ctx.shadowBlur = GLOW_BLUR * s.size * px
        ctx.fillStyle = COLOURS.accent
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.shadowColor = 'rgba(0,0,0,0)'
      }
      if (RIMMED.has(s.kind)) {
        // a dark rim under the fill (3 px at 512) so they read on any body
        ctx.globalAlpha = OUTLINE_ALPHA
        ctx.strokeStyle = COLOURS.dark
        ctx.lineWidth = (OUTLINE_PX * Math.min(sx, sy)) / 512
        ctx.lineJoin = 'round'
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      ctx.fillStyle = COLOURS[s.tone]
      ctx.fill()
    }
    ctx.restore()
  }
}
