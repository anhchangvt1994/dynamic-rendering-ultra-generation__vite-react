import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('sucrase/register')
const { pickSource } = require('./sources.ts')

const A = 'a/{key}'
const B = 'b/{key}'
const C = 'c/{key}'
const stub = (hits) => {
  const calls = []
  const get = async (template, key) => {
    calls.push(template.replace('{key}', key))
    const hit = hits[template]
    if (hit instanceof Error) throw hit
    return hit ?? null
  }
  return { get, calls }
}
class Missing extends Error {}

test('first source wins without sharpening and stops the chain', async () => {
  const { get, calls } = stub({ [A]: Buffer.from('1'), [B]: Buffer.from('2') })
  const got = await pickSource('9', [A, B], C, get, Missing)
  assert.equal(got.image.toString(), '1')
  assert.equal(got.sharpen, false)
  assert.deepEqual(calls, ['a/9'])
})

test('second source is used when the first misses, still not sharpened', async () => {
  const { get, calls } = stub({ [B]: Buffer.from('2'), [C]: Buffer.from('3') })
  const got = await pickSource('9', [A, B], C, get, Missing)
  assert.equal(got.image.toString(), '2')
  assert.equal(got.sharpen, false)
  assert.deepEqual(calls, ['a/9', 'b/9'])
})

test('only the last-resort source is sharpened', async () => {
  const { get, calls } = stub({ [C]: Buffer.from('3') })
  const got = await pickSource('9', [A, B], C, get, Missing)
  assert.equal(got.image.toString(), '3')
  assert.equal(got.sharpen, true)
  assert.deepEqual(calls, ['a/9', 'b/9', 'c/9'])
})

test('Missing when every source misses, or none is configured', async () => {
  await assert.rejects(
    pickSource('9', [A, B], C, stub({}).get, Missing),
    Missing
  )
  await assert.rejects(
    pickSource('9', [A, B], '', stub({}).get, Missing),
    Missing
  )
})

test('a non-404 failure is raised, never falls through to the next source', async () => {
  const { get, calls } = stub({ [A]: new Error('500'), [B]: Buffer.from('2') })
  await assert.rejects(pickSource('9', [A, B], C, get, Missing), /500/)
  assert.deepEqual(calls, ['a/9'])
})
