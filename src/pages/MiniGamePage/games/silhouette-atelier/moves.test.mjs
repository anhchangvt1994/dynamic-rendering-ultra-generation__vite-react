import test from 'node:test'
import assert from 'node:assert/strict'
import { loadLog, movesKey, saveLog } from './moves.mjs'
const store = () => { const data = new Map(); return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) } }
test('jigsaw move log round-trips and ignores corrupt storage', () => {
  const s = store()
  assert.deepEqual(loadLog(s, 'r1'), [])
  saveLog(s, 'r1', [[10, 4, 2], [30, 1, -2]])
  assert.equal(movesKey('r1'), 'mg-jigsaw-moves:r1')
  assert.deepEqual(loadLog(s, 'r1'), [[10, 4, 2], [30, 1, -2]])
  s.setItem(movesKey('bad'), JSON.stringify([[1, 2]]))
  assert.deepEqual(loadLog(s, 'bad'), [])
  s.setItem(movesKey('json'), '{')
  assert.deepEqual(loadLog(s, 'json'), [])
  assert.deepEqual(loadLog(undefined, 'r1'), [])
  assert.doesNotThrow(() => saveLog(undefined, 'r1', []))
  assert.deepEqual(loadLog(s, null), [])
})
