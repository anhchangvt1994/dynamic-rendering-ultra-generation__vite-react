// The amber cell's cracks: a unit square split into exactly N convex pieces by
// a seeded recursive partition. Same (species, N, version) → same cracks, so a
// card looks the same on every visit. No geometry library; pure of React.

export const FRACTURE_VERSION = 1

const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const area = (points) => {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % points.length]
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

const centroid = (points) => {
  const a = area(points)
  let cx = 0
  let cy = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % points.length]
    const cross = x1 * y2 - x2 * y1
    cx += (x1 + x2) * cross
    cy += (y1 + y2) * cross
  }
  return [cx / (6 * a), cy / (6 * a)]
}

// the part of a convex polygon with side(p) >= 0; a negated side gives the
// other half with bit-identical cut points, so the seam is shared exactly
const clip = (points, side) => {
  const out = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const q = points[(i + 1) % points.length]
    const sp = side(p)
    const sq = side(q)
    if (sp >= 0) out.push(p)
    if (sp >= 0 !== sq >= 0) {
      const t = sp / (sp - sq)
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])])
    }
  }
  return out.filter(
    (p, i) =>
      Math.hypot(
        p[0] - out[(i + 1) % out.length][0],
        p[1] - out[(i + 1) % out.length][1]
      ) > 1e-12
  )
}

const MIN_SHARE = 0.25

function split(polygon, random) {
  const whole = area(polygon)
  const [cx, cy] = centroid(polygon)
  const spread = Math.sqrt(whole)
  const attempt = (angle, shift) => {
    const nx = Math.cos(angle)
    const ny = Math.sin(angle)
    const side = ([x, y]) => nx * (x - cx) + ny * (y - cy) - shift
    const a = clip(polygon, side)
    const b = clip(polygon, (p) => -side(p))
    if (a.length < 3 || b.length < 3) return null
    const share = area(a) / whole
    return share >= MIN_SHARE && share <= 1 - MIN_SHARE ? [a, b] : null
  }
  for (let i = 0; i < 12; i++) {
    const children = attempt(
      random() * Math.PI,
      (random() - 0.5) * 0.3 * spread
    )
    if (children) return children
  }
  // a line through the centroid always leaves at least 4/9 on each side
  return attempt(random() * Math.PI, 0)
}

const validate = (speciesId, required, version) => {
  if (!Number.isInteger(speciesId) || speciesId < 1 || speciesId > 1025)
    throw new Error('invalid_species')
  if (!Number.isInteger(required) || required < 3 || required > 20)
    throw new Error('invalid_required')
  if (version !== FRACTURE_VERSION) throw new Error('invalid_version')
}

/** {pieces: [{id, points, offset, rank}]} in [0,1] coordinates, exactly `required` pieces. */
export function fractureLayout(
  speciesId,
  required,
  version = FRACTURE_VERSION
) {
  validate(speciesId, required, version)
  const random = mulberry32(
    (Math.imul(speciesId, 0x9e3779b1) ^
      Math.imul(required, 0x85ebca6b) ^
      Math.imul(version, 0xc2b2ae35)) >>>
      0
  )
  let polygons = [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  ]
  while (polygons.length < required) {
    // the largest piece splits next, so the cell stays evenly cracked
    let widest = 0
    polygons.forEach((p, i) => {
      if (area(p) > area(polygons[widest])) widest = i
    })
    const [a, b] = split(polygons[widest], random)
    polygons = [
      ...polygons.slice(0, widest),
      a,
      b,
      ...polygons.slice(widest + 1),
    ]
  }
  // which piece the Nth shard opens: a seeded shuffle of 0..N-1
  const ranks = Array.from({ length: required }, (_, i) => i)
  for (let i = ranks.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[ranks[i], ranks[j]] = [ranks[j], ranks[i]]
  }
  return {
    pieces: polygons.map((points, index) => {
      const [x, y] = centroid(points)
      const away = Math.hypot(x - 0.5, y - 0.5)
      const angle = random() * Math.PI * 2
      const [dx, dy] =
        away > 1e-6
          ? [(x - 0.5) / away, (y - 0.5) / away]
          : [Math.cos(angle), Math.sin(angle)]
      const push = 0.012 + random() * 0.02
      return {
        id: `p${index}`,
        points,
        offset: [dx * push, dy * push],
        rank: ranks[index],
      }
    }),
  }
}

/** How many pieces a balance has opened: whole shards only, never beyond N. */
export const visiblePieces = (count, required) =>
  Number.isFinite(count)
    ? Math.min(required, Math.max(0, Math.floor(count)))
    : 0
