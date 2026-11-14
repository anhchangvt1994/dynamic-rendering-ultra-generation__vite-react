import test from 'node:test'
import assert from 'node:assert/strict'
import { REGIONS } from './data/regions.mjs'
import { GYMS } from './data/gyms.mjs'
import { searchMap } from './search.mjs'

const ctx = {
  regions: REGIONS,
  gyms: GYMS,
  npcs: [{ id: 'kanto-npc-1', name: 'Đội Mèo', regionId: 'kanto' }],
  speciesName: (id) => ({ 25: 'Pikachu', 150: 'Mewtwo' })[id] ?? `#${id}`,
  pokemon: [{ id: 25, regionId: 'kanto' }, { id: 150, regionId: 'kanto' }],
}

test('a town finds its gym', () => {
  const hit = searchMap('pewter', ctx)
  assert.ok(hit.some((h) => h.kind === 'gym' && h.label.includes('Brock')))
})
test('a leader finds the gym', () => {
  assert.equal(searchMap('brock', ctx)[0].kind, 'gym')
})
test('a region', () => {
  const hit = searchMap('kanto', ctx)
  assert.equal(hit[0].kind, 'region')
  assert.equal(hit[0].id, 'kanto')
})
test('a Pokémon on the map', () => {
  const hit = searchMap('pika', ctx)
  assert.deepEqual([hit[0].kind, hit[0].id, hit[0].regionId], ['pokemon', '25', 'kanto'])
})
test('accents and case are ignored', () => {
  assert.ok(searchMap('DOI meo', ctx).some((h) => h.kind === 'npc'))
})
test('empty gives nothing, never more than 8', () => {
  assert.deepEqual(searchMap('  ', ctx), [])
  assert.ok(searchMap('a', ctx).length <= 8)
})
