import assert from 'node:assert/strict'
import { createHash, getRandomValues } from 'node:crypto'
import { test } from 'node:test'
import { randomId, sha256, tabLock, webLock } from './secure.mjs'

const V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

test('randomId: a v4 uuid even where randomUUID is missing (http on a LAN ip)', () => {
  const ids = new Set()
  for (let i = 0; i < 200; i++) {
    const id = randomId({ getRandomValues: (a) => getRandomValues(a) })
    assert.match(id, V4)
    ids.add(id)
  }
  assert.equal(ids.size, 200)
})

test('randomId: uses randomUUID when there is one', () => {
  assert.equal(randomId({ randomUUID: () => 'x' }), 'x')
})

test('sha256: matches node for empty, short, multi-block and unicode input', () => {
  for (const s of [
    '',
    'abc',
    'a'.repeat(55),
    'a'.repeat(56),
    'a'.repeat(200),
    'Pokémon:hue-mag',
  ]) {
    const bytes = new TextEncoder().encode(s)
    const want = createHash('sha256').update(bytes).digest('hex')
    assert.equal(Buffer.from(sha256(bytes)).toString('hex'), want, s)
  }
})

test('tabLock: runs one holder of a name at a time, in order', async () => {
  const lock = tabLock()
  const log = []
  const hold = (tag, ms) =>
    lock('k', async () => {
      log.push(`${tag}+`)
      await new Promise((r) => setTimeout(r, ms))
      log.push(`${tag}-`)
      return tag
    })
  const out = await Promise.all([hold('a', 20), hold('b', 1), hold('c', 1)])
  assert.deepEqual(out, ['a', 'b', 'c'])
  assert.deepEqual(log, ['a+', 'a-', 'b+', 'b-', 'c+', 'c-'])
})

test('tabLock: a failed holder releases the lock', async () => {
  const lock = tabLock()
  await assert.rejects(
    lock('k', async () => {
      throw new Error('boom')
    })
  )
  assert.equal(await lock('k', async () => 1), 1)
})

test('webLock: without navigator.locks (insecure context) it still serializes in this tab', async () => {
  assert.equal(globalThis.navigator?.locks, undefined)
  const lock = webLock()
  assert.equal(typeof lock, 'function')
  assert.equal(await lock('k', async () => 7), 7)
})
