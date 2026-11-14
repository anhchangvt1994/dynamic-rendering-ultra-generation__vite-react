import test from 'node:test'
import assert from 'node:assert/strict'
import { heightAt, zoneAt, coastRadius, isLand, FLOOR } from './terrain.mjs'

test('stable per seed, different between seeds', () => {
  assert.equal(heightAt(1, 3, 4, 90), heightAt(1, 3, 4, 90))
  assert.notEqual(heightAt(1, 3, 4, 90), heightAt(2, 3, 4, 90))
})
test('the coast stays between 0.74R and R and varies with the angle and the seed', () => {
  const rs = Array.from({ length: 72 }, (_, i) => coastRadius(5, (i / 72) * Math.PI * 2, 100))
  assert.ok(rs.every((r) => r >= 74 && r <= 100))
  assert.ok(Math.max(...rs) - Math.min(...rs) > 6)
  assert.notEqual(coastRadius(5, 1, 100), coastRadius(6, 1, 100))
})
test('land is above sea level in the middle and below it beyond the coast', () => {
  assert.ok(heightAt(5, 0, 0, 90) > 1)
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2
    const c = coastRadius(5, a, 90)
    assert.ok(heightAt(5, Math.cos(a) * c * 0.5, Math.sin(a) * c * 0.5, 90) > 0.3)
    assert.ok(heightAt(5, Math.cos(a) * c * 1.05, Math.sin(a) * c * 1.05, 90) <= FLOOR)
  }
})
test('the middle is higher than the beach', () => {
  assert.ok(heightAt(5, 0, 0, 90) > heightAt(5, coastRadius(5, 0, 90) * 0.95, 0, 90))
})
test('isLand agrees with the coast; finite everywhere on a grid', () => {
  assert.ok(isLand(5, 0, 0, 90))
  assert.ok(!isLand(5, 95, 95, 90))
  for (let i = -60; i < 60; i += 3) for (let j = -60; j < 60; j += 3) assert.ok(Number.isFinite(heightAt(9, i * 2, j * 2, 90)))
})
test('zoneAt finds the zone a point is inside', () => {
  const layout = { zones: [{ id: 'a', kind: 'lake', x: 0, z: 0, r: 3 }, { id: 'b', kind: 'cave', x: 10, z: 0, r: 2 }] }
  assert.equal(zoneAt(layout, 1, 1), 'a')
  assert.equal(zoneAt(layout, 10.5, 0.5), 'b')
  assert.equal(zoneAt(layout, 5, 5), null)
})
