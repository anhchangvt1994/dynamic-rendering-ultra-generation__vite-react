/**
 * The skeleton of a mask: Zhang–Suen thinning, short spurs pruned, cut into
 * branches at the junctions. Points and radii are in units of the mask size
 * (0–1); a radius is the distance from the point to the mask's edge.
 */
export type Branch = { points: [number, number][]; radius: number[] }

const SPUR = 4
// the 8 neighbours, clockwise from north (Zhang–Suen's P2..P9)
const RING = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
]

function thin(src: Uint8Array, size: number): Uint8Array {
  const m = src.slice()
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= size || y >= size ? 0 : m[y * size + x]
  for (let changed = true; changed;) {
    changed = false
    for (const pass of [0, 1]) {
      const drop: number[] = []
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          if (!m[y * size + x]) continue
          const p = RING.map(([dx, dy]) => at(x + dx, y + dy))
          const b = p.reduce((s, v) => s + v, 0)
          if (b < 2 || b > 6) continue
          let a = 0
          for (let i = 0; i < 8; i++) if (!p[i] && p[(i + 1) % 8]) a++
          if (a !== 1) continue
          const [p2, , p4, , p6, , p8] = p
          if (
            pass === 0
              ? p2 * p4 * p6 || p4 * p6 * p8
              : p2 * p4 * p8 || p2 * p6 * p8
          )
            continue
          drop.push(y * size + x)
        }
      for (const i of drop) m[i] = 0
      if (drop.length) changed = true
    }
  }
  return m
}

/** Chamfer distance (1, √2) from each inside cell to the nearest outside one. */
function distance(m: Uint8Array, size: number): Float64Array {
  const d = new Float64Array(size * size)
  const big = size * 2
  for (let i = 0; i < d.length; i++) d[i] = m[i] ? big : 0
  const get = (x: number, y: number) =>
    x < 0 || y < 0 || x >= size || y >= size ? 0 : d[y * size + x]
  const s = Math.SQRT2
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      if (d[i])
        d[i] = Math.min(
          d[i],
          get(x - 1, y) + 1,
          get(x, y - 1) + 1,
          get(x - 1, y - 1) + s,
          get(x + 1, y - 1) + s
        )
    }
  for (let y = size - 1; y >= 0; y--)
    for (let x = size - 1; x >= 0; x--) {
      const i = y * size + x
      if (d[i])
        d[i] = Math.min(
          d[i],
          get(x + 1, y) + 1,
          get(x, y + 1) + 1,
          get(x + 1, y + 1) + s,
          get(x - 1, y + 1) + s
        )
    }
  return d
}

type Path = number[]

function trace(m: Uint8Array, size: number) {
  const on = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < size && y < size && m[y * size + x] === 1
  const around = (i: number) => {
    const x = i % size
    const y = (i - x) / size
    // orthogonal first: a staircase is walked along its steps
    return [0, 2, 4, 6, 1, 3, 5, 7]
      .map((k) => [x + RING[k][0], y + RING[k][1]])
      .filter(([nx, ny]) => on(nx, ny))
      .map(([nx, ny]) => ny * size + nx)
  }
  // a junction by crossing number (robust to staircases), an end by degree
  const kind = (i: number) => {
    const x = i % size
    const y = (i - x) / size
    const p = RING.map(([dx, dy]) => (on(x + dx, y + dy) ? 1 : 0))
    let cross = 0
    for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) cross++
    const n = p.reduce((s, v) => s + v, 0)
    return n <= 1 ? 'end' : cross >= 3 ? 'junction' : 'line'
  }
  const pixels: number[] = []
  for (let i = 0; i < m.length; i++) if (m[i]) pixels.push(i)
  const kinds = new Map(pixels.map((i) => [i, kind(i)]))
  const node = (i: number) => kinds.get(i) !== 'line'
  const seen = new Set<number>()
  const paths: { path: Path; from: string; to: string }[] = []
  const walk = (start: number, first: number) => {
    const path = [start, first]
    let prev = start
    let cur = first
    while (!node(cur)) {
      seen.add(cur)
      const next = around(cur).find(
        (n) => n !== prev && !path.includes(n) && (node(n) || !seen.has(n))
      )
      if (next === undefined) break
      prev = cur
      cur = next
      path.push(cur)
    }
    return path
  }
  const pairs = new Set<string>()
  for (const start of pixels) {
    if (!node(start)) continue
    if (!around(start).length) {
      paths.push({ path: [start], from: 'end', to: 'end' })
      continue
    }
    for (const first of around(start)) {
      if (seen.has(first)) continue
      // neighbouring junction cells are one junction
      if (kinds.get(start) === 'junction' && kinds.get(first) === 'junction')
        continue
      if (node(first)) {
        const key = [start, first].sort((p, q) => p - q).join()
        if (pairs.has(key)) continue
        pairs.add(key)
      }
      const path = walk(start, first)
      const end = path[path.length - 1]
      paths.push({ path, from: kinds.get(start)!, to: kinds.get(end)! })
    }
  }
  // loops and lone cells: no node on them
  for (const i of pixels)
    if (!node(i) && !seen.has(i)) {
      seen.add(i)
      const n = around(i)
      const path = n.length ? walk(i, n[0]) : [i]
      paths.push({ path, from: 'line', to: 'line' })
    }
  return paths
}

type Traced = ReturnType<typeof trace>[number]
const isSpur = (p: Traced) =>
  p.path.length - 1 < SPUR &&
  (p.from === 'end') !== (p.to === 'end') &&
  (p.from === 'junction' || p.to === 'junction')

/** The branches of a mask's skeleton; an empty mask has none. */
export function skeleton(
  mask: Uint8Array,
  size: number
): { branches: Branch[] } {
  const d = distance(mask, size)
  const m = thin(mask, size)
  // Zhang–Suen erases a 2×2 core whole: keep the deepest cell as a point
  if (!m.some(Boolean)) {
    let deepest = -1
    for (let i = 0; i < d.length; i++)
      if (d[i] && (deepest < 0 || d[i] > d[deepest])) deepest = i
    if (deepest >= 0) m[deepest] = 1
  }
  let paths = trace(m, size)
  // prune short spurs (an end to a junction), keeping the junction cell
  for (let round = 0; round < 10; round++) {
    const spurs = paths.filter(isSpur)
    if (!spurs.length || spurs.length === paths.length) break
    for (const { path, from } of spurs)
      for (const i of from === 'junction' ? path.slice(1) : path.slice(0, -1))
        m[i] = 0
    paths = trace(m, size)
  }
  const branches = paths
    .filter((p, _, all) => p.path.length >= 2 || all.length === 1)
    .map(({ path }) => ({
      points: path.map((i) => {
        const x = i % size
        return [(x + 0.5) / size, ((i - x) / size + 0.5) / size] as [
          number,
          number,
        ]
      }),
      radius: path.map((i) => (d[i] - 0.5) / size),
    }))
  return { branches }
}
