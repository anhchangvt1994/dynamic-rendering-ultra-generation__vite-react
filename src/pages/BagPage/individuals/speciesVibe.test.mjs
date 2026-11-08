import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createSpeciesVibe } from './speciesVibe.mjs'

const ok = (body) => async () => ({ ok: true, json: async () => body })

test('the vibe of a species comes from the route, once per species', async () => {
  const urls = []
  const vibe = createSpeciesVibe(async (url) => {
    urls.push(url)
    return { ok: true, json: async () => ({ id: 25, vibe: 'cute', v: 1 }) }
  })
  assert.equal(await vibe(25), 'cute')
  assert.equal(await vibe(25), 'cute')
  assert.deepEqual(urls, ['/api/species-vibe/25'])
})

test('any failure is null and is asked again later', async () => {
  for (const fetchImpl of [
    async () => Promise.reject(new Error('down')),
    async () => ({ ok: false, json: async () => ({ vibe: 'cute' }) }),
    ok({ vibe: 'sparkly' }),
    ok(null),
    async () => ({
      ok: true,
      json: async () => Promise.reject(new Error('x')),
    }),
  ])
    assert.equal(await createSpeciesVibe(fetchImpl)(25), null)
  let calls = 0
  const flaky = createSpeciesVibe(async () =>
    ++calls === 1 ? Promise.reject(new Error('down')) : ok({ vibe: 'fierce' })()
  )
  assert.equal(await flaky(130), null)
  assert.equal(await flaky(130), 'fierce')
})

test('a hung route gives up: null after the timeout, asked again later', async () => {
  let calls = 0
  let signal
  const vibe = createSpeciesVibe(
    async (url, init) => {
      signal = init?.signal
      return ++calls === 1 ? new Promise(() => {}) : ok({ vibe: 'mystic' })()
    },
    { timeoutMs: 20 }
  )
  const t = Date.now()
  assert.equal(await vibe(94), null)
  assert.ok(Date.now() - t < 1000)
  assert.ok(signal instanceof AbortSignal, 'the fetch can be aborted')
  assert.equal(await vibe(94), 'mystic')
})

test('an invalid species asks nothing', async () => {
  let calls = 0
  const vibe = createSpeciesVibe(async () => (calls++, ok({ vibe: 'cute' })()))
  for (const id of [0, 1026, 2.5, '25', null])
    assert.equal(await vibe(id), null)
  assert.equal(calls, 0)
})
