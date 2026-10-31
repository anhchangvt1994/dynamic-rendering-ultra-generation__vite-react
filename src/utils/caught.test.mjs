import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getCaught,
  isCaught,
  replaceCaught,
  subscribeCaught,
  toggleCaught,
} from './caught.mjs'

const memory = (initial = null) => {
  let value = initial
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next
    },
  }
}

test('toggling marks and unmarks a Pokémon', () => {
  const storage = memory()
  assert.equal(toggleCaught(25, storage), true)
  assert.equal(isCaught(25, storage), true)
  assert.equal(toggleCaught(25, storage), false)
  assert.equal(isCaught(25, storage), false)
})

test('ids are stored sorted and survive a reload', () => {
  const storage = memory()
  toggleCaught(445, storage)
  toggleCaught(1, storage)
  assert.deepEqual([...getCaught(memory(storage.getItem()))], [1, 445])
})

test('corrupt or foreign data reads as empty, never throws', () => {
  assert.equal(getCaught(memory('{not json')).size, 0)
  assert.equal(getCaught(memory('{"a":1}')).size, 0)
  assert.equal(getCaught(memory('[1,"x",2.5,3]')).size, 2)
  assert.equal(getCaught(null).size, 0)
})

test('a full storage still toggles for this view and notifies', () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError')
    },
  }
  let calls = 0
  const stop = subscribeCaught(() => calls++)
  assert.equal(toggleCaught(7, storage), true)
  stop()
  toggleCaught(7, storage)
  assert.equal(calls, 1)
})

test('a failed storage write retains caught state and can be toggled back', () => {
  const storage = {
    getItem: () => '[]',
    setItem: () => {
      throw new Error('QuotaExceededError')
    },
  }
  toggleCaught(25, storage)
  assert.equal(isCaught(25, storage), true)
  assert.deepEqual([...getCaught(storage)], [25])
  assert.equal(toggleCaught(25, storage), false)
  assert.equal(isCaught(25, storage), false)
})

test('only supported national species can enter the collection', () => {
  const storage = memory('[0,1,10001,-2]')
  assert.deepEqual([...getCaught(storage)], [1])
  assert.equal(toggleCaught(10001, storage), false)
  assert.deepEqual([...getCaught(storage)], [1])
})

test('replacing the collection keeps valid ids only and notifies', () => {
  const storage = memory(JSON.stringify([1, 2]))
  let calls = 0
  const stop = subscribeCaught(() => calls++)
  replaceCaught([25, 3, 0, 2000, 25], storage)
  stop()
  assert.deepEqual([...getCaught(storage)], [3, 25])
  assert.equal(storage.getItem(), '[3,25]')
  assert.equal(calls, 1)
})
