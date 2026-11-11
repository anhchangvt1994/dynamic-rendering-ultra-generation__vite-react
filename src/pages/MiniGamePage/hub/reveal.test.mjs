import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldReveal } from './reveal.mjs'

const mem = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), m }
}
test('first call reveals and marks seen', () => {
  const s = mem()
  assert.equal(shouldReveal(s, false), true)
  assert.equal(s.m.get('mg-hub-seen'), '1')
})
test('second call does not reveal', () => {
  const s = mem()
  shouldReveal(s, false)
  assert.equal(shouldReveal(s, false), false)
})
test('reduced motion never reveals and does not mark', () => {
  const s = mem()
  assert.equal(shouldReveal(s, true), false)
  assert.equal(s.m.size, 0)
})
test('null storage -> false', () => assert.equal(shouldReveal(null, false), false))
test('throwing storage -> false', () => {
  const s = { getItem() { throw new Error('x') }, setItem() { throw new Error('x') } }
  assert.equal(shouldReveal(s, false), false)
})
