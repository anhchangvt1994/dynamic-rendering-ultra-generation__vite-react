import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getPokemonPower, POWER_TIERS } from './power.mjs'

const stats = (...values) =>
  ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'].map(
    (name, index) => ({ stat: { name }, base_stat: values[index] })
  )

test('BST is the sum of the six base stats', () => {
  assert.equal(getPokemonPower(stats(80, 100, 80, 100, 80, 100)).bst, 540)
})

test('tier boundaries are inclusive at the lower bound', () => {
  for (const [level, tier] of POWER_TIERS.entries()) {
    const atMin = getPokemonPower(stats(tier.min, 0, 0, 0, 0, 0))
    assert.equal(atMin.rank, tier.rank)
    assert.equal(atMin.level, level)
    if (level) {
      const below = getPokemonPower(stats(tier.min - 1, 0, 0, 0, 0, 0))
      assert.equal(below.rank, POWER_TIERS[level - 1].rank)
    }
  }
})

test('real Pokémon land in the expected tiers', () => {
  // Pikachu 320, Garchomp 600, Mewtwo 680, Eternamax Eternatus 1125
  assert.equal(getPokemonPower(stats(35, 55, 40, 50, 50, 90)).rank, 'D')
  assert.equal(getPokemonPower(stats(108, 130, 95, 80, 85, 102)).rank, 'SS')
  assert.equal(getPokemonPower(stats(106, 110, 90, 154, 90, 130)).rank, 'SSS')
  assert.equal(getPokemonPower(stats(255, 115, 250, 125, 250, 130)).rank, 'EX')
})

test('progress inside the current tier', () => {
  assert.equal(getPokemonPower(stats(35, 55, 40, 50, 50, 90)).progress, 0.2)
  assert.equal(getPokemonPower(stats(255, 115, 250, 125, 250, 130)).progress, 1)
})

test('missing or empty stats are a safe F', () => {
  const empty = getPokemonPower([])
  assert.equal(empty.bst, 0)
  assert.equal(empty.rank, 'F')
  assert.equal(getPokemonPower([{ stat: { name: 'hp' } }]).bst, 0)
})
