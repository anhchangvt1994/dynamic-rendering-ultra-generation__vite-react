import test from 'node:test'
import assert from 'node:assert/strict'
import { loadMoves, movesKey, saveMoves } from './moves.mjs'

const store = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)) }
}

test('key carries the round id', () => assert.equal(movesKey('r1'), 'mg-candy-moves:r1'))
test('round trip', () => {
  const s = store()
  saveMoves(s, 'r1', [[0, 1], [6, 12]])
  assert.deepEqual(loadMoves(s, 'r1'), [[0, 1], [6, 12]])
})
test('other round id gives []', () => {
  const s = store()
  saveMoves(s, 'r1', [[0, 1]])
  assert.deepEqual(loadMoves(s, 'r2'), [])
})
test('null round id gives []', () => {
  const s = store()
  saveMoves(s, null, [[0, 1]])
  assert.deepEqual(loadMoves(s, null), [])
})
test('corrupt JSON gives []', () => {
  const s = store()
  s.setItem(movesKey('r1'), '{nope')
  assert.deepEqual(loadMoves(s, 'r1'), [])
})
test('wrong shape gives []', () => {
  const s = store()
  s.setItem(movesKey('r1'), '[[1,2],[3]]')
  assert.deepEqual(loadMoves(s, 'r1'), [])
  s.setItem(movesKey('r1'), '{"a":1}')
  assert.deepEqual(loadMoves(s, 'r1'), [])
})
test('throwing storage does not throw', () => {
  const bad = { getItem() { throw new Error('x') }, setItem() { throw new Error('x') } }
  assert.doesNotThrow(() => saveMoves(bad, 'r1', [[0, 1]]))
  assert.deepEqual(loadMoves(bad, 'r1'), [])
  assert.deepEqual(loadMoves(undefined, 'r1'), [])
})
