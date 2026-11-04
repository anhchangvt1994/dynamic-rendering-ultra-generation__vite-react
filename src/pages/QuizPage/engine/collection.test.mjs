import assert from 'node:assert/strict'
import { test } from 'node:test'
import { seeded } from '../quiz.mjs'
import { inShare, pickAnswer } from './collection.mjs'

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
const KANTO = { from: 1, to: 151 }
const mine = (n) => range(1, n)
const seq =
  (...values) =>
  () =>
    values.shift() ?? 0

test('inShare: none, a few, enough', () => {
  assert.equal(inShare(0), 0)
  assert.equal(inShare(1), 0.2)
  assert.equal(inShare(9), 0.2)
  assert.equal(inShare(10), 0.7)
  assert.equal(inShare(500), 0.7)
})

test('with 10 in the collection, 0.69 picks one of them, 0.7 one outside', () => {
  const args = { ...KANTO, collection: mine(10), recent: [] }
  assert.ok(mine(10).includes(pickAnswer(seq(0.69, 0.5), args)))
  assert.ok(!mine(10).includes(pickAnswer(seq(0.7, 0.5), args)))
})

test('with 9 in the collection, 0.19 picks one of them, 0.2 one outside', () => {
  const args = { ...KANTO, collection: mine(9), recent: [] }
  assert.ok(mine(9).includes(pickAnswer(seq(0.19, 0.5), args)))
  assert.ok(!mine(9).includes(pickAnswer(seq(0.2, 0.5), args)))
})

test('an empty collection always gives a species of the range', () => {
  const random = seeded(7)
  for (let i = 0; i < 200; i++) {
    const id = pickAnswer(random, {
      from: 152,
      to: 251,
      collection: [],
      recent: [],
    })
    assert.ok(id >= 152 && id <= 251)
  }
})

test('a collection outside the range counts as empty', () => {
  const random = seeded(11)
  for (let i = 0; i < 200; i++) {
    const id = pickAnswer(random, {
      from: 152,
      to: 251,
      collection: range(1, 20),
      recent: [],
    })
    assert.ok(id >= 152 && id <= 251)
  }
})

test('every collection species recent: the answer comes from outside', () => {
  const random = seeded(3)
  const recent = mine(10)
  for (let i = 0; i < 200; i++) {
    const id = pickAnswer(random, { ...KANTO, collection: mine(10), recent })
    assert.ok(!recent.includes(id))
  }
})

test('both groups spent: still an answer, never the one just before', () => {
  const random = seeded(5)
  for (let i = 0; i < 200; i++) {
    const id = pickAnswer(random, {
      from: 1,
      to: 4,
      collection: [1, 2],
      recent: [1, 2, 3, 4],
    })
    assert.ok(id >= 1 && id <= 4)
    assert.notEqual(id, 1)
  }
})

test('duplicates in the collection count once', () => {
  // 3 distinct (not 10): the share is 0.2, so 0.5 picks from outside
  const id = pickAnswer(seq(0.5, 0), {
    ...KANTO,
    collection: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    recent: [],
  })
  assert.ok(id !== 5)
})

test('over many rounds about 70% come from a full collection', () => {
  const random = seeded(2026)
  const set = new Set(mine(12))
  let inside = 0
  for (let i = 0; i < 20000; i++)
    if (set.has(pickAnswer(random, { ...KANTO, collection: set, recent: [] })))
      inside++
  const share = inside / 20000
  assert.ok(share > 0.68 && share < 0.72, `share ${share}`)
})
