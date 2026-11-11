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
