import assert from 'node:assert/strict'
import { test } from 'node:test'
import { matchRange, searchPokemon } from './search.mjs'

const mon = (name, id) => ({
  name,
  url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
})
const list = [
  mon('bulbasaur', 1),
  mon('pikachu', 25),
  mon('raichu', 26),
  mon('mr-mime', 122),
  mon('garchomp', 445),
  mon('gengar', 94),
  mon('gabite', 444),
  mon('pikachu-rock-star', 10080),
  mon('tapu-koko', 785),
]
const names = (query) => searchPokemon(list, query).map((m) => m.name)

test('empty query finds nothing', () => {
  assert.deepEqual(names('  '), [])
})

test('name start ranks before a match inside the name', () => {
  assert.deepEqual(names('ga'), ['gabite', 'garchomp', 'gengar'])
  assert.deepEqual(names('gar'), ['garchomp', 'gengar'])
})

test('spaces, dots and hyphens are interchangeable', () => {
  assert.deepEqual(names('mr mime'), ['mr-mime'])
  assert.deepEqual(names('Mr. Mime'), ['mr-mime'])
  assert.deepEqual(names('koko'), ['tapu-koko'])
})

test('dex numbers find the species first', () => {
  assert.deepEqual(names('25'), ['pikachu'])
  // then other numbers starting with the digits, never forms
  assert.deepEqual(names('#1'), ['bulbasaur', 'mr-mime'])
})

test('forms rank after the species', () => {
  assert.deepEqual(names('pikachu'), ['pikachu', 'pikachu-rock-star'])
})

test('match range maps onto the displayed name', () => {
  assert.deepEqual(matchRange('mr-mime', 'r mi'), [1, 5])
  assert.equal(matchRange('pikachu', '25'), null)
})
