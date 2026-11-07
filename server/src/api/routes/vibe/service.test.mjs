import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('sucrase/register')
const { VIBE_CACHE, readVibePath, vibeFor } = require('./service.ts')

const deps = (over = {}) => {
  const saved = []
  return {
    saved,
    load: async (endpoint) =>
      endpoint === '/pokemon-species/25'
        ? { id: 25, egg_groups: [] }
        : { types: [{ type: { name: 'electric' } }], stats: [] },
    save: async (row) => {
      saved.push(row)
    },
    ...over,
  }
}

test('the path names a species id', () => {
  assert.equal(readVibePath('/api/species-vibe/25'), '25')
  assert.equal(readVibePath('/api/species-vibe/25?x=1'), '25')
  assert.equal(readVibePath('/api/species-vibe/'), null)
  assert.equal(readVibePath('/api/other/25'), null)
  assert.equal(VIBE_CACHE, 'public, max-age=604800')
})

test('a species vibe: body, version, and the server stores it', async () => {
  const d = deps()
  const r = await vibeFor('25', d)
  assert.equal(r.status, 200)
  assert.deepEqual(
    { id: r.body.id, vibe: r.body.vibe, v: r.body.v },
    { id: 25, vibe: 'cute', v: 1 }
  )
  assert.equal(typeof r.body.scores.cool, 'number')
  assert.deepEqual(d.saved, [{ species_id: 25, vibe: 'cute', v: 1 }])
})

test('a bad id is 400 and loads nothing', async () => {
  let loads = 0
  for (const id of ['0', '1026', 'abc', '', '1.5']) {
    const r = await vibeFor(id, deps({ load: async () => (loads++, {}) }))
    assert.equal(r.status, 400, id)
  }
  assert.equal(loads, 0)
})

test('Pokédex data that can not be read is 502, nothing stored', async () => {
  for (const load of [
    async () => null,
    async () => Promise.reject(new Error('down')),
  ]) {
    const d = deps({ load })
    const r = await vibeFor('25', d)
    assert.equal(r.status, 502)
    assert.deepEqual(d.saved, [])
  }
})

test('a hung store does not hold the answer', async () => {
  const t = Date.now()
  const r = await vibeFor(
    '25',
    deps({ save: () => new Promise(() => {}), saveWaitMs: 20 })
  )
  assert.equal(r.status, 200)
  assert.ok(Date.now() - t < 1000)
})

test('a failed store still answers', async () => {
  const r = await vibeFor(
    '25',
    deps({ save: async () => Promise.reject(new Error('db down')) })
  )
  assert.equal(r.status, 200)
  assert.equal(r.body.vibe, 'cute')
})
