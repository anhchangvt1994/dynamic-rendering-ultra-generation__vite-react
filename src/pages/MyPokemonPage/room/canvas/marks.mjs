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
}
// size range per kind, × body
const SIZES = {
  spots: [0.05, 0.08],
  patch: [0.12, 0.2],
  scar: [0.1, 0.16],
  flower: [0.06, 0.09],
  stars: [0.04, 0.06],
}
const STRIPE_LENGTH = 1.6
// a stripe on a thin limb still reads: never shorter than this × body
const STRIPE_MIN = 0.2
const SPACING = 1.5
const STAR_CLUSTER = 0.25
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

// the region in true units: cell sides sx/size × sy/size, and each inside
// cell's distance to the nearest outside cell or the frame's border
function region(rig) {
  const size = rig.primary.size
  const mask = unpack(rig.primary.bits, size)
  const { w = 1, h = 1 } = rig.frame ?? {}
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

// a point inside a random cell whose edge clears `margin`
function candidate(R, random, margin, near) {
  const ok = R.cells.filter(
    (c) =>
      c.edge >= margin &&
      (!near ||
        dist(R, near, { x: (c.x + 0.5) / R.size, y: (c.y + 0.5) / R.size }) <=
          near.r)
  )
  if (!ok.length) return null
  const c = ok[Math.floor(random() * ok.length)]
  return {
    x: (c.x + 0.1 + 0.8 * random()) / R.size,
    y: (c.y + 0.1 + 0.8 * random()) / R.size,
  }
}

// Poisson-disk darts; the spacing gives way a step at a time rather than
// leave a mark out
function scatter(R, random, kind, count, body, near) {
  const [lo, hi] = SIZES[kind]
  const shapes = []
  for (let n = 0; n < count; n++) {
    const size = (lo + (hi - lo) * random()) * body
    let spacing = SPACING
    let placed = null
    for (let round = 0; !placed && round < 12; round++, spacing *= RELAX)
      for (let t = 0; !placed && t < TRIES; t++) {
        const p = candidate(R, random, 0.5 * size * (round < 6 ? 1 : 0), near)
        if (!p) break
        if (
          shapes.every((s) => dist(R, s, p) >= spacing * Math.max(s.size, size))
        )
          placed = p
      }
    if (!placed) placed = candidate(R, random, 0, near)
    if (!placed) break
    shapes.push({
      kind,
      x: placed.x,
      y: placed.y,
      size,
      angle: random() * TAU,
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

// across the longest limbs of the main region, shared out by length
function stripes(R, random, branches, count, body) {
  const ranked = branches
    .flatMap((b, index) => runs(R, b, index))
    .map((b) => ({ b, index: b.index, len: branchLength(R, b) }))
    .sort((a, b) => b.len - a.len || a.index - b.index)
  if (!ranked.length) return []
  const want = Math.max(
    count >= 3 ? Math.min(2, ranked.length) : 1,
    Math.min(ranked.length, Math.ceil(count / 2))
  )
  const used = ranked.slice(0, want)
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
        size: Math.max(STRIPE_LENGTH * p.radius * scale, STRIPE_MIN * body),
        angle: p.tangent + Math.PI / 2 + ((random() - 0.5) * Math.PI) / 18,
        tone: 'dark',
        branch: r.index,
      })
    }
  return shapes
}

/**
 * Where an individual's marks ({kind, count, seed} or null) sit on its rig:
 * [{kind, x, y, size, angle, tone, branch?}]; [] when there is nowhere to
 * put them.
 */
export function planMarks(marks, rig) {
  if (!marks || !marks.count || !rig?.primary || rig.noMarks) return []
  const R = region(rig)
  if (!R.cells.length) return []
  const random = mulberry32(marks.seed)
  const body = Math.sqrt(R.cells.length * R.cw * R.ch)
  if (marks.kind === 'stripes' && rig.branches?.length) {
    const shapes = stripes(R, random, rig.branches, marks.count, body)
    if (shapes.length) return shapes
  }
  if (marks.kind === 'stripes')
    // no skeleton: short dashes across the body instead
    return scatter(R, random, 'spots', marks.count, body).map((s) => ({
      ...s,
      kind: 'stripes',
      size: s.size * 2,
    }))
  if (marks.kind === 'stars') {
    const r = STAR_CLUSTER * body
    const centre = candidate(R, random, r * 0.6) ?? candidate(R, random, 0)
    return scatter(R, random, 'stars', marks.count, body, { ...centre, r })
  }
  return SIZES[marks.kind]
    ? scatter(R, random, marks.kind, marks.count, body)
    : []
}

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
    default:
      ctx.arc(0, 0, r, 0, TAU)
  }
}

/**
 * The marks into a px × px texture over frame 0 (`frame` its w, h): alpha is
 * coverage, red dark, green light, blue accent.
 */
export function drawMarks(ctx, shapes, px = 512, frame = { w: 1, h: 1 }) {
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
      ctx.fillStyle = COLOURS[s.tone]
      ctx.fill()
    }
    ctx.restore()
  }
}
