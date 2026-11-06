import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CARE,
  applyBathe,
  applyFeed,
  applyPet,
  blockedReason,
  initialCare,
  levelOf,
  needsNow,
  nextLevelAt,
  statCap,
  unlocksAt,
} from './care.mjs'

const T0 = '2026-11-05T00:00:00.000Z'
const at = (minutes) => new Date(Date.parse(T0) + minutes * 60_000)
const base = (over = {}) => ({ ...initialCare(T0), ...over })
const power = {
  id: 'poffin-cheri',
  top: ['power'],
  stats: { power: 4, friendship: 3 },
}

test('a new individual starts at 60 with no stats', () => {
  const s = initialCare(T0)
  assert.deepEqual(s.needs, { hunger: 60, clean: 60, fun: 60 })
  assert.equal(s.needsAt, T0)
  assert.equal(s.affection, 0)
  assert.deepEqual(Object.values(s.stats), [0, 0, 0, 0, 0, 0])
  assert.equal(s.lastCaredAt, null)
})

test('needs decay by the hour and stop at the floor', () => {
  assert.deepEqual(needsNow(base(), at(300)), {
    hunger: 40,
    clean: 50,
    fun: 45,
  })
  assert.deepEqual(needsNow(base(), at(6000)), {
    hunger: 25,
    clean: 25,
    fun: 25,
  })
  assert.equal(needsNow(base(), at(10)).hunger, 59.33)
})

test('a needsAt in the future never raises or lowers needs', () => {
  assert.deepEqual(needsNow(base(), at(-120)), {
    hunger: 60,
    clean: 60,
    fun: 60,
  })
})

test('levels follow the thresholds', () => {
  assert.equal(levelOf(0), 1)
  assert.equal(levelOf(9), 1)
  assert.equal(levelOf(10), 2)
  assert.equal(levelOf(449), 9)
  assert.equal(levelOf(450), 10)
  assert.equal(levelOf(9999), 10)
  assert.equal(nextLevelAt(0), 10)
  assert.equal(nextLevelAt(450), null)
})

test('stars raise the stat cap; levels unlock the room', () => {
  assert.equal(statCap(1), 80)
  assert.equal(statCap(5), 160)
  assert.deepEqual(unlocksAt(3), {
    sticker: false,
    sparkles: false,
    gold: false,
  })
  assert.equal(unlocksAt(4).sticker, true)
  assert.equal(unlocksAt(6).sparkles, false)
  assert.equal(unlocksAt(7).sparkles, true)
  assert.equal(unlocksAt(9).gold, false)
  assert.equal(unlocksAt(10).gold, true)
})

test('feeding a neutral dish fills hunger from its decayed value and adds stats', () => {
  const s = applyFeed(base(), power, 'neutral', 3, at(300))
  assert.equal(s.needs.hunger, 70)
  assert.equal(s.needs.fun, 45)
  assert.equal(s.stats.power, 4)
  assert.equal(s.stats.friendship, 3)
  assert.equal(s.affection, 3)
  assert.equal(s.lastCaredAt, at(300).toISOString())
  assert.equal(s.needsAt, at(300).toISOString())
  assert.equal(s.moodEvent, null)
})

test('a liked dish adds fun and more affection; a disliked one angers', () => {
  const liked = applyFeed(base(), power, 'liked', 3, at(0))
  assert.equal(liked.needs.fun, 70)
  assert.equal(liked.affection, 5)
  assert.equal(liked.moodEvent, 'liked')
  assert.equal(liked.moodEventAt, at(0).toISOString())
  const disliked = applyFeed(base(), power, 'disliked', 3, at(0))
  assert.equal(disliked.needs.fun, 60)
  assert.equal(disliked.affection, 0)
  assert.equal(disliked.moodEvent, 'disliked')
})

test('stats stop at the cap and needs at 100', () => {
  const full = base({
    needs: { hunger: 85, clean: 60, fun: 95 },
    stats: { ...initialCare(T0).stats, power: 79 },
  })
  const s = applyFeed(full, power, 'liked', 1, at(0))
  assert.equal(s.stats.power, 80)
  assert.equal(s.needs.hunger, 100)
  assert.equal(s.needs.fun, 100)
})

test('bathing fills clean and starts the cooldown', () => {
  const s = applyBathe(base(), at(0))
  assert.equal(s.needs.clean, 100)
  assert.equal(s.bathedAt, at(0).toISOString())
  assert.equal(s.affection, 2)
})

test('three pets in ten minutes please, the fourth angers', () => {
  let s = base()
  for (let i = 0; i < 3; i++) s = applyPet(s, at(i))
  assert.equal(s.needs.fun, 100)
  assert.equal(s.affection, 3)
  assert.equal(s.petWindowCount, 3)
  const before = s
  s = applyPet(s, at(4))
  assert.deepEqual(s.needs, needsNow(before, at(4)))
  assert.equal(s.affection, 3)
  assert.equal(s.moodEvent, 'overpet')
  s = applyPet(s, at(11))
  assert.equal(s.petWindowCount, 1)
  assert.equal(s.affection, 4)
})

test('blocked actions say why', () => {
  const full = base({ needs: { hunger: 90, clean: 60, fun: 60 } })
  assert.equal(blockedReason(full, 'feed', at(0), 2), 'Đang no')
  assert.equal(blockedReason(base(), 'feed', at(0), 0), 'Hết món, hãy nấu')
  assert.equal(blockedReason(base(), 'feed', at(0), 1), null)
  const bathed = applyBathe(base(), at(0))
  assert.equal(
    blockedReason(bathed, 'bathe', at(18)),
    'Vừa tắm xong (còn 12 phút)'
  )
  assert.equal(blockedReason(bathed, 'bathe', at(30)), null)
  let petted = base()
  for (let i = 0; i < 5; i++) petted = applyPet(petted, at(0))
  assert.equal(blockedReason(petted, 'pet', at(0)), null)
})

test("the constants are the spec's", () => {
  assert.equal(CARE.FLOOR, 25)
  assert.deepEqual(CARE.DECAY_PER_HOUR, { hunger: 4, clean: 2, fun: 3 })
  assert.deepEqual(CARE.LEVELS, [0, 10, 30, 60, 100, 150, 210, 280, 360, 450])
})
