import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('sucrase/register')
const { skeleton } = require('./skeleton.ts')

const S = 64
const mask = (inside) => {
  const m = new Uint8Array(S * S)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) m[y * S + x] = inside(x, y) ? 1 : 0
  return m
}

test('a T 9px thick: three branches inside the mask, radius about 4.5', () => {
  const m = mask(
    (x, y) =>
      (y >= 10 && y < 19 && x >= 8 && x < 56) ||
      (x >= 28 && x < 37 && y >= 10 && y < 56)
  )
  const { branches } = skeleton(m, S)
  assert.equal(
    branches.length,
    3,
    JSON.stringify(branches.map((b) => b.points.length))
  )
  for (const b of branches) {
    assert.equal(b.points.length, b.radius.length)
    assert.ok(b.points.length >= 4)
    for (const [x, y] of b.points) {
      assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1)
      assert.equal(m[Math.floor(y * S) * S + Math.floor(x * S)], 1)
    }
    const r = b.radius.map((v) => v * S).sort((p, q) => p - q)
    const median = r[Math.floor(r.length / 2)]
    assert.ok(Math.abs(median - 4.5) <= 1, `radius ${median}`)
  }
})

test('a disc thins to one branch or a point', () => {
  const m = mask((x, y) => (x - 32) ** 2 + (y - 32) ** 2 <= 14 ** 2)
  const { branches } = skeleton(m, S)
  assert.equal(branches.length, 1)
  assert.ok(branches[0].points.length >= 1)
})

test('an empty mask has no branches', () => {
  assert.deepEqual(skeleton(new Uint8Array(S * S), S), { branches: [] })
})
