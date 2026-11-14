import test from 'node:test'
import assert from 'node:assert/strict'
import { REGIONS } from './data/regions.mjs'
import { layoutRegion, REGION_R, TRAY, terrainSeed } from './layout.mjs'
import { coastRadius } from './terrain.mjs'

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

test('a region layout puts land things on land and sea things in the water', () => {
  for (const region of REGIONS) {
    const seed = terrainSeed(region.id)
    const coast = (p) => coastRadius(seed, Math.atan2(p.z, p.x), REGION_R)
    const l = layoutRegion(region)
    assert.equal(l.towns.length, region.towns.length)
    for (const k of Object.keys(region.counts)) assert.equal(l.zones.filter((z) => z.kind === k).length, region.counts[k], `${region.id} ${k}`)
    for (const t of l.towns) assert.ok(Math.hypot(t.x, t.z) <= coast(t) * 0.9, `${region.id} ${t.id} on land`)
    for (const z of l.zones) {
      if (z.kind === 'sea') {
        assert.ok(Math.hypot(z.x, z.z) >= coast(z) + z.r * 0.4, `${region.id} ${z.id} in the water`)
        assert.ok(Math.hypot(z.x, z.z) + z.r <= REGION_R * TRAY, `${region.id} ${z.id} inside the tray`)
      } else assert.ok(Math.hypot(z.x, z.z) + z.r <= coast(z) * 0.92, `${region.id} ${z.id} on land`)
      for (const t of l.towns) assert.ok(dist(z, t) >= z.r + 1.5, `${region.id} ${z.id} off ${t.id}`)
    }
    for (const a of l.zones) for (const b of l.zones) if (a !== b) assert.ok(dist(a, b) >= (a.r + b.r) * 0.7, `${a.id}/${b.id}`)
    const ids = new Set(l.towns.map((t) => t.id))
    for (const r of l.routes) assert.ok(ids.has(r.from) && ids.has(r.to) && r.from !== r.to)
    assert.ok(l.routes.length >= l.towns.length - 1)
    assert.ok(l.landmark.kind)
    assert.ok(l.towns.every((t) => dist(t, l.landmark) > 8))
    assert.deepEqual(layoutRegion(region), l)
  }
})
