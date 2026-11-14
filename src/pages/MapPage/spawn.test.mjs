import test from 'node:test'
import assert from 'node:assert/strict'
import { SLOT_MS, slotOf, habitatsOf, weightOf, rollZone, rollRegion } from './spawn.mjs'
import { tierOf } from './tiers.mjs'

test('slots are 10 minutes and break exactly on the boundary', () => {
  assert.equal(SLOT_MS, 600000)
  assert.equal(slotOf(0), 0)
  assert.equal(slotOf(599999), 0)
  assert.equal(slotOf(600000), 1)
})
test('habitats follow the types', () => {
  const water = habitatsOf(['water'])
  assert.ok(water.includes('lake') && water.includes('sea'))
  const gp = habitatsOf(['grass', 'poison'])
  assert.ok(gp.includes('grass') && gp.includes('cave'))
  assert.deepEqual(habitatsOf([]), ['route'])
  assert.ok(habitatsOf(['normal']).includes('route'))
})
test('weights are positive and the collection triples them', () => {
  for (const id of [1, 25, 149, 150, 151, 1025]) {
    assert.ok(weightOf(id, new Set()) > 0)
    assert.equal(weightOf(id, new Set([id])), weightOf(id, new Set()) * 3)
  }
})
const base = { regionId: 'kanto', zoneId: 'route-1', kind: 'route' }
test('same slot, same result; other slots differ', () => {
  const a = rollRegion({ regionId: 'kanto', zones: [{ id: 'r1', kind: 'route' }, { id: 'g1', kind: 'grass' }], slot: 7, owned: new Set() })
  const b = rollRegion({ regionId: 'kanto', zones: [{ id: 'r1', kind: 'route' }, { id: 'g1', kind: 'grass' }], slot: 7, owned: new Set() })
  assert.deepEqual(a, b)
  const c = rollRegion({ regionId: 'kanto', zones: [{ id: 'r1', kind: 'route' }, { id: 'g1', kind: 'grass' }], slot: 8, owned: new Set() })
  assert.notDeepEqual(a, c)
})
test('a zone has 3-6 distinct species, even with extreme collections', () => {
  const all = new Set(Array.from({ length: 1025 }, (_, i) => i + 1))
  const regionAll = new Set(Array.from({ length: 151 }, (_, i) => i + 1))
  for (const owned of [new Set(), regionAll, all]) {
    for (let slot = 0; slot < 50; slot++) {
      const ids = rollZone({ ...base, slot, owned })
      assert.ok(ids.length >= 3 && ids.length <= 6)
      assert.equal(new Set(ids).size, ids.length)
      assert.ok(ids.every((id) => Number.isInteger(id) && id >= 1 && id <= 1025))
    }
  }
})
test('a small pool is widened to the whole dex', () => {
  const ids = rollZone({ regionId: 'kanto', zoneId: 'cave-x', kind: 'cave', slot: 3, owned: new Set(), count: 6 })
  assert.equal(ids.length, 6)
  assert.equal(new Set(ids).size, 6)
})
const tally = (owned, n = 10000) => {
  const seen = new Map()
  for (let slot = 0; slot < n; slot++)
    for (const id of rollZone({ ...base, slot, owned, count: 3 })) seen.set(id, (seen.get(id) ?? 0) + 1)
  return seen
}
test('common species show up far more often than legendary ones', () => {
  const seen = tally(new Set())
  const mean = (tier) => {
    const ids = [...seen.keys()].filter((id) => tierOf(id) === tier)
    return ids.length ? ids.reduce((s, id) => s + seen.get(id), 0) / ids.length : 0
  }
  const common = mean('common')
  assert.ok(common > 0)
  assert.ok(common >= 20 * Math.max(mean('legendary'), 1e-9), `common ${common} vs legendary ${mean('legendary')}`)
})
test('an owned species appears about 3x as often', () => {
  const plain = tally(new Set())
  const id = [...plain.keys()].find((x) => tierOf(x) === 'uncommon')
  const boosted = tally(new Set([id]))
  const ratio = boosted.get(id) / plain.get(id)
  assert.ok(ratio > 1.8 && ratio < 4.2, `ratio ${ratio}`)
})
test('at most one legendary or mythical per region', () => {
  const zones = Array.from({ length: 6 }, (_, i) => ({ id: `z${i}`, kind: ['route', 'grass', 'lake', 'sea', 'mountain', 'cave'][i] }))
  for (let slot = 0; slot < 500; slot++) {
    const rolled = rollRegion({ regionId: 'johto', zones, slot, owned: new Set() })
    const rare = Object.values(rolled).flat().filter((id) => ['legendary', 'mythical'].includes(tierOf(id)))
    assert.ok(rare.length <= 1, `slot ${slot}: ${rare}`)
  }
})
test('no species appears twice in one region', async () => {
  const { layoutRegion } = await import('./layout.mjs')
  const { REGIONS } = await import('./data/regions.mjs')
  for (const region of REGIONS) {
    const rolled = rollRegion({ regionId: region.id, zones: layoutRegion(region).zones, slot: 7, owned: new Set() })
    const all = Object.values(rolled).flat()
    assert.equal(new Set(all).size, all.length, region.id)
  }
})
