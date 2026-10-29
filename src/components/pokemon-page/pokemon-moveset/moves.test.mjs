import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getMoveVersions, filterMoves, getMoveMethods } from './moves.mjs'
const detail = (version, id, method, level = 0) => ({
  version_group: {
    name: version,
    url: `https://pokeapi.co/api/v2/version-group/${id}/`,
  },
  move_learn_method: { name: method },
  level_learned_at: level,
})
const moves = [
  {
    move: { name: 'solar-beam' },
    version_group_details: [
      detail('red-blue', 1, 'machine'),
      detail('scarlet-violet', 25, 'machine'),
    ],
  },
  {
    move: { name: 'tackle' },
    version_group_details: [
      detail('scarlet-violet', 25, 'level-up', 1),
      detail('scarlet-violet', 25, 'machine'),
    ],
  },
  {
    move: { name: 'old-move' },
    version_group_details: [detail('red-blue', 1, 'level-up', 4)],
  },
]

test('versions are unique and newest available first', () => {
  assert.deepEqual(
    getMoveVersions(moves).map((v) => v.value),
    ['scarlet-violet', 'red-blue']
  )
})
test('selected game excludes historical-only moves', () => {
  assert.deepEqual(
    filterMoves(moves, { version: 'scarlet-violet' }).map(
      (x) => x.entry.move.name
    ),
    ['tackle', 'solar-beam']
  )
  assert.deepEqual(filterMoves(moves, { version: 'missing' }), [])
})
test('method filtering recognizes every learning route in the selected game', () => {
  const result = filterMoves(moves, {
    version: 'scarlet-violet',
    method: 'level-up',
  })
  assert.deepEqual(
    result.map((x) => x.entry.move.name),
    ['tackle']
  )
  assert.equal(result[0].learning.label, 'Lv 1')
  assert.deepEqual(
    filterMoves(moves, { version: 'scarlet-violet', method: 'machine' }).map(
      (x) => x.entry.move.name
    ),
    ['solar-beam', 'tackle']
  )
})
test('local search matches displayed space-separated names without mutating API data', () => {
  assert.deepEqual(
    filterMoves(moves, { version: 'scarlet-violet', query: 'SOLAR BEAM' }).map(
      (x) => x.entry.move.name
    ),
    ['solar-beam']
  )
  assert.equal(moves[1].version_group_details.length, 2)
  assert.deepEqual(filterMoves([], { version: '' }), [])
})

test('late-added Japanese Gen 1 resource IDs do not outrank modern games', () => {
  const entries = [
    {
      move: { name: 'tackle' },
      version_group_details: [
        detail('scarlet-violet', 25, 'level-up', 1),
        detail('blue-japan', 29, 'machine'),
      ],
    },
  ]
  assert.equal(getMoveVersions(entries)[0].value, 'scarlet-violet')
})

test('available learning filters reflect the selected game, including Champions training', () => {
  const data = [
    {
      move: { name: 'tackle' },
      version_group_details: [
        detail('champions', 32, 'train'),
        detail('scarlet-violet', 25, 'level-up', 1),
      ],
    },
  ]
  assert.deepEqual(getMoveMethods(data, 'champions'), ['train'])
  assert.deepEqual(getMoveMethods(data, 'scarlet-violet'), ['level-up'])
})
