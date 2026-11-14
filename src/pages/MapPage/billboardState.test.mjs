import test from 'node:test'
import assert from 'node:assert/strict'
import { auraOf, visibleKinds, textureBudget, nextSlotDelay } from './billboardState.mjs'

test('aura follows the tier', () => {
  assert.equal(auraOf('legendary'), 'legendary')
  assert.equal(auraOf('mythical'), 'mythical')
  assert.equal(auraOf('pseudo'), 'pseudo')
  assert.equal(auraOf('common'), 'none')
  assert.equal(auraOf('veryRare'), 'none')
})
test('filters name the kinds that stay visible', () => {
  const k = visibleKinds({ pokemon: false, npc: true, gym: true })
  assert.equal(k.size, 2)
  assert.ok(k.has('npc') && k.has('gym') && !k.has('pokemon'))
})
test('texture budget keeps unique in-range indexes, owned and rare first', () => {
  const ids = Array.from({ length: 40 }, (_, i) => i + 1)
  const keep = textureBudget(ids, 24, new Set([40]))
  assert.equal(keep.length, 24)
  assert.equal(new Set(keep).size, 24)
  assert.ok(keep.every((i) => i >= 0 && i < 40))
  assert.ok(keep.includes(39), 'the owned one (id 40) is kept')
  assert.equal(textureBudget(ids.slice(0, 10), 24, new Set()).length, 10)
})
test('the next slot is never more than 10 minutes away', () => {
  assert.equal(nextSlotDelay(0), 600000)
  assert.equal(nextSlotDelay(599999), 1)
  assert.equal(nextSlotDelay(600000), 600000)
})
