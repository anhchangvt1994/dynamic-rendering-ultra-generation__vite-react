import test from 'node:test'
import assert from 'node:assert/strict'
import { REGIONS } from './regions.mjs'
import { GYMS, gymsOf } from './gyms.mjs'
import { GENERATIONS } from '../../HomePage/catalog.mjs'
import { TYPE_DATA } from '../../../components/pokemon-page/type-data.mjs'

const IDS = ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea']
const KINDS = ['route', 'grass', 'lake', 'sea', 'mountain', 'cave']
const TYPES = Object.keys(TYPE_DATA)

test('nine regions matching the dex generations', () => {
  assert.deepEqual(REGIONS.map((r) => r.id), IDS)
  for (const r of REGIONS) {
    const gen = GENERATIONS.find((g) => g.id === r.genId)
    assert.deepEqual(r.dex, [gen.start, gen.end], r.id)
  }
  assert.deepEqual(REGIONS.find((r) => r.id === 'galar').dex, [810, 905])
})
test('every region has palette, habitats and towns', () => {
  for (const r of REGIONS) {
    for (const k of ['grass', 'rock', 'water', 'glow', 'sky']) assert.match(r.palette[k], /^#[0-9a-f]{6}$/i, `${r.id}.${k}`)
    for (const k of KINDS) assert.ok(r.counts[k] >= 1, `${r.id} ${k}`)
    assert.ok(r.towns.length >= 5, r.id)
    assert.equal(new Set(r.towns.map((t) => t.id)).size, r.towns.length)
  }
})
test('gyms are complete and linked to their town', () => {
  assert.equal(new Set(GYMS.map((g) => g.id)).size, GYMS.length)
  for (const g of GYMS) {
    assert.ok(g.leader, g.id)
    assert.ok(TYPES.includes(g.type), `${g.id} type ${g.type}`)
    assert.ok(['gym', 'kahuna', 'elite4', 'champion'].includes(g.kind), g.id)
    if (g.kind === 'gym' || g.kind === 'kahuna') assert.ok(g.badge, `${g.id} badge`)
    const region = REGIONS.find((r) => r.id === g.region)
    assert.ok(region, g.id)
    const town = region.towns.find((t) => t.id === g.town)
    assert.ok(town, `${g.id} town ${g.town}`)
    if (g.kind === 'gym' || g.kind === 'kahuna') assert.equal(town.gym, g.id)
  }
})
test('every region has at least 4 entries; Kanto has 8 gyms', () => {
  for (const id of IDS) assert.ok(gymsOf(id).length >= 4, id)
  assert.equal(gymsOf('kanto').filter((g) => g.kind === 'gym').length, 8)
})
test('known canon entries', () => {
  const find = (leader) => GYMS.find((g) => g.leader === leader)
  assert.deepEqual([find('Brock').town, find('Brock').type], ['pewter', 'rock'])
  assert.deepEqual([find('Misty').town, find('Misty').type], ['cerulean', 'water'])
  assert.deepEqual([find('Roxanne').town, find('Roxanne').type], ['rustboro', 'rock'])
  assert.deepEqual([find('Cynthia').region, find('Cynthia').kind], ['sinnoh', 'champion'])
  assert.deepEqual([find('Leon').region, find('Leon').kind], ['galar', 'champion'])
})
