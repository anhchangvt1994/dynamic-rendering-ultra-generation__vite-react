import assert from 'node:assert/strict'
import { test } from 'node:test'
import { typesOf, TYPE_ORDER } from './type-index.mjs'

test('known species have their types in slot order', () => {
  assert.deepEqual(typesOf(1), ['grass', 'poison'])
  assert.deepEqual(typesOf(25), ['electric'])
  assert.deepEqual(typesOf(445), ['dragon', 'ground'])
  assert.deepEqual(typesOf(1025), ['poison', 'ghost'])
})

test('every species has a known primary type; out of range is empty', () => {
  for (let id = 1; id <= 1025; id++) {
    const types = typesOf(id)
    assert.ok(types.length >= 1 && types.length <= 2, `#${id}`)
    types.forEach((type) =>
      assert.ok(TYPE_ORDER.includes(type), `#${id} ${type}`)
    )
  }
  assert.deepEqual(typesOf(0), [])
  assert.deepEqual(typesOf(1026), [])
  assert.deepEqual(typesOf('x'), [])
})
