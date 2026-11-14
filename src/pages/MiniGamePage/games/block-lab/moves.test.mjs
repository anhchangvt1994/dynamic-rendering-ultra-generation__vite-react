import test from 'node:test'
import assert from 'node:assert/strict'
import { loadLog, movesKey, saveLog } from './moves.mjs'

const store = () => {
  const data = new Map()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }
}

test('the input log survives a reload and ignores bad data', () => {
  const s = store()
  assert.deepEqual(loadLog(s, 'r1'), [])
  saveLog(s, 'r1', [[100, 0], [250, 5]])
  assert.deepEqual(loadLog(s, 'r1'), [[100, 0], [250, 5]])
  assert.deepEqual(loadLog(s, 'other'), [])
  s.setItem(movesKey('r2'), JSON.stringify([[1, 2, 3]]))
  assert.deepEqual(loadLog(s, 'r2'), [])
  s.setItem(movesKey('r3'), '{oops')
  assert.deepEqual(loadLog(s, 'r3'), [])
  assert.deepEqual(loadLog(undefined, 'r1'), [])
  assert.doesNotThrow(() => saveLog(undefined, 'r1', []))
  assert.deepEqual(loadLog(s, null), [])
})
