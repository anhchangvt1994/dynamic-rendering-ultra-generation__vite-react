import test from 'node:test'
import assert from 'node:assert/strict'
import { REGIONS } from './data/regions.mjs'
import { GYMS } from './data/gyms.mjs'
import { REGION_R, layoutRegion, terrainSeed } from './layout.mjs'
import { coastRadius } from './terrain.mjs'
import { CLASSES, PARTS, lookKey, generateNpcs, gymLeaderLook } from './npc.mjs'
import { HABITATS } from './spawn.mjs'

const gen = (region, seed = 1, count = 24) => {
  const l = layoutRegion(region)
  return { l, npcs: generateNpcs({ regionId: region.id, zones: l.zones, towns: l.towns, seed, count }) }
}

test('at least 30 classes with valid habitats', () => {
  assert.ok(CLASSES.length >= 30)
  assert.equal(new Set(CLASSES.map((c) => c.id)).size, CLASSES.length)
  for (const c of CLASSES) for (const h of c.habitat) assert.ok(HABITATS.includes(h), c.id)
})
test('the look space is huge', () => {
  const total = Object.values(PARTS).reduce((p, n) => p * n, CLASSES.length)
  assert.ok(total >= 100000, `${total}`)
})
test('deterministic per seed, different across seeds', () => {
  const r = REGIONS[0]
  assert.deepEqual(gen(r, 5).npcs, gen(r, 5).npcs)
  assert.notDeepEqual(gen(r, 5).npcs, gen(r, 6).npcs)
})
test('no repeated look or name on the whole map', () => {
  const keys = new Set()
  const names = new Set()
  let n = 0
  for (const r of REGIONS) {
    for (const npc of gen(r).npcs) {
      keys.add(lookKey(npc.look))
      names.add(npc.name)
      n++
    }
  }
  assert.equal(n, 216)
  assert.equal(keys.size, 216)
  assert.equal(names.size, 216)
})
test('NPCs stand on the island, near their habitat', () => {
  for (const r of REGIONS) {
    const seed = terrainSeed(r.id)
    const { l, npcs } = gen(r)
    for (const n of npcs) {
      assert.equal(n.kind, 'npc')
      assert.ok(Math.hypot(n.x, n.z) <= coastRadius(seed, Math.atan2(n.z, n.x), REGION_R) * 0.87, `${r.id} ${n.id}`)
      const cls = CLASSES.find((c) => c.id === n.cls)
      const homes = l.zones.filter((z) => cls.habitat.includes(z.kind))
      if (cls.habitat.length && homes.length)
        assert.ok(homes.some((z) => Math.hypot(z.x - n.x, z.z - n.z) <= z.r + (z.kind === 'sea' ? 34 : 16)), `${n.cls} away from ${cls.habitat}`)
    }
  }
})
test('gym leader looks are stable and distinct', () => {
  const a = gymLeaderLook(GYMS[0])
  assert.deepEqual(a, gymLeaderLook(GYMS[0]))
  assert.notEqual(lookKey(a), lookKey(gymLeaderLook(GYMS[1])))
  assert.equal(new Set(GYMS.map((g) => lookKey(gymLeaderLook(g)))).size, GYMS.length)
})
