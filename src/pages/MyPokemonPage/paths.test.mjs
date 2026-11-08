import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MY_POKEMON_PATH,
  myPokemonPath,
  findIndividual,
  individualNavigationState,
} from './paths.mjs'

test('the list lives at /pokemon-cua-toi and a detail under it', () => {
  assert.equal(MY_POKEMON_PATH, '/pokemon-cua-toi')
  assert.equal(myPokemonPath(), '/pokemon-cua-toi')
  assert.equal(myPokemonPath('abc-123'), '/pokemon-cua-toi/abc-123')
})

test('an id is escaped so it can never leave the route', () => {
  assert.equal(myPokemonPath('a/b?c'), '/pokemon-cua-toi/a%2Fb%3Fc')
})

test('individual navigation preserves the mounted page between siblings', () => {
  assert.deepEqual(individualNavigationState('/?view=caught', 3), {
    returnTo: '/?view=caught',
    returnIndex: 3,
    keepPage: true,
  })
})

test('findIndividual returns the owned individual or null', () => {
  const items = [{ id: 'a' }, { id: 'b' }]
  assert.equal(findIndividual(items, 'b'), items[1])
  assert.equal(findIndividual(items, 'z'), null)
  assert.equal(findIndividual(null, 'a'), null)
  assert.equal(findIndividual(items, undefined), null)
})
