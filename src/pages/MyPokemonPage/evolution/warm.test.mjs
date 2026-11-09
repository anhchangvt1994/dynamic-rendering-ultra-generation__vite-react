import assert from 'node:assert/strict'
import { test } from 'node:test'
import { warmPlan, warmUp } from './warm.mjs'

test('warmPlan: selected first, ready only, unique, capped', () => {
  const forms = [
    { to: 134, ready: true },
    { to: 135, ready: true },
    { to: 136, ready: false },
    { to: 135, ready: true, item: 'x' },
    { to: 196, ready: true },
    { to: 197, ready: true },
  ]
  assert.deepEqual(warmPlan(forms, 196, 3), [196, 134, 135])
  assert.deepEqual(warmPlan([], null, 3), [])
})

test('warmUp: asks again on 202, stops on 200, once per id', async () => {
  const seen = []
  const answers = [202, 202, 200]
  const f = async (url) => (seen.push(url), { status: answers.shift(), body: null })
  const wait = async () => {}
  await Promise.all([warmUp(25, { fetch: f, wait }), warmUp(25, { fetch: f, wait })])
  assert.deepEqual(seen, Array(3).fill('/api/image/25.webp'))
  await warmUp(25, { fetch: f, wait }) // already warm
  assert.equal(seen.length, 3)
})

test('warmUp: gives up after the retries, and may try again later', async () => {
  let n = 0
  const f = async () => (n++, { status: 202, body: null })
  await warmUp(7, { fetch: f, wait: async () => {}, tries: 4 })
  assert.equal(n, 4)
  await warmUp(7, { fetch: f, wait: async () => {}, tries: 2 })
  assert.equal(n, 6)
})

test('warmUp: a network error is retried, never thrown', async () => {
  let n = 0
  const f = async () => {
    if (n++ === 0) throw new Error('offline')
    return { status: 200, body: null }
  }
  await warmUp(9, { fetch: f, wait: async () => {} })
  assert.equal(n, 2)
})
