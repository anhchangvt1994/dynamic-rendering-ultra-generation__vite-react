import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getDefenses } from './effectiveness.mjs'

const relations = (weak = [], resist = [], immune = []) => ({
  damage_relations: {
    double_damage_from: weak.map((name) => ({ name })),
    half_damage_from: resist.map((name) => ({ name })),
    no_damage_from: immune.map((name) => ({ name })),
  },
})
const factor = (result, type) =>
  result.find((item) => item.name === type)?.multiplier

test('dual typing multiplies weakness and resistance, including cancellation', () => {
  const grass = relations(
    ['fire', 'ice', 'poison', 'flying', 'bug'],
    ['water', 'electric', 'grass', 'ground']
  )
  const poison = relations(
    ['ground', 'psychic'],
    ['grass', 'fighting', 'poison', 'bug', 'fairy']
  )
  const result = getDefenses([grass, poison])
  assert.equal(factor(result, 'fire'), 2)
  assert.equal(factor(result, 'grass'), 0.25)
  assert.equal(factor(result, 'ground'), 1)
  assert.equal(factor(result, 'poison'), 1)
  assert.equal(factor(result, 'bug'), 1)
})

test('double weaknesses are 4x and immunity dominates a second weakness', () => {
  const fire = relations(
    ['water', 'ground', 'rock'],
    ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy']
  )
  const flying = relations(
    ['electric', 'ice', 'rock'],
    ['grass', 'fighting', 'bug'],
    ['ground']
  )
  const result = getDefenses([fire, flying])
  assert.equal(factor(result, 'rock'), 4)
  assert.equal(factor(result, 'ground'), 0)
  assert.equal(factor(result, 'ice'), 1)
})

test('single normal typing is immune to ghost and weak to fighting', () => {
  const result = getDefenses([relations(['fighting'], [], ['ghost'])])
  assert.equal(factor(result, 'ghost'), 0)
  assert.equal(factor(result, 'fighting'), 2)
  assert.equal(result.length, 18)
})

test('incomplete dual-type data never reports a misleading partial chart', () => {
  assert.deepEqual(getDefenses([relations(['fire']), undefined]), [])
  assert.deepEqual(getDefenses([]), [])
})

test('Water/Flying has 4x Electric and malformed relation payloads stay unavailable', () => {
  const result = getDefenses([
    relations(['electric', 'grass'], ['fire', 'water', 'ice', 'steel']),
    relations(
      ['electric', 'ice', 'rock'],
      ['grass', 'fighting', 'bug'],
      ['ground']
    ),
  ])
  assert.equal(factor(result, 'electric'), 4)
  assert.deepEqual(getDefenses([{ damage_relations: {} }]), [])
})
