import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as habitat from './habitat.mjs'

const types = (...names) => names.map((name) => ({ type: { name } }))

test('all eighteen types have their own visual identity; Electric is a circuit, not a meadow', () => {
  const names = [
    'normal',
    'fire',
    'water',
    'electric',
    'grass',
    'ice',
    'fighting',
    'poison',
    'ground',
    'flying',
    'psychic',
    'bug',
    'rock',
    'ghost',
    'dragon',
    'dark',
    'steel',
    'fairy',
  ]
  for (const name of names) {
    const theme = habitat.getPokemonHabitat(types(name))
    assert.equal(theme.primary, name)
    assert.deepEqual(theme.motifs, [name])
  }
  assert.equal(habitat.getPokemonHabitat(types('electric')).kind, 'circuit')
  assert.notEqual(
    habitat.getPokemonHabitat(types('ghost')).biome,
    habitat.getPokemonHabitat(types('psychic')).biome
  )
  assert.notEqual(
    habitat.getPokemonHabitat(types('rock')).biome,
    habitat.getPokemonHabitat(types('steel')).biome
  )
})

test('dual types retain both motifs, with order-independent special combinations', () => {
  for (const [a, b, fusion] of [
    ['water', 'ice', 'frozen-lagoon'],
    ['water', 'electric', 'storm-water'],
    ['grass', 'poison', 'toxic-garden'],
    ['fire', 'flying', 'firestorm'],
    ['electric', 'steel', 'magnetic-core'],
    ['electric', 'flying', 'thundercloud'],
  ]) {
    const theme = habitat.getPokemonHabitat(types(a, b))
    assert.deepEqual(new Set(theme.motifs), new Set([a, b]))
    assert.equal(theme.fusion, fusion)
    assert.deepEqual(theme, habitat.getPokemonHabitat(types(b, a)))
  }
})

test('unknown and duplicate types produce a safe single visual without stacking duplicates', () => {
  assert.deepEqual(
    habitat.getPokemonHabitat(types('electric', 'electric')).motifs,
    ['electric']
  )
  assert.deepEqual(habitat.getPokemonHabitat(types('unknown')).motifs, [
    'normal',
  ])
  assert.deepEqual(
    habitat.getPokemonHabitat(types('water', 'unknown')).motifs,
    ['water']
  )
})

test('every supported pair composes both types consistently regardless of slot order', () => {
  const names = [
    'normal',
    'fire',
    'water',
    'electric',
    'grass',
    'ice',
    'fighting',
    'poison',
    'ground',
    'flying',
    'psychic',
    'bug',
    'rock',
    'ghost',
    'dragon',
    'dark',
    'steel',
    'fairy',
  ]
  for (let a = 0; a < names.length; a++) {
    for (let b = a + 1; b < names.length; b++) {
      const theme = habitat.getPokemonHabitat(types(names[a], names[b]))
      assert.deepEqual(new Set(theme.motifs), new Set([names[a], names[b]]))
      assert.ok(theme.secondaryColors)
      assert.deepEqual(
        theme,
        habitat.getPokemonHabitat(types(names[b], names[a]))
      )
    }
  }
})

test('water is recognized in either slot, including mixed land/water types', () => {
  assert.equal(
    habitat.getPokemonHabitat(types('water', 'flying')).kind,
    'water'
  )
  assert.equal(habitat.getPokemonHabitat(types('grass', 'water')).kind, 'water')
})

test('land and elemental themes use both types and have a safe default', () => {
  for (const [names, kind] of [
    [['grass', 'poison'], 'meadow'],
    [['normal', 'bug'], 'meadow'],
    [['fire', 'flying'], 'ember'],
    [['ice'], 'frost'],
    [['ground', 'rock'], 'stone'],
    [['ghost', 'poison'], 'astral'],
    [[], 'meadow'],
  ]) {
    assert.equal(habitat.getPokemonHabitat(types(...names)).kind, kind)
  }
})

test('every type and its pair partner carry a saturated glow colour for the effects', () => {
  const single = habitat.getPokemonHabitat(types('ghost'))
  assert.match(single.glow, /^#[0-9a-f]{6}$/)
  const pair = habitat.getPokemonHabitat(types('fire', 'flying'))
  assert.match(pair.glow, /^#[0-9a-f]{6}$/)
  assert.match(pair.secondaryColors.glow, /^#[0-9a-f]{6}$/)
  assert.notEqual(pair.glow, pair.secondaryColors.glow)
})
