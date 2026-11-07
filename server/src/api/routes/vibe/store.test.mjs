import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('sucrase/register')
const { storeVibe } = require('./store.ts')

const row = { species_id: 25, vibe: 'cute', v: 1 }
const fake = (status) => {
  const calls = []
  const fetchImpl = async (url, init) => (calls.push({ url, init }), { ok: status < 300, status })
  return { calls, fetchImpl }
}

test('a vibe is stored through the store RPC with the service key', async () => {
  const { calls, fetchImpl } = fake(204)
  await storeVibe(fetchImpl, { url: 'http://db', key: 'k' }, row)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://db/rest/v1/rpc/pokemon_species_vibe_store')
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(calls[0].init.headers.apikey, 'k')
  assert.equal(calls[0].init.headers.Authorization, 'Bearer k')
  assert.deepEqual(JSON.parse(calls[0].init.body), { p_species: 25, p_vibe: 'cute', p_v: 1 })
  assert.ok(calls[0].init.signal)
})

test('a refused store is an error, so the caller stores it again later', async () => {
  for (const status of [401, 404, 500]) {
    const { fetchImpl } = fake(status)
    await assert.rejects(
      storeVibe(fetchImpl, { url: 'http://db', key: 'k' }, row),
      new RegExp(`vibe store ${status}`)
    )
  }
})

test('no Supabase settings: nothing is sent', async () => {
  const { calls, fetchImpl } = fake(204)
  await storeVibe(fetchImpl, { url: '', key: 'k' }, row)
  await storeVibe(fetchImpl, { url: 'http://db', key: '' }, row)
  assert.equal(calls.length, 0)
})

test('the vibe route borrows nothing from the quiz route', () => {
  for (const f of ['source.ts', 'store.ts', 'service.ts'])
    assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /\.\.\/quiz\//, f)
})
