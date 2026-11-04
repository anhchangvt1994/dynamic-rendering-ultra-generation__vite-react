import test from 'node:test'
import assert from 'node:assert/strict'
import { amberGeometry } from './amberGeometry.mjs'

test('amber silhouette is irregular, deterministic and inside its frame', () => {
  const a = amberGeometry(25, 7)
  assert.deepEqual(a, amberGeometry(25, 7))
  assert.notDeepEqual(a.outline, amberGeometry(150, 7).outline)
  assert.ok(a.outline.length >= 8)
  for (const [x, y] of a.outline)
    assert.ok(x >= 5 && x <= 95 && y >= 5 && y <= 95)
  assert.ok(
    new Set(a.outline.map(([x, y]) => Math.hypot(x - 50, y - 50).toFixed(2)))
      .size > 4
  )
})

test('every shard retains its rank, a closed body, inset facets and bounded refraction', () => {
  for (const [species, n] of [
    [25, 3],
    [25, 7],
    [25, 12],
    [25, 20],
    [1, 16],
    [2, 20],
  ]) {
    const { pieces } = amberGeometry(species, n)
    assert.equal(pieces.length, n)
    assert.deepEqual(
      pieces.map((p) => p.rank).sort((a, b) => a - b),
      Array.from({ length: n }, (_, i) => i)
    )
    for (const p of pieces) {
      assert.ok(p.points.length >= 3)
      assert.equal(p.facets.length, p.points.length)
      assert.ok(p.lens.scale >= 1 && p.lens.scale <= 1.08)
      assert.ok(Math.abs(p.lens.x) <= 2 && Math.abs(p.lens.y) <= 2)
      for (const [x, y] of [...p.points, ...p.inner])
        assert.ok(
          Number.isFinite(x) &&
            Number.isFinite(y) &&
            x >= 4 &&
            x <= 96 &&
            y >= 4 &&
            y <= 96
        )
      for (const facet of p.facets) assert.equal(facet.points.length, 4)
    }
  }
})

test('every shard carries amber optics: thickness, conchoidal ripples and a spangle', () => {
  for (const [species, n] of [
    [25, 7],
    [1, 16],
    [2, 20],
  ]) {
    const again = amberGeometry(species, n).pieces
    for (const p of amberGeometry(species, n).pieces) {
      assert.ok(p.thickness >= 0 && p.thickness <= 1)
      assert.equal(p.ripples.length, 3)
      for (const arc of p.ripples) {
        assert.equal(arc.length, 3)
        for (const [x, y] of arc)
          assert.ok(Number.isFinite(x) && Number.isFinite(y))
      }
      assert.ok(p.spangle.r > 1 && p.spangle.r < 3)
      assert.deepEqual(
        p,
        again.find((q) => q.id === p.id)
      )
    }
  }
})

test('broken edges are curved, and neighbours share the same curve', () => {
  for (const [species, n] of [
    [25, 7],
    [2, 20],
  ]) {
    const seen = new Map()
    let bent = 0
    for (const p of amberGeometry(species, n).pieces) {
      assert.equal(p.edges.length, p.points.length)
      assert.equal(p.sparks.length, 3)
      p.points.forEach((a, i) => {
        const b = p.points[(i + 1) % p.points.length]
        const e = p.edges[i]
        for (const v of [...e.c1, ...e.c2]) assert.ok(Number.isFinite(v))
        const off = Math.abs(
          (b[0] - a[0]) * (e.c1[1] - a[1]) - (b[1] - a[1]) * (e.c1[0] - a[0])
        )
        if (off > 0.05) bent++
        const k = [a, b].map((q) => q.map((v) => v.toFixed(3)).join()).sort()
        const flip = a.map((v) => v.toFixed(3)).join() !== k[0]
        const c = flip ? [e.c2, e.c1] : [e.c1, e.c2]
        const key = k.join('|')
        if (seen.has(key))
          c.forEach((q, j) =>
            q.forEach((v, m) =>
              assert.ok(Math.abs(v - seen.get(key)[j][m]) < 1e-6)
            )
          )
        else seen.set(key, c)
      })
    }
    assert.ok(bent > 0)
    assert.ok([...seen.values()].length > n)
  }
})

test('each shard has uneven angular planes and a banded colour depth', () => {
  for (const [species, n] of [
    [25, 7],
    [1, 16],
  ]) {
    for (const p of amberGeometry(species, n).pieces) {
      assert.equal(p.planes.length, p.points.length)
      assert.ok(new Set(p.planes.map((q) => q.tone.toFixed(2))).size > 1)
      for (const q of p.planes) {
        assert.equal(q.points.length, 3)
        assert.ok(q.tone >= -1 && q.tone <= 1)
      }
      assert.ok(p.depth >= 0.15 && p.depth <= 1)
    }
  }
})

test('the finished stone is an irregular 3D rock of flat-shaded faces', () => {
  for (const [species, n] of [
    [25, 7],
    [1, 16],
    [150, 20],
  ]) {
    const { stone } = amberGeometry(species, n)
    assert.deepEqual(stone, amberGeometry(species, n).stone)
    assert.ok(stone.outline.length >= 8)
    for (const [x, y] of stone.outline)
      assert.ok(x >= 4 && x <= 96 && y >= 4 && y <= 96)
    assert.ok(stone.facets.length >= 25, 'many visible faces')
    assert.ok(new Set(stone.facets.map((q) => q.tone.toFixed(2))).size > 12)
    assert.ok(stone.facets.some((q) => q.tone > 0.3))
    assert.ok(stone.facets.some((q) => q.tone < -0.3))
    for (const q of stone.facets) {
      assert.equal(q.points.length, 3)
      assert.ok(q.tone >= -1 && q.tone <= 1)
    }
    assert.ok(stone.bands.length >= 5)
    for (const b of stone.bands) assert.ok(b.at >= 0 && b.at <= 1 && b.w > 0)
  }
  assert.notDeepEqual(
    amberGeometry(25, 7).stone.outline,
    amberGeometry(150, 7).stone.outline
  )
})
