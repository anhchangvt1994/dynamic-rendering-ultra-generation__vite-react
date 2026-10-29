import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  describeEvolution,
  flattenEvolution,
  idFromUrl,
  pickFlavorText,
  pickGenus,
} from './species.mjs'

const node = (name, id, details, ...children) => ({
  species: { name, url: `https://pokeapi.co/api/v2/pokemon-species/${id}/` },
  evolution_details: details ? [details] : [],
  evolves_to: children,
})
const level = (min_level) => ({ trigger: { name: 'level-up' }, min_level })

test('ids come from resource urls', () => {
  assert.equal(idFromUrl('https://pokeapi.co/api/v2/pokemon-species/445/'), 445)
  assert.equal(idFromUrl(''), 0)
})

test('a linear chain becomes one entry per stage with its condition', () => {
  const stages = flattenEvolution(
    node(
      'gible',
      443,
      null,
      node('gabite', 444, level(24), node('garchomp', 445, level(48)))
    )
  )
  assert.deepEqual(stages, [
    [{ name: 'gible', id: 443, condition: '' }],
    [{ name: 'gabite', id: 444, condition: 'Lv 24' }],
    [{ name: 'garchomp', id: 445, condition: 'Lv 48' }],
  ])
})

test('branches stay in the same stage', () => {
  const stone = (item) => ({
    trigger: { name: 'use-item' },
    item: { name: item },
  })
  const stages = flattenEvolution(
    node(
      'eevee',
      133,
      null,
      node('vaporeon', 134, stone('water-stone')),
      node('jolteon', 135, stone('thunder-stone'))
    )
  )
  assert.equal(stages.length, 2)
  assert.deepEqual(
    stages[1].map((s) => s.condition),
    ['Water Stone', 'Thunder Stone']
  )
})

test('conditions read naturally in Vietnamese', () => {
  assert.equal(describeEvolution({ trigger: { name: 'trade' } }), 'Trao đổi')
  assert.equal(
    describeEvolution({
      trigger: { name: 'level-up' },
      min_happiness: 220,
      time_of_day: 'night',
    }),
    'Thân thiết · ban đêm'
  )
  assert.equal(describeEvolution({ trigger: { name: 'level-up' } }), 'Lên cấp')
  assert.equal(describeEvolution({ trigger: { name: 'other' } }), 'Đặc biệt')
})

test('flavour text: newest English entry, whitespace cleaned', () => {
  const entries = [
    { language: { name: 'en' }, flavor_text: 'Old\fentry.' },
    { language: { name: 'ja' }, flavor_text: '新しい' },
    { language: { name: 'en' }, flavor_text: 'It flies at\nsonic speed.' },
  ]
  assert.equal(pickFlavorText(entries), 'It flies at sonic speed.')
  assert.equal(pickFlavorText([]), '')
})

test('genus prefers Vietnamese, then English', () => {
  assert.equal(
    pickGenus([{ language: { name: 'en' }, genus: 'Mach Pokémon' }]),
    'Mach Pokémon'
  )
})
