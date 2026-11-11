import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MINIGAME,
  bondOf,
  canJoinTeam,
  canPlay,
  careCost,
  loseExp,
  slotsFor,
  teamNeed,
  trainerLevel,
  trainerXp,
  winExp,
  xpFor,
} from './minigame.mjs'

test('xpFor follows 40·(L−1)^1.5 rounded', () => {
  assert.equal(xpFor(2), 40)
  assert.equal(xpFor(3), 113)
  assert.equal(xpFor(10), 1080)
  assert.equal(xpFor(30), 6247)
})

test('trainerLevel inverts the curve and caps at 30', () => {
  const at = (xp) => trainerLevel(xp)
  assert.equal(at(0), 1)
  assert.equal(at(39), 1)
  assert.equal(at(40), 2)
  assert.equal(at(112), 2)
  assert.equal(at(113), 3)
  assert.equal(at(6247), 30)
  assert.equal(at(1e6), 30)
})

test('slotsFor grows with level up to six', () => {
  assert.deepEqual(
    [1, 4, 5, 10, 25, 30].map(slotsFor),
    [1, 1, 2, 3, 6, 6],
  )
})

test('team rule: trainerLevel + 2·bond ≥ pokemonLevel', () => {
  assert.equal(
    canJoinTeam({ trainerLevel: 10, bond: 3, pokemonLevel: 16 }),
    true,
  )
  assert.equal(
    canJoinTeam({ trainerLevel: 10, bond: 3, pokemonLevel: 17 }),
    false,
  )
  assert.equal(teamNeed(3, 17), 11)
})

test('exp rewards', () => {
  assert.equal(winExp({ d: 2, bond: 4, remainingS: 150 }), 13)
  assert.equal(winExp({ d: 1, bond: 1, remainingS: 0 }), 6)
  assert.equal(loseExp({ d: 2, bond: 4 }), 3)
  assert.equal(winExp({ d: 1, bond: 1, remainingS: 0, combo: 0.1 }), 7)
})

test('care cost and trainer xp', () => {
  assert.deepEqual(careCost(true, 2), { hunger: 16, clean: 8, fun: 10 })
  assert.deepEqual(careCost(false, 3), { hunger: 36, clean: 18, fun: 24 })
  assert.equal(trainerXp(true, 3), 30)
  assert.equal(trainerXp(false, 1), 3)
})

test('only a pokémon that is not hungry can play', () => {
  assert.equal(canPlay(40), true)
  assert.equal(canPlay(39.99), false)
})

test('bondOf is the care level and constants are plain JSON', () => {
  assert.equal(bondOf(0), 1)
  assert.equal(bondOf(10), 2)
  assert.deepEqual(JSON.parse(JSON.stringify(MINIGAME)), MINIGAME)
})
