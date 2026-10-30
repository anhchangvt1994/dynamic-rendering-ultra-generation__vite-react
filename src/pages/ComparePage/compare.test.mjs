import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  bestHit,
  compareStats,
  formatMultiplier,
  hitLabel,
  readComparePair,
  statsOf,
} from './compare.mjs'

const mon = (...values) => ({
  stats: [
    'hp',
    'attack',
    'defense',
    'special-attack',
    'special-defense',
    'speed',
  ].map((name, i) => ({ stat: { name }, base_stat: values[i] })),
})

test('stats read in a fixed order, missing as 0', () => {
  assert.deepEqual(
    Object.values(statsOf(mon(1, 2, 3, 4, 5, 6))),
    [1, 2, 3, 4, 5, 6]
  )
  assert.deepEqual(Object.values(statsOf({})), [0, 0, 0, 0, 0, 0])
})

test('rows know who leads; totals and wins add up', () => {
  // Garchomp vs Salamence
  const result = compareStats(
    mon(108, 130, 95, 80, 85, 102),
    mon(95, 135, 80, 110, 80, 100)
  )
  assert.equal(result.totalA, 600)
  assert.equal(result.totalB, 600)
  assert.deepEqual(
    result.rows.map((r) => r.lead),
    ['a', 'b', 'a', 'b', 'a', 'a']
  )
  assert.equal(result.winsA, 4)
  assert.equal(result.winsB, 2)
  assert.equal(
    compareStats(mon(1, 1, 1, 1, 1, 1), mon(1, 1, 1, 1, 1, 1)).rows[0].lead,
    'tie'
  )
})

test('only clean slugs are read from the URL', () => {
  assert.deepEqual(readComparePair('?a=garchomp&b=mr-mime'), {
    a: 'garchomp',
    b: 'mr-mime',
  })
  assert.deepEqual(readComparePair('?a=<script>&b='), { a: '', b: '' })
})

const typeOf = (weak = [], resist = [], immune = []) => ({
  damage_relations: {
    double_damage_from: weak.map((name) => ({ name })),
    half_damage_from: resist.map((name) => ({ name })),
    no_damage_from: immune.map((name) => ({ name })),
  },
})

test('best hit takes the strongest of the attacker’s own types', () => {
  // Salamence (dragon/flying) defending: ice ×4, ground ×0
  const dragon = typeOf(
    ['ice', 'dragon', 'fairy'],
    ['fire', 'water', 'grass', 'electric']
  )
  const flying = typeOf(
    ['electric', 'ice', 'rock'],
    ['grass', 'fighting', 'bug'],
    ['ground']
  )
  assert.deepEqual(bestHit(['dragon', 'ground'], [dragon, flying]), {
    type: 'dragon',
    multiplier: 2,
  })
  assert.deepEqual(bestHit(['ground'], [dragon, flying]), {
    type: 'ground',
    multiplier: 0,
  })
  assert.equal(bestHit(['ice'], [dragon, flying]).multiplier, 4)
})

test('best hit waits for the defender’s types', () => {
  assert.equal(bestHit(['fire'], []), null)
  assert.equal(bestHit([], [typeOf()]), null)
})

test('multipliers read as words and fractions', () => {
  assert.equal(hitLabel(4), 'Cực kỳ hiệu quả')
  assert.equal(hitLabel(0.25), 'Kém hiệu quả')
  assert.equal(hitLabel(0), 'Không tác dụng')
  assert.equal(formatMultiplier(0.5), '×½')
  assert.equal(formatMultiplier(4), '×4')
})
