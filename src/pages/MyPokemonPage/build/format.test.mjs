import assert from 'node:assert/strict'
import test from 'node:test'
import {
  abilityLabel,
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
