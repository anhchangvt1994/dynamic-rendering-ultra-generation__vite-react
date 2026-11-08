import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterCatalog, readCatalogParams } from './catalog.mjs'

const entry = (id, name) => ({
  name,
  url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
})
const list = [
  entry(1, 'bulbasaur'),
  entry(25, 'pikachu'),
  entry(151, 'mew'),
  entry(152, 'chikorita'),
  entry(1025, 'pecharunt'),
  entry(10001, 'deoxys-attack'),
]

test('generation boundaries exclude forms and keep the complete last generation', () => {
  assert.deepEqual(
    filterCatalog(list, { generation: '1' }).map((x) => x.name),
    ['bulbasaur', 'pikachu', 'mew']
  )
  assert.deepEqual(
    filterCatalog(list, { generation: '2' }).map((x) => x.name),
    ['chikorita']
  )
  assert.deepEqual(
    filterCatalog(list, { generation: '9' }).map((x) => x.name),
    ['pecharunt']
  )
})

test('search, type membership and collection intersect instead of replacing each other', () => {
  const options = {
    query: '#025',
    generation: '1',
    caughtOnly: true,
    typeIds: new Set([25, 152]),
    caughtIds: new Set([25, 151]),
  }
  assert.deepEqual(
    filterCatalog(list, options).map((x) => x.name),
    ['pikachu']
  )
  assert.equal(
    filterCatalog(list, { ...options, typeIds: new Set([1]) }).length,
    0
  )
  assert.deepEqual(
    filterCatalog(list, { query: 'PIKA' }).map((x) => x.name),
    ['pikachu']
  )
})

test('descending and alphabetical orders do not mutate the cached API index', () => {
  assert.deepEqual(
    filterCatalog(list, { sort: 'number-desc' }).map((x) => x.name),
    ['pecharunt', 'chikorita', 'mew', 'pikachu', 'bulbasaur']
  )
  assert.deepEqual(
    filterCatalog(list, { sort: 'name' }).map((x) => x.name),
    ['bulbasaur', 'chikorita', 'mew', 'pecharunt', 'pikachu']
  )
  assert.equal(list[0].name, 'bulbasaur')
})

test('untrusted URL filters fall back safely and page size is bounded', () => {
  assert.deepEqual(
    readCatalogParams('?gen=99&type=stellar&sort=wat&view=oops&shown=999999'),
    {
      query: '',
      generation: '',
      type: '',
      types: [],
      sort: 'number',
      caughtOnly: false,
      ownedOnly: false,
      shown: 1025,
    }
  )
  assert.deepEqual(
    readCatalogParams(
      '?q=pika&gen=1&type=electric&sort=name&view=caught&shown=48'
    ),
    {
      query: 'pika',
      generation: '1',
      type: 'electric',
      types: ['electric'],
      sort: 'name',
      caughtOnly: true,
      ownedOnly: false,
      shown: 48,
    }
  )
  assert.equal(readCatalogParams('?shown=-3').shown, 24)
  assert.equal(readCatalogParams('?shown=oops').shown, 24)
})

test('two types filter to species that have both', async () => {
  const { readCatalogParams, idsWithTypes, toggleType } =
    await import('./catalog.mjs')
  const params = readCatalogParams('?type=dragon,ground,fire,nope')
  assert.deepEqual(params.types, ['dragon', 'ground'])
  assert.equal(params.type, 'dragon,ground')
  assert.deepEqual(readCatalogParams('?type=nope').types, [])
  const ids = idsWithTypes(['dragon', 'ground'])
  assert.ok(ids.has(445)) // Garchomp
  assert.ok(!ids.has(149)) // Dragonite is dragon/flying
  assert.ok(idsWithTypes(['fire']).has(6))
  assert.equal(idsWithTypes([]), undefined)
  assert.deepEqual(toggleType([], 'fire'), ['fire'])
  assert.deepEqual(toggleType(['fire'], 'flying'), ['fire', 'flying'])
  assert.deepEqual(toggleType(['fire', 'flying'], 'water'), ['fire', 'water'])
  assert.deepEqual(toggleType(['fire', 'flying'], 'fire'), ['flying'])
})

test('catalog scope: all ⊃ collection ⊃ owned, one URL each', async () => {
  const { catalogScope, withScope } = await import('./catalog.mjs')
  assert.equal(catalogScope(readCatalogParams('')), 'all')
  assert.equal(catalogScope(readCatalogParams('view=caught')), 'caught')
  assert.equal(catalogScope(readCatalogParams('view=caught&owned=1')), 'owned')
  // owned without the collection view is not a scope of its own
  assert.equal(catalogScope(readCatalogParams('owned=1')), 'all')
  const base = 'q=pi&gen=1&type=fire&shown=48'
  assert.equal(
    withScope(base, 'owned'),
    'q=pi&gen=1&type=fire&view=caught&owned=1'
  )
  assert.equal(
    withScope(`${base}&view=caught&owned=1`, 'caught'),
    'q=pi&gen=1&type=fire&view=caught'
  )
  assert.equal(
    withScope(`${base}&view=caught&owned=1`, 'all'),
    'q=pi&gen=1&type=fire'
  )
})

test('clearing filters keeps the scope', async () => {
  const { withoutFilters } = await import('./catalog.mjs')
  assert.equal(
    withoutFilters(
      'q=pi&gen=1&type=fire&sort=name&shown=48&view=caught&owned=1'
    ),
    'sort=name&view=caught&owned=1'
  )
  assert.equal(withoutFilters('q=pi'), '')
})
