import assert from 'node:assert/strict'
import { test } from 'node:test'
import { VIBE_VERSION, isSpeciesId, vibeOf } from './vibe.ts'

const en = { name: 'en' }
const species = (o = {}) => ({
  id: 9999,
  is_baby: false,
  is_legendary: false,
  is_mythical: false,
  habitat: null,
  shape: null,
  egg_groups: [],
  genera: [],
  flavor_text_entries: [],
  ...o,
})
const pokemon = (types = [], stats = {}) => ({
  types: types.map((name) => ({ type: { name } })),
  stats: Object.entries({
    hp: 60,
    attack: 60,
    defense: 60,
    'special-attack': 60,
    'special-defense': 60,
    speed: 60,
    ...stats,
  }).map(([name, base_stat]) => ({ base_stat, stat: { name } })),
})
const flavor = (...texts) =>
  texts.map((flavor_text) => ({ flavor_text, language: en }))

test('a species id is an integer 1..1025', () => {
  assert.equal(isSpeciesId('25'), true)
  assert.equal(isSpeciesId('1025'), true)
  assert.equal(isSpeciesId('0'), false)
  assert.equal(isSpeciesId('1026'), false)
  assert.equal(isSpeciesId('2.5'), false)
  assert.equal(isSpeciesId('../1'), false)
  assert.equal(VIBE_VERSION, 1)
})

test('the famous five follow the overrides', () => {
  const cases = {
    25: 'cute',
    6: 'cool',
    94: 'mystic',
    130: 'fierce',
    1: 'nature',
  }
  for (const [id, vibe] of Object.entries(cases))
    assert.equal(
      vibeOf(species({ id: +id }), pokemon(['normal'])).vibe,
      vibe,
      id
    )
})

test('a forest grass bug is nature', () => {
  const r = vibeOf(
    species({ habitat: { name: 'forest' }, egg_groups: [{ name: 'bug' }] }),
    pokemon(['grass', 'bug'])
  )
  assert.equal(r.vibe, 'nature')
})

test('a fairy baby is cute', () => {
  const r = vibeOf(
    species({ is_baby: true, egg_groups: [{ name: 'fairy' }] }),
    pokemon(['fairy'], { attack: 30, defense: 30, hp: 40 })
  )
  assert.equal(r.vibe, 'cute')
})

test('a legendary psychic is mystic', () => {
  const r = vibeOf(species({ is_legendary: true }), pokemon(['psychic']))
  assert.equal(r.vibe, 'mystic')
})

test('a hard-hitting poison dark monster is fierce', () => {
  const r = vibeOf(
    species({ egg_groups: [{ name: 'monster' }] }),
    pokemon(['poison', 'dark'], { attack: 120 })
  )
  assert.equal(r.vibe, 'fierce')
})

test('a fast fire flyer is cool', () => {
  const r = vibeOf(species(), pokemon(['fire', 'flying'], { speed: 105 }))
  assert.equal(r.vibe, 'cool')
})

test('genus and flavor keywords count, flavor capped at 3', () => {
  const words = flavor(
    'It lives in the forest among flowers and leaves.',
    'Its seed grows into a tree; moss and pollen cover its garden.'
  )
  const r = vibeOf(species({ flavor_text_entries: words }), pokemon([]))
  assert.equal(r.scores.nature, 3)
  const g = vibeOf(
    species({ genera: [{ genus: 'Mysterious Pokémon', language: en }] }),
    pokemon([])
  )
  assert.equal(g.scores.mystic, 1)
  assert.equal(g.vibe, 'mystic')
  const other = vibeOf(
    species({
      flavor_text_entries: [
        { flavor_text: 'forest forest', language: { name: 'fr' } },
      ],
    }),
    pokemon([])
  )
  assert.equal(other.scores.nature, 0, 'only English text counts')
})

test('a tie breaks cute, cool, fierce, mystic, nature', () => {
  assert.equal(vibeOf(species(), pokemon([])).vibe, 'cute')
  const r = vibeOf(species(), pokemon(['water']))
  assert.deepEqual([r.scores.nature, r.scores.cool], [1, 0.5])
  assert.equal(r.vibe, 'nature')
  const t = vibeOf(species(), pokemon(['fighting']))
  assert.equal(t.scores.cool, t.scores.fierce)
  assert.equal(t.vibe, 'cool')
})

test('missing or odd fields never throw', () => {
  assert.equal(vibeOf({}, {}).vibe, 'cute')
  assert.equal(vibeOf(null, null).vibe, 'cute')
  const r = vibeOf(
    species({ egg_groups: null, genera: [{}], flavor_text_entries: [{}] }),
    { types: [{}], stats: [{}] }
  )
  assert.ok(Object.values(r.scores).every(Number.isFinite))
})
