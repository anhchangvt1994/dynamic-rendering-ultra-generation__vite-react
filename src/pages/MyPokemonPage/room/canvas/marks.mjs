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
  snow: 'accent',
}
// size range per kind, × body (the whole silhouette, not the main region)
const SIZES = {
  spots: [0.07, 0.11],
  patch: [0.14, 0.2],
  scar: [0.16, 0.22],
  flower: [0.1, 0.14],
  stars: [0.07, 0.1],
  hearts: [0.1, 0.14],
  snow: [0.09, 0.13],
}
// spots and patches mix one or two big marks (where the body is thickest)
// with the small ones, as on a real coat
const BIG = { spots: [0.16, 0.22], patch: [0.26, 0.32] }
const bigCount = (kind, count) =>
  !BIG[kind]
    ? 0
    : kind === 'patch'
      ? +(count >= 2)
      : count >= 6
        ? 2
        : +(count >= 3)
// a mark keeps half its size from the outline; a big one may hang past it
// (the silhouette clips it)
const KEEP = 0.5
const SPILL = 0.3
// every mark keeps half its size from the holes inside the body: the eyes,
// the mouth, the cheeks (never relaxed)
const HOLE_CLEAR = 0.6
// a big mark's place: the zone's cells at least this × its thickest
const THICK = 0.6
// dark marks keep to the main colour when it is at least this share of it
const DARK_SHARE = 0.35
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
      top = Math.max(
        top,
        Math.exp(-((a - s[1]) ** 2 + (b - s[2]) ** 2) / SPREAD)
      )
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

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

// the outside cells no path through the outside joins to the frame's
// border, in groups of two cells or more (one is noise): the holes inside
// the body
function holesOf(mask, size) {
  const open = new Uint8Array(size * size)
  const queue = []
  for (let i = 0; i < size; i++)
    for (const [x, y] of [
      [i, 0],
      [i, size - 1],
      [0, i],
      [size - 1, i],
    ])
      if (!mask[y * size + x] && !open[y * size + x]) {
        open[y * size + x] = 1
        queue.push([x, y])
      }
  while (queue.length) {
    const [x, y] = queue.pop()
    for (const [dx, dy] of STEPS) {
      const nx = x + dx
      const ny = y + dy
      const j = ny * size + nx
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
      if (mask[j] || open[j]) continue
      open[j] = 1
      queue.push([nx, ny])
    }
  }
  const hole = new Uint8Array(size * size)
  const seen = new Uint8Array(size * size)
  for (let i = 0; i < size * size; i++) {
    if (mask[i] || open[i] || seen[i]) continue
    const group = [i]
    seen[i] = 1
    for (let k = 0; k < group.length; k++) {
      const x = group[k] % size
      const y = Math.floor(group[k] / size)
      for (const [dx, dy] of STEPS) {
        const nx = x + dx
        const ny = y + dy
        const j = ny * size + nx
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
        if (mask[j] || seen[j]) continue
        seen[j] = 1
        group.push(j)
      }
    }
    if (group.length >= 2) for (const j of group) hole[j] = 1
  }
  return hole
}

// the region in true units: cell sides sx/size × sy/size, and each inside
// cell's distance to the outline (`rim`: the outside or the frame's border),
// to the nearest hole inside (`hole`) and to either (`edge`). Cells of
// `within` (the body around a part of it) are holes too: never spilled over
function region(mask, size, frame, within = null) {
  const { w = 1, h = 1 } = frame ?? {}
  const sx = w / Math.max(w, h)
  const sy = h / Math.max(w, h)
  const cw = sx / size
  const ch = sy / size
  const holes = holesOf(mask, size)
  const outline = []
  const inner = []
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (mask[y * size + x]) continue
      const touches = STEPS.some(
        ([dx, dy]) =>
          x + dx >= 0 && x + dx < size && mask[(y + dy) * size + x + dx] === 1
      )
      const i = y * size + x
      if (touches) (holes[i] || within?.[i] ? inner : outline).push([x, y])
    }
  const half = 0.5 * Math.min(cw, ch)
  // from the centre to the nearest listed cell's near side
  const reach = (x, y, list, d) => {
    for (const [ox, oy] of list)
      d = Math.min(d, Math.hypot((x - ox) * cw, (y - oy) * ch))
    return Math.max(0, d - half)
  }
  const cells = []
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!mask[y * size + x]) continue
      const border = Math.min(
        (x + 0.5) * cw,
        (size - x - 0.5) * cw,
        (y + 0.5) * ch,
        (size - y - 0.5) * ch
      )
      const rim = reach(x, y, outline, border + half)
      const hole = reach(x, y, inner, Infinity)
      cells.push({ x, y, rim, hole, edge: Math.min(rim, hole) })
    }
  return { size, mask, sx, sy, cw, ch, cells }
}

// true-unit distance between two 0–1 points
const dist = (R, a, b) => Math.hypot((a.x - b.x) * R.sx, (a.y - b.y) * R.sy)

// a point inside a random cell of `cells` that keeps `rim` from the outline
// and `hole` from the holes inside → {x, y, cell}
function candidate(R, cells, random, rim, hole = 0) {
  const ok = cells.filter((c) => c.rim >= rim && c.hole >= hole)
  if (!ok.length) return null
  const c = ok[Math.floor(random() * ok.length)]
  return {
    x: (c.x + 0.1 + 0.8 * random()) / R.size,
    y: (c.y + 0.1 + 0.8 * random()) / R.size,
    cell: c,
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
  const rows = Math.max(
    1,
    Math.min(count, Math.round(Math.sqrt(count * ratio)))
  )
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

// a big mark's zone cells where the body is thickest, then the whole zone
function thick(zone) {
  const top = Math.max(0, ...zone.map((c) => Math.min(c.edge, 1)))
  const best = zone.filter((c) => c.edge >= THICK * top)
  return best.length ? [best, zone] : [zone]
}

// one mark per zone, darts inside its core then the zone; the spacing gives
// way a step at a time rather than leave a mark out. The big marks go to the
// zones where the body is thickest; a mark the outline crowds (a thin limb,
// a tail) shrinks to fit, never under MIN_SIZE
function scatter(R, random, kind, count, body) {
  const list = zones(R, random, count)
  const big = new Set(
    list
      .map((zone, i) => [
        i,
        Math.max(0, ...zone.map((c) => Math.min(c.edge, 1))),
      ])
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, bigCount(kind, count))
      .map(([i]) => i)
  )
  const shapes = []
  list.forEach((zone, i) => {
    const cells = zone.length ? zone : R.cells
    const large = big.has(i)
    const tiers = large ? thick(cells) : cores(R, cells)
    const [lo, hi] = large ? BIG[kind] : SIZES[kind]
    let size = Math.max(MIN_SIZE, (lo + (hi - lo) * random()) * body)
    const keep = large ? SPILL : KEEP
    let spacing = SPACING
    let placed = null
    for (let round = 0; !placed && round < 12; round++, spacing *= RELAX)
      for (let t = 0; !placed && t < TRIES; t++) {
        const pool = tiers[Math.min(tiers.length - 1, round >> 1)]
        const rim = round < 6 ? keep * size : 0
        const p = candidate(R, pool, random, rim, HOLE_CLEAR * size)
        if (!p) break
        if (
          shapes.every((s) => dist(R, s, p) >= spacing * Math.max(s.size, size))
        )
          placed = p
      }
    if (!placed) placed = candidate(R, cells, random, 0, HOLE_CLEAR * size)
    if (!placed) placed = candidate(R, cells, random, 0)
    if (!placed) return
    const { rim, hole } = placed.cell
    size = Math.max(MIN_SIZE, Math.min(size, rim / keep, hole / HOLE_CLEAR))
    const turn = random()
    shapes.push({
      kind,
      x: placed.x,
      y: placed.y,
      size,
      angle: kind === 'hearts' ? (turn - 0.5) * 2 * HEART_TILT : turn * TAU,
      tone: TONES[kind],
      seed: Math.floor(random() * 2 ** 31),
    })
  })
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
  const P = region(
    unpack(rig.primary.bits, rig.primary.size),
    rig.primary.size,
    rig.frame
  )
  const B = body?.mask?.some(Boolean)
    ? region(body.mask, body.size, rig.frame)
    : P
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
  if (!SIZES[marks.kind]) return []
  // dark marks keep to the main colour, off a pale belly, when it is enough
  // of the body to spread over (its holes — the belly, the cheeks — kept clear)
  const dark =
    TONES[marks.kind] === 'dark' && B !== P ? mainOf(B, P, rig.frame) : null
  return scatter(dark ?? B, random, marks.kind, marks.count, unit)
}

function mainOf(B, P, frame) {
  if (B.size !== P.size) return null
  const mask = B.mask.map((on, i) => on & P.mask[i])
  let n = 0
  for (const on of mask) n += on
  return n >= DARK_SHARE * B.cells.length
    ? region(mask, B.size, frame, B.mask)
    : null
}

// a thin opaque rim: a see-through one mixes the dark tone into the accent
const OUTLINE_PX = 2.5
// the kinds drawn with a rim; all but the scar glow on a glowing palette
const RIMMED = new Set(['stars', 'flower', 'hearts', 'snow', 'scar'])
const GLOWING = new Set(['stars', 'flower', 'hearts', 'snow'])
// the halo's blur, × the mark's size in texture pixels
const GLOW_BLUR = 0.3
const GLOW_COLOUR = 'rgba(0,0,255,0.5)'
const COLOURS = {
  dark: 'rgb(255,0,0)',
  light: 'rgb(0,255,0)',
  accent: 'rgb(0,0,255)',
}

// a mark's own random, from its seed (older plans: from where it sits)
const seeded = (s) =>
  mulberry32(s.seed ?? Math.round(s.x * 1e6) ^ Math.round(s.y * 1e3))

const BLOB_POINTS = 20
// a closed organic curve round cx, cy: radius r rippled by harmonics 2–5
// (each smaller than the last), stretched a little one way, so no two match.
// Every lobe winds the same way: overlapping lobes fill as one
function blob(ctx, random, cx, cy, r) {
  const waves = [2, 3, 4, 5].map((k) => ({
    k,
    a: (0.26 / (k - 1)) * (0.5 + 0.5 * random()),
    p: random() * TAU,
  }))
  const stretch = 1 + 0.35 * random()
  const tilt = random() * TAU
  const raw = Array.from({ length: BLOB_POINTS }, (_, i) => {
    const t = (i / BLOB_POINTS) * TAU
    let k = 1
    for (const w of waves) k += w.a * Math.cos(w.k * t + w.p)
    k = Math.max(0.45, k)
    return [Math.cos(t) * k * stretch, Math.sin(t) * k]
  })
  // never past r: the plan's clearances hold for the whole outline
  const far = Math.max(...raw.map(([x, y]) => Math.hypot(x, y)))
  const pts = raw.map(([x, y]) => [
    cx + ((x * Math.cos(tilt) - y * Math.sin(tilt)) * r) / far,
    cy + ((x * Math.sin(tilt) + y * Math.cos(tilt)) * r) / far,
  ])
  const mid = (i) => {
    const a = pts[i % BLOB_POINTS]
    const b = pts[(i + 1) % BLOB_POINTS]
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  }
  ctx.moveTo(...mid(BLOB_POINTS - 1))
  for (let i = 0; i < BLOB_POINTS; i++)
    ctx.quadraticCurveTo(...pts[i], ...mid(i))
  ctx.closePath()
}

// one healed cut: a lens from one end to the other, widest a little off the
// middle, slightly bent, at (cx, cy) along angle a. Every lens winds the same
// way: crossing cuts fill as one
function cut(ctx, cx, cy, a, len, wide, bend) {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const at = (x, y) => [cx + x * c - y * s, cy + x * s + y * c]
  const L = len / 2
  ctx.moveTo(...at(-L, 0))
  ctx.quadraticCurveTo(...at(0.1 * L, bend - wide), ...at(L, 0))
  ctx.quadraticCurveTo(...at(0.1 * L, bend + wide), ...at(-L, 0))
  ctx.closePath()
}

// a scar's look, by its seed: one long slash, an X of a long and a short cut,
// two or three claw marks side by side, or a seam with its stitches across
function scar(ctx, random, size) {
  const L = size
  const w = 0.1 * size
  const bend = () => (random() - 0.5) * 0.16 * size
  const look = random()
  if (look < 0.3) {
    cut(ctx, 0, 0, 0, L, w * 1.2, bend())
  } else if (look < 0.55) {
    const turn = (0.35 + 0.25 * random()) * Math.PI
    const along = (random() - 0.5) * 0.3 * L
    cut(ctx, 0, 0, 0, L, w, bend())
    cut(ctx, along, 0, turn, L * (0.45 + 0.2 * random()), w * 0.85, bend())
  } else if (look < 0.8) {
    const n = 2 + Math.floor(random() * 2)
    const gap = 0.2 * size
    for (let i = 0; i < n; i++) {
      const y = (i - (n - 1) / 2) * gap
      const len = L * (0.6 + 0.4 * random())
      cut(
        ctx,
        (random() - 0.5) * 0.15 * L,
        y,
        (random() - 0.5) * 0.15,
        len,
        w * 0.8,
        bend()
      )
    }
  } else {
    const n = 3 + Math.floor(random() * 3)
    cut(ctx, 0, 0, 0, L, w, 0)
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n - 0.5) * 0.8 * L
      cut(
        ctx,
        x,
        0,
        Math.PI / 2 + (random() - 0.5) * 0.3,
        0.26 * size,
        w * 0.55,
        0
      )
    }
  }
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
    case 'spots': {
      // a blob, now and then with a smaller one grown on: a bean, a drop,
      // a little cloud
      const random = seeded(s)
      blob(ctx, random, 0, 0, r)
      if (random() < 0.35) {
        const a = random() * TAU
        blob(ctx, random, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.4)
      }
      break
    }
    case 'patch': {
      // two to four overlapping lobes round a middle one: a splotch, a cloud
      const random = seeded(s)
      const n = 2 + Math.floor(random() * 3)
      blob(ctx, random, 0, 0, r * 0.62)
      const start = random() * TAU
      for (let i = 1; i < n; i++) {
        const a = start + (i / (n - 1)) * TAU + (random() - 0.5) * 0.8
        const d = r * (0.32 + 0.12 * random())
        blob(
          ctx,
          random,
          Math.cos(a) * d,
          Math.sin(a) * d,
          r * (0.4 + 0.15 * random())
        )
      }
      break
    }
    case 'scar':
      scar(ctx, seeded(s), s.size)
      break
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
    case 'snow': {
      // six arms, each a thin spine with two pairs of side twigs, round a
      // small hexagon: a flake, one outline so it keeps a single shape
      const w = r * 0.13
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU
        const arm = (x0, y0, len, turn, width) => {
          const tx = Math.cos(a + turn)
          const ty = Math.sin(a + turn)
          const nx = -ty * width
          const ny = tx * width
          ctx.moveTo(x0 + nx, y0 + ny)
          ctx.lineTo(x0 + tx * len + nx * 0.4, y0 + ty * len + ny * 0.4)
          ctx.lineTo(x0 + tx * len - nx * 0.4, y0 + ty * len - ny * 0.4)
          ctx.lineTo(x0 - nx, y0 - ny)
          ctx.closePath()
        }
        arm(0, 0, r, 0, w)
        for (const f of [0.45, 0.72]) {
          const bx = Math.cos(a) * r * f
          const by = Math.sin(a) * r * f
          arm(bx, by, r * (0.42 - 0.14 * f), 0.9, w * 0.8)
          arm(bx, by, r * (0.42 - 0.14 * f), -0.9, w * 0.8)
        }
      }
      ctx.moveTo(r * 0.2, 0)
      for (let i = 1; i <= 6; i++)
        ctx.lineTo(
          Math.cos((i / 6) * TAU) * r * 0.2,
          Math.sin((i / 6) * TAU) * r * 0.2
        )
      ctx.closePath()
      break
    }
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
      ctx.bezierCurveTo(
        -r * 0.35,
        r * 0.62,
        -r * 1.02,
        r * 0.2,
        -r * 0.96,
        -r * 0.3
      )
      ctx.bezierCurveTo(-r * 0.9, -r * 0.88, -r * 0.2, -r * 0.98, 0, -r * 0.48)
      ctx.bezierCurveTo(
        r * 0.2,
        -r * 0.98,
        r * 0.9,
        -r * 0.88,
        r * 0.96,
        -r * 0.3
      )
      ctx.bezierCurveTo(r * 1.02, r * 0.2, r * 0.35, r * 0.62, 0, r * 0.95)
      ctx.closePath()
      break
    default:
      ctx.arc(0, 0, r, 0, TAU)
  }
}

/**
 * The marks into a px × px texture over frame 0 (`frame` its w, h): alpha is
 * coverage, red dark, green light, blue accent. Stars, flowers, hearts and
 * scars get a dark rim; `glow` (a cute palette) puts a soft accent halo under
 * stars, flowers and hearts.
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
    // trackMarks fades a mark whose place went behind the body
    const opacity = s.opacity ?? 1
    if (opacity <= 0) continue
    ctx.save()
    ctx.globalAlpha = opacity
    ctx.translate(s.x * px, s.y * px)
    ctx.scale(px / sx, px / sy)
    ctx.rotate(s.angle)
    path(ctx, s)
    if (glow && GLOWING.has(s.kind)) {
      ctx.shadowColor = GLOW_COLOUR
      ctx.shadowBlur = GLOW_BLUR * s.size * px
      ctx.fillStyle = COLOURS.accent
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.shadowColor = 'rgba(0,0,0,0)'
    }
    if (RIMMED.has(s.kind)) {
      // a deeper rim under the fill so they read on any body
      ctx.strokeStyle = COLOURS.dark
      ctx.lineWidth = (OUTLINE_PX * Math.min(sx, sy)) / 512
      ctx.lineJoin = 'round'
      ctx.stroke()
    }
    ctx.fillStyle = COLOURS[s.tone]
    ctx.fill()
    ctx.restore()
  }
}
