import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  formatHeight,
  formatWeight,
  getMoveLearning,
  sortMoves,
  statLabel,
  titleCase,
} from './format.mjs'

const move = (name, ...details) => ({
  move: { name },
  version_group_details: details.map(([method, level = 0]) => ({
    move_learn_method: { name: method },
    level_learned_at: level,
  })),
})

test('kebab-case names become readable titles', () => {
  assert.equal(titleCase('swords-dance'), 'Swords Dance')
  assert.equal(titleCase('sand-veil'), 'Sand Veil')
  assert.equal(titleCase(''), '')
})

test('height and weight are converted from PokéAPI units', () => {
  // Garchomp: 19 dm, 950 hg
  assert.equal(formatHeight(19), '1,9 m')
  assert.equal(formatWeight(950), '95 kg')
  assert.equal(formatWeight(65), '6,5 kg')
  assert.equal(formatHeight(undefined), '—')
})

test('stat names get their usual short labels', () => {
  assert.equal(statLabel('hp'), 'HP')
  assert.equal(statLabel('special-attack'), 'Sp. Atk')
})

test('learning uses the latest game, not the first one', () => {
  // learned by TM in Red/Blue, by level 37 in the latest game
  assert.equal(
    getMoveLearning(move('double-edge', ['machine'], ['level-up', 37])).label,
    'Lv 37'
  )
  assert.equal(getMoveLearning(move('surf', ['machine'])).label, 'TM')
  assert.equal(getMoveLearning(move('outrage', ['egg'])).label, 'Trứng')
  assert.equal(
    getMoveLearning(move('dual-chop', ['level-up', 0])).label,
    'Tiến hóa'
  )
  assert.equal(
    getMoveLearning(move('odd', ['stadium-surfing-pikachu'])).label,
    'Khác'
  )
})

test('moves sort by level-up level, then TM, egg and tutor', () => {
  const sorted = sortMoves([
    move('surf', ['machine']),
    move('bite', ['level-up', 27]),
    move('tackle', ['level-up', 1]),
    move('outrage', ['egg']),
    move('aqua-tail', ['machine']),
    { move: {} },
  ]).map(({ entry }) => entry.move.name)
  assert.deepEqual(sorted, ['tackle', 'bite', 'aqua-tail', 'surf', 'outrage'])
})
