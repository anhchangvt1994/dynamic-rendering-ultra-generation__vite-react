import test from 'node:test'
import assert from 'node:assert/strict'
import { LIKES, dishFlavor, tasteOf } from './likes.mjs'

const FLAVORED = ['power', 'beauty', 'happiness', 'agility', 'wisdom']

test('each of the 12 personalities likes one flavour and dislikes another', () => {
  assert.equal(LIKES.length, 12)
  for (const { like, dislike } of LIKES) {
    assert.notEqual(like, dislike)
    assert.ok(FLAVORED.includes(like))
    assert.ok(FLAVORED.includes(dislike))
  }
  const pairs = new Set(LIKES.map(({ like, dislike }) => `${like}/${dislike}`))
  assert.equal(pairs.size, 12)
})

test('a dish tastes of its strongest stat', () => {
  assert.equal(dishFlavor({ top: ['agility', 'power'] }), 'agility')
  assert.equal(tasteOf(0, { top: ['happiness'] }), 'liked')
  assert.equal(tasteOf(0, { top: ['power'] }), 'disliked')
  assert.equal(tasteOf(0, { top: ['wisdom'] }), 'neutral')
  assert.equal(tasteOf(0, { top: [] }), 'neutral')
})
