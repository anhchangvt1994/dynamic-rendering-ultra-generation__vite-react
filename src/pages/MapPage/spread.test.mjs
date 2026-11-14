import test from 'node:test'
import assert from 'node:assert/strict'
import { spread } from './spread.mjs'

const disc = (R) => (p) => {
  const d = Math.hypot(p.x, p.z)
  return d > R ? { x: (p.x / d) * R, z: (p.z / d) * R } : p
}
const crowd = Array.from({ length: 30 }, (_, i) => ({ x: Math.cos(i) * 3, z: Math.sin(i * 1.7) * 3, r: 5, clamp: disc(70) }))

test('a crowd is spread so every pair has room', () => {
  const out = spread(crowd, { iterations: 300 })
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) assert.ok(Math.hypot(out[i].x - out[j].x, out[i].z - out[j].z) >= 8.5, `${i}/${j}`)
})
test('fixed points stay put and movers keep clear of them', () => {
  const pts = [{ x: 0, z: 0, r: 12, fixed: true }, { x: 1, z: 1, r: 5, clamp: disc(70) }]
  const out = spread(pts)
  assert.deepEqual([out[0].x, out[0].z], [0, 0])
  assert.ok(Math.hypot(out[1].x, out[1].z) >= 16.5)
})
test('movers stay inside their clamp', () => {
  for (const p of spread(crowd, { iterations: 300 })) assert.ok(Math.hypot(p.x, p.z) <= 70.0001)
})
test('same input, same output; input untouched', () => {
  const before = JSON.stringify(crowd.map(({ x, z }) => [x, z]))
  assert.deepEqual(spread(crowd).map((p) => [p.x, p.z]), spread(crowd).map((p) => [p.x, p.z]))
  assert.equal(JSON.stringify(crowd.map(({ x, z }) => [x, z])), before)
})
