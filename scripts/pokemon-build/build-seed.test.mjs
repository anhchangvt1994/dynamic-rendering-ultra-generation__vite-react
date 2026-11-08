import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildSeed, machinesOf, parseSpecies } from './build-seed.mjs'

const stat = (name, base_stat) => ({ stat: { name }, base_stat })
const pokemon = (id) => ({
  id,
  stats: [
    stat('hp', 10),
    stat('attack', 20),
    stat('defense', 30),
    stat('special-attack', 40),
    stat('special-defense', 50),
    stat('speed', 60),
  ],
  abilities: [
    { ability: { name: 'weak-armor' }, is_hidden: true, slot: 3 },
    { ability: { name: 'keen-eye' }, is_hidden: false, slot: 1 },
  ],
  moves: [
    {
      move: { name: 'tackle' },
      version_group_details: [
        { level_learned_at: 9, move_learn_method: { name: 'level-up' } },
        { level_learned_at: 4, move_learn_method: { name: 'level-up' } },
        { level_learned_at: 0, move_learn_method: { name: 'form-change' } },
      ],
    },
    {
      move: { name: 'surf' },
      version_group_details: [
        { level_learned_at: 0, move_learn_method: { name: 'machine' } },
      ],
    },
  ],
})
const species = (id, growth = 'slow-then-very-fast', rate = -1) => ({
  id,
  growth_rate: { name: growth },
  gender_rate: rate,
})
const mv = {
  type: { name: 'normal' },
  power: 40,
  accuracy: 100,
  pp: 35,
  damage_class: { name: 'physical' },
}

test('parseSpecies: stats in order, abilities by slot, min level, known methods only', () => {
  const p = parseSpecies(7, species(7), pokemon(7))
  assert.deepEqual(p.stats, [10, 20, 30, 40, 50, 60])
  assert.equal(p.growth, 'erratic')
  assert.deepEqual(
    p.abilities.map((a) => a.name),
    ['keen-eye', 'weak-armor']
  )
  assert.deepEqual(
    p.learn.find((l) => l.move === 'tackle'),
    { move: 'tackle', method: 'level-up', level: 4 }
  )
  assert.equal(p.learn.length, 2)
})

test('parseSpecies: rejects an unknown growth rate and a species without an ability', () => {
  assert.throws(
    () => parseSpecies(7, species(7, 'weird'), pokemon(7)),
    /growth/
  )
  const none = { ...pokemon(7), abilities: [] }
  assert.throws(() => parseSpecies(7, species(7), none), /no ability/)
})

test('parseSpecies: moves no known method explains are a payload change, not an empty learnset', () => {
  const odd = {
    ...pokemon(7),
    moves: [
      {
        move: { name: 'tackle' },
        version_group_details: [
          { level_learned_at: 1, move_learning_method: { name: 'level-up' } },
        ],
      },
    ],
  }
  assert.throws(() => parseSpecies(7, species(7), odd), /known method/)
})

test('machinesOf: slug of the item move', () => {
  const rows = machinesOf([
    { id: 'tm-fire', move: { name: 'Flamethrower' } },
    { id: 'x' },
    { id: 'tm-bb', move: { name: 'Hyper Beam' } },
  ])
  assert.deepEqual(rows, [
    ['tm-fire', 'flamethrower'],
    ['tm-bb', 'hyper-beam'],
  ])
})

test('buildSeed: idempotent inserts for every table; a missing TM move fails the build', () => {
  const data = {
    species: new Map([[7, species(7)]]),
    pokemon: new Map([[7, pokemon(7)]]),
    moves: new Map([
      ['tackle', mv],
      ['surf', mv],
      ['flamethrower', mv],
    ]),
  }
  const sql = buildSeed(data, {
    ids: [7],
    machines: [['tm-fire', 'flamethrower']],
  })
  assert.match(
    sql,
    /insert into public\.pokemon_species_base[\s\S]*\(7, 10, 20, 30, 40, 50, 60, 'erratic', -1, '/
  )
  assert.match(sql, /\(7, 'tackle', 'level-up', 4\)/)
  assert.match(sql, /\(7, 'surf', 'machine', 0\)/)
  assert.match(sql, /\('tm-fire', 'flamethrower'\)/)
  assert.equal((sql.match(/on conflict/g) ?? []).length, 4)
  assert.throws(
    () => buildSeed(data, { ids: [7], machines: [['tm-x', 'hyper-beam']] }),
    /missing move hyper-beam/
  )
})
