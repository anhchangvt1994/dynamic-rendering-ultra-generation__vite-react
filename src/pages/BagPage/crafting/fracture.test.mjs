import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fractureLayout, visiblePieces } from './fracture.mjs'

const EPS = 1e-8
const SPECIES = [1, 25, 150, 1025]
const NS = Array.from({ length: 18 }, (_, i) => i + 3)

const area = (pts) => {
  let sum = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}
// convex polygon clipped by a convex polygon's edges (both counter-clockwise)
const overlap = (a, b) => {
  let poly = a
  for (let i = 0; i < b.length && poly.length; i++) {
    const [x1, y1] = b[i]
    const [x2, y2] = b[(i + 1) % b.length]
    const side = ([x, y]) => (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)
    const next = []
    for (let j = 0; j < poly.length; j++) {
      const p = poly[j]
      const q = poly[(j + 1) % poly.length]
      const sp = side(p)
      const sq = side(q)
      if (sp >= 0) next.push(p)
      if (sp >= 0 !== sq >= 0) {
        const t = sp / (sp - sq)
        next.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])])
      }
    }
    poly = next
  }
  return poly.length < 3 ? 0 : Math.abs(area(poly))
}
const isConvex = (pts) => {
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    const [x3, y3] = pts[(i + 2) % pts.length]
    if ((x2 - x1) * (y3 - y2) - (y2 - y1) * (x3 - x2) < -EPS) return false
  }
  return true
}
const onSegment = ([x, y], [x1, y1], [x2, y2]) => {
  const cross = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)
  const len = Math.hypot(x2 - x1, y2 - y1)
  if (Math.abs(cross) / len > 1e-7) return false
  const dot = (x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)
  return dot >= -1e-7 && dot <= len * len + 1e-7
}
const eachLayout = (fn) => {
  for (const species of SPECIES)
    for (const n of NS) fn(fractureLayout(species, n), species, n)
}

test('exactly N pieces, each a convex counter-clockwise polygon with positive area inside the unit square', () => {
  eachLayout(({ pieces }, species, n) => {
    assert.equal(pieces.length, n, `count ${species}/${n}`) // detects: stopping early or overshooting the split loop
    for (const { points } of pieces) {
      assert.ok(points.length >= 3)
      assert.ok(area(points) > 1e-4, `area ${species}/${n}`) // detects: a sliver or inverted child
      assert.ok(isConvex(points), `convex ${species}/${n}`) // detects: splitting without clipping to a half-plane
      for (const [x, y] of points)
        assert.ok(x >= -EPS && x <= 1 + EPS && y >= -EPS && y <= 1 + EPS) // detects: a vertex outside the artwork
    }
  })
})

test('pieces tile the unit square: areas sum to 1 and none overlap', () => {
  eachLayout(({ pieces }, species, n) => {
    const sum = pieces.reduce((s, p) => s + area(p.points), 0)
    assert.ok(Math.abs(sum - 1) < EPS, `sum ${species}/${n}: ${sum}`) // detects: a gap or a lost child
    for (let i = 0; i < pieces.length; i++)
      for (let j = i + 1; j < pieces.length; j++)
        assert.ok(
          overlap(pieces[i].points, pieces[j].points) <= EPS,
          `overlap ${species}/${n}/${i}/${j}`
        ) // detects: children both keeping the cut side
  })
})

test('shared boundaries are consistent: every edge lies on the border or on a neighbour', () => {
  eachLayout(({ pieces }, species, n) => {
    pieces.forEach((piece, i) => {
      piece.points.forEach((p, k) => {
        const q = piece.points[(k + 1) % piece.points.length]
        const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
        const border = mid.some(
          (v) => Math.abs(v) < 1e-9 || Math.abs(v - 1) < 1e-9
        )
        const shared = pieces.some(
          (other, j) =>
            j !== i &&
            other.points.some((a, m) =>
              onSegment(mid, a, other.points[(m + 1) % other.points.length])
            )
        )
        assert.ok(border || shared, `edge ${species}/${n}/${i}/${k}`) // detects: a seam that does not meet its neighbour
      })
    })
  })
})

test('deterministic by species, N and version; ids and ranks are unique and complete', () => {
  eachLayout((layout, species, n) => {
    assert.deepEqual(layout, fractureLayout(species, n)) // detects: Math.random in the generator
    assert.deepEqual(layout, fractureLayout(species, n, 1))
    assert.equal(new Set(layout.pieces.map((p) => p.id)).size, n) // detects: duplicate ids
    assert.deepEqual(
      layout.pieces.map((p) => p.rank).sort((a, b) => a - b),
      Array.from({ length: n }, (_, i) => i)
    ) // detects: repeated or gapped ranks
  })
  assert.notDeepEqual(fractureLayout(1, 10), fractureLayout(25, 10)) // detects: ignoring the species seed
})

test('offsets are small, finite, and push pieces away from the centre', () => {
  eachLayout(({ pieces }, species, n) => {
    for (const { offset, points } of pieces) {
      assert.ok(offset.every(Number.isFinite))
      const length = Math.hypot(...offset)
      assert.ok(length > 0 && length < 0.06, `length ${species}/${n}`) // detects: zero (no fracture) or a huge drift
      const cx = points.reduce((s, p) => s + p[0], 0) / points.length - 0.5
      const cy = points.reduce((s, p) => s + p[1], 0) / points.length - 0.5
      assert.ok(offset[0] * cx + offset[1] * cy >= 0, `outward ${species}/${n}`) // detects: offsets pulling pieces into each other
    }
  })
})

test('invalid N, species and version reject', () => {
  for (const n of [2, 21, 3.5, NaN, '5', null])
    assert.throws(() => fractureLayout(25, n), /invalid_required/)
  for (const s of [0, 1026, 1.5, NaN, '25', undefined])
    assert.throws(() => fractureLayout(s, 5), /invalid_species/)
  assert.throws(() => fractureLayout(25, 5, 2), /invalid_version/)
})

test('visiblePieces opens none, all, and never more than N', () => {
  assert.equal(visiblePieces(0, 7), 0)
  assert.equal(visiblePieces(7, 7), 7)
  assert.equal(visiblePieces(17, 7), 7) // detects: no upper clamp
  assert.equal(visiblePieces(3.9, 7), 3) // detects: rounding up opens a piece not yet owned
  assert.equal(visiblePieces(-2, 7), 0) // detects: no lower clamp
  assert.equal(visiblePieces(NaN, 7), 0)
})
