import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getRecent, pushRecent } from './recent.mjs'

const memory = () => {
  let value = null
  return { getItem: () => value, setItem: (_k, v) => (value = v) }
}

test('newest first, no duplicates, capped at 10', () => {
  const storage = memory()
  for (let id = 1; id <= 12; id++) pushRecent({ id, name: `p${id}` }, storage)
  pushRecent({ id: 5, name: 'p5' }, storage)
  const list = getRecent(storage)
  assert.equal(list.length, 10)
  assert.equal(list[0].name, 'p5')
  assert.equal(list.filter((item) => item.name === 'p5').length, 1)
})

test('bad input and broken storage never throw', () => {
  const broken = {
    getItem: () => {
      throw new Error('x')
    },
    setItem: () => {
      throw new Error('x')
    },
  }
  assert.deepEqual(getRecent(broken), [])
  pushRecent({ id: 1, name: 'a' }, broken)
  pushRecent({ id: 'x', name: 'a' }, memory())
  const storage = memory()
  storage.setItem('k', '{bad')
  assert.deepEqual(getRecent({ getItem: () => '{bad' }), [])
})
