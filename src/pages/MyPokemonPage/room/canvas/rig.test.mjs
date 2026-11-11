import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('sucrase/register')
const { isCurrentRig, cellAt } = require('./rig.ts')

test('only a v10 rig is current', () => {
  assert.equal(isCurrentRig({ v: 10 }), true)
  assert.equal(isCurrentRig({ v: 9 }), false)
  assert.equal(isCurrentRig({}), false)
})

test('a frame sits in page K/per, at cell K%per of that page', () => {
  const big = { sheet: { cols: 8, rows: 8, per: 64, pages: 3 } }
  assert.deepEqual(cellAt(big, 0), { page: 0, col: 0, row: 0 })
  assert.deepEqual(cellAt(big, 9), { page: 0, col: 1, row: 1 })
  assert.deepEqual(cellAt(big, 64), { page: 1, col: 0, row: 0 })
  assert.deepEqual(cellAt(big, 129), { page: 2, col: 1, row: 0 })
  const small = { sheet: { cols: 3, rows: 3, per: 8, pages: 1 } }
  assert.deepEqual(cellAt(small, 7), { page: 0, col: 1, row: 2 })
})

test('every rig file is asked for with the rig version, so a stale cached v9 file is never paired with a v10 rig.json', async () => {
  const urls = []
  const json = { v: 10, sheet: { cols: 8, rows: 8, per: 64, pages: 2 } }
  globalThis.fetch = async (url) => {
    urls.push(String(url))
    return {
      ok: true,
      status: 200,
      json: async () => json,
      blob: async () => ({}),
    }
  }
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1 })
  const { preloadRig } = require('./rig.ts')
  await preloadRig(777)
  assert.ok(urls.length >= 6, urls.join())
  for (const u of urls) assert.match(u, /[?&]v=10(&|$)/, u)
})
