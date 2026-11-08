import test from 'node:test'
import assert from 'node:assert/strict'
import * as ownership from './ownership.mjs'
import { filterCatalog, readCatalogParams } from './catalog.mjs'

const item = (id, speciesId, createdAt = '2026-11-05T00:00:00Z') => ({
  id,
  speciesId,
  createdAt,
})

test('collection includes owned species without changing removable caught marks', () => {
  const caught = new Set([1])
  const items = [item('a', 25), item('b', 25)]
  assert.deepEqual(ownership.collectionIds(caught, items), new Set([1, 25]))
  assert.deepEqual(caught, new Set([1]))
  assert.deepEqual(ownership.collectionIds(new Set(), items), new Set([25]))
})

test('latestOwned chooses newest timestamp then descending ID without mutating input', () => {
  const items = [
    item('z', 25, '2026-11-04T00:00:00Z'),
    item('a', 25),
    item('b', 25),
    item('c', 1),
  ]
  const before = [...items]
  assert.equal(ownership.latestOwned(items, 25), items[2])
  assert.equal(ownership.latestOwned(items, 7), null)
  assert.deepEqual(items, before)
})

test('owned URL flag accepts only 1', () => {
  assert.equal(readCatalogParams('owned=1').ownedOnly, true)
  assert.equal(readCatalogParams('owned=0').ownedOnly, false)
  assert.equal(readCatalogParams('').ownedOnly, false)
})

test('ownership intersects collection, generation, type and search filters', () => {
  const list = [1, 25, 26, 152].map((id) => ({
    name: id === 25 ? 'pikachu' : `pokemon-${id}`,
    url: `/pokemon/${id}/`,
  }))
  const options = {
    caughtOnly: true,
    caughtIds: new Set([1, 25, 26, 152]),
    ownedOnly: true,
    ownedIds: new Set([25, 152]),
    generation: '1',
    typeIds: new Set([25, 26]),
  }
  assert.deepEqual(
    filterCatalog(list, options).map((x) => x.name),
    ['pikachu']
  )
  assert.deepEqual(filterCatalog(list, { ...options, query: 'bulbasaur' }), [])
  assert.deepEqual(filterCatalog(list, { ...options, ownedIds: new Set() }), [])
})

test('ownedLabel names the count and the room', () => {
  assert.equal(
    ownership.ownedLabel(1, 'Pikachu'),
    'Đang sở hữu 1 Pikachu, mở căn phòng'
  )
  assert.equal(
    ownership.ownedLabel(3, 'Pikachu'),
    'Đang sở hữu 3 Pikachu, mở căn phòng'
  )
})

test('evolved-from species stay owned and in the collection', () => {
  const items = [item('a', 5)] // Charmander became Charmeleon
  const dex = [4, 5]
  assert.deepEqual(ownership.ownedSpecies(items, dex), new Set([4, 5]))
  assert.deepEqual(ownership.ownedSpecies(items, undefined), new Set([5]))
  assert.deepEqual(
    ownership.collectionIds(new Set([1]), items, dex),
    new Set([1, 4, 5])
  )
})
