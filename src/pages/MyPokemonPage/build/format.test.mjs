import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildDiff,
  abilityLabel,
  starsFor,
  mergeLearnset,
  moveLockReason,
  NATURE_VI,
  statLabel,
  titleCase,
} from './format.mjs'

test('abilityLabel title-cases and marks hidden', () => {
  assert.equal(abilityLabel({ name: 'keen-eye', hidden: false }), 'Keen Eye')
  assert.equal(
    abilityLabel({ name: 'weak-armor', hidden: true }),
    'Weak Armor (hiếm)'
  )
})

test('natures and stat labels', () => {
  assert.equal(NATURE_VI.length, 25)
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(statLabel), [
    'HP',
    'Attack',
    'Defense',
    'Sp. Atk',
    'Sp. Def',
    'Speed',
  ])
  assert.equal(titleCase('swords-dance'), 'Swords Dance')
})

test('moveLockReason', () => {
  const build = { level: 20 }
  assert.equal(
    moveLockReason({ method: 'level-up', level: 36 }, build, {}, 0),
    'Cần cấp 36'
  )
  assert.equal(
    moveLockReason({ method: 'level-up', level: 20 }, build, {}, 0),
    null
  )
  const tm = { method: 'machine', item: 'tm-fire', move: 'flamethrower' }
  assert.equal(moveLockReason(tm, build, {}, 0), 'Cần TM Flamethrower')
  assert.equal(moveLockReason(tm, build, { 'tm-fire': 1 }, 0), null)
  for (const method of ['egg', 'tutor']) {
    assert.equal(
      moveLockReason({ method }, build, {}, 149),
      'Cần thân thiết cấp 6'
    )
    assert.equal(moveLockReason({ method }, build, {}, 150), null)
  }
})

test('mergeLearnset: one row per move, open first, nearest route when locked', () => {
  const learnset = [
    { move: 'ember', method: 'level-up', level: 30 },
    { move: 'ember', method: 'egg', level: 0 },
    { move: 'tackle', method: 'level-up', level: 1 },
    { move: 'flamethrower', method: 'machine', item: 'tm-fire', level: 0 },
  ]
  const rows = mergeLearnset(
    learnset,
    { tackle: { type: 'normal', power: 40, pp: 35 } },
    { level: 10 },
    {},
    150
  )
  assert.deepEqual(
    rows.map((r) => [r.move, r.method, r.reason]),
    [
      ['tackle', 'level-up', null],
      ['ember', 'egg', null],
      ['flamethrower', 'machine', 'Cần TM Flamethrower'],
    ]
  )
  assert.equal(rows[0].power, 40)
})

test('starsFor: the build wins over the birth stars', () => {
  assert.equal(starsFor(null, 2), 2)
  assert.equal(starsFor({ stars: 4 }, 2), 4)
})

test('buildDiff: deltas per stat, EV, level and exp', () => {
  const a = {
    species: 25,
    level: 5,
    exp: 10,
    stats: [20, 10, 10, 10, 10, 10],
    ev: [0, 0, 0, 0, 0, 0],
  }
  const b = {
    ...a,
    level: 6,
    exp: 14,
    stats: [22, 10, 11, 10, 10, 10],
    ev: [4, 0, 0, 0, 0, 0],
  }
  assert.deepEqual(buildDiff(a, b), {
    level: 1,
    exp: 4,
    stats: [2, 0, 1, 0, 0, 0],
    ev: [4, 0, 0, 0, 0, 0],
  })
  assert.equal(buildDiff(a, a), null)
  assert.equal(buildDiff(null, b), null)
  assert.equal(buildDiff(a, { ...b, species: 26 }), null)
})
