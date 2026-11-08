import assert from 'node:assert/strict'
import { test } from 'node:test'
import { enqueueWelcome } from './welcomeQueue.mjs'

const r = (operationId) => ({ operationId, speciesId: 25 })

test('a batch of receipts is one welcome group, in order', () => {
  const queue = enqueueWelcome([], [r('a'), r('b')])
  assert.equal(queue.length, 1)
  assert.deepEqual(
    queue[0].receipts.map((x) => x.operationId),
    ['a', 'b']
  )
})

test('receipts already queued are not shown twice; an empty batch adds nothing', () => {
  const first = enqueueWelcome([], [r('a'), r('b')])
  assert.equal(enqueueWelcome(first, [r('a'), r('b')]), first)
  assert.equal(enqueueWelcome(first, []), first)
  const next = enqueueWelcome(first, [r('b'), r('c')])
  assert.equal(next.length, 2)
  assert.deepEqual(
    next[1].receipts.map((x) => x.operationId),
    ['c']
  )
})
