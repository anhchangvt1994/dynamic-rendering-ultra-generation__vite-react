import assert from 'node:assert/strict'
import test from 'node:test'
import { itemsOf, parseChain, ROW_COLUMNS } from './build-seed.mjs'

const sp = (id, name = `s${id}`) => ({
  name,
  url: `https://pokeapi.co/api/v2/pokemon-species/${id}/`,
})
const named = (name) => ({ name, url: `https://pokeapi.co/api/v2/x/${name}/` })
const detail = (trigger, extra = {}) => ({
  trigger: named(trigger),
  min_level: null,
  item: null,
  held_item: null,
  known_move: null,
  known_move_type: null,
  location: null,
  min_affection: null,
  min_beauty: null,
  min_happiness: null,
  time_of_day: '',
  gender: null,
  party_species: null,
  party_type: null,
  relative_physical_stats: null,
  trade_species: null,
  needs_overworld_rain: false,
  turn_upside_down: false,
  min_steps: null,
  ...extra,
})
const chain = (from, to, details) => ({
  id: 1,
  chain: {
    species: sp(from),
    evolution_details: [],
    evolves_to: [{ species: sp(to), evolution_details: details, evolves_to: [] }],
  },
})
const one = (details, from = 1, to = 2) => parseChain(chain(from, to, details))

test('plain level-up', () => {
  const rows = one([detail('level-up', { min_level: 16 })], 4, 5)
  assert.equal(rows.length, 1)
  assert.deepEqual(
    {
      from: rows[0].from,
      to: rows[0].to,
      trigger: rows[0].trigger,
      minLevel: rows[0].minLevel,
      unavailable: rows[0].unavailable,
    },
    { from: 4, to: 5, trigger: 'level-up', minLevel: 16, unavailable: null }
  )
})

test('walks nested evolves_to', () => {
  const rows = parseChain({
    id: 2,
    chain: {
      species: sp(1),
      evolves_to: [
        {
          species: sp(2),
          evolution_details: [detail('level-up', { min_level: 16 })],
          evolves_to: [
            {
              species: sp(3),
              evolution_details: [detail('level-up', { min_level: 32 })],
              evolves_to: [],
            },
          ],
        },
      ],
    },
  })
  assert.deepEqual(rows.map((r) => [r.from, r.to]), [[1, 2], [2, 3]])
})

test('alternatives are separate alts', () => {
  const rows = one([
    detail('level-up', { min_happiness: 220, time_of_day: 'day' }),
    detail('level-up', { min_happiness: 220, time_of_day: 'night' }),
  ])
  assert.deepEqual(rows.map((r) => r.alt), [0, 1])
  assert.deepEqual(rows.map((r) => r.timeOfDay), ['day', 'night'])
})

test('plain trade becomes linking-cord', () => {
  const [r] = one([detail('trade')])
  assert.equal(r.trigger, 'use-item')
  assert.equal(r.item, 'linking-cord')
  assert.equal(r.unavailable, null)
})

test('trade with held item uses that item', () => {
  const [r] = one([detail('trade', { held_item: named('metal-coat') })])
  assert.equal(r.trigger, 'use-item')
  assert.equal(r.item, 'metal-coat')
})

test('trade for a species', () => {
  const [r] = one([detail('trade', { trade_species: sp(588) })])
  assert.equal(r.item, 'linking-cord')
  assert.equal(r.tradeSpecies, 588)
})

test('use-item keeps the item and its modifiers', () => {
  const [r] = one([
    detail('use-item', { item: named('dawn-stone'), gender: 2 }),
  ])
  assert.equal(r.trigger, 'use-item')
  assert.equal(r.item, 'dawn-stone')
  assert.equal(r.gender, 2)
})

test('level-up with a held item is unavailable', () => {
  const [r] = one([
    detail('level-up', { held_item: named('oval-stone'), time_of_day: 'day' }),
  ])
  assert.equal(r.unavailable, 'held-item')
  assert.equal(r.item, null)
})

test('unsupported conditions are unavailable, never thrown', () => {
  const code = (d) => one([d])[0].unavailable
  assert.equal(code(detail('three-critical-hits')), 'battle')
  assert.equal(code(detail('take-damage')), 'battle')
  assert.equal(code(detail('recoil-damage')), 'battle')
  assert.equal(code(detail('use-move')), 'battle')
  assert.equal(code(detail('level-up', { min_damage_taken: 49 })), 'battle')
  assert.equal(code(detail('level-up', { min_move_count: 20 })), 'battle')
  assert.equal(code(detail('level-up', { min_steps: 1000 })), 'steps')
  assert.equal(code(detail('level-up', { needs_overworld_rain: true })), 'rain')
  assert.equal(code(detail('level-up', { turn_upside_down: true })), 'upside-down')
  assert.equal(code(detail('level-up', { region: named('alola') })), 'region')
  assert.equal(code(detail('level-up', { party_type: named('dark') })), 'other')
  assert.equal(code(detail('shed')), 'other')
  assert.equal(code(detail('totally-new-trigger')), 'other')
})

test('gender, stats, move and location map through', () => {
  const [r] = one([
    detail('level-up', {
      min_level: 20,
      gender: 1,
      relative_physical_stats: -1,
      known_move: named('mimic'),
      known_move_type: named('fairy'),
      location: named('mt-coronet'),
      party_species: sp(223),
    }),
  ])
  assert.equal(r.gender, 1)
  assert.equal(r.relativeStats, -1)
  assert.equal(r.knownMove, 'mimic')
  assert.equal(r.knownMoveType, 'fairy')
  assert.equal(r.location, 'mt-coronet')
  assert.equal(r.partySpecies, 223)
})

test('affection, beauty and happiness map through', () => {
  const [r] = one([
    detail('level-up', { min_affection: 2, min_beauty: 170, min_happiness: 220 }),
  ])
  assert.equal(r.minAffection, 2)
  assert.equal(r.minBeauty, 170)
  assert.equal(r.minHappiness, 220)
})

test('evolutions without details (breeding) produce no row', () => {
  assert.deepEqual(one([]), [])
})

test('version-grouped details keep only the default ones', () => {
  const rows = one([
    detail('level-up', { location: named('eterna-forest'), version_group: named('diamond-pearl'), near_special_rock: true }),
    detail('use-item', { item: named('leaf-stone'), version_group: named('sword-shield'), is_default: true, required_pokemon_form: named('eevee') }),
  ])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].item, 'leaf-stone')
  assert.equal(rows[0].unavailable, null)
})

test('without a default every detail is kept; version noise is ignored', () => {
  const rows = one([
    detail('level-up', { min_level: 30, version_group: named('x-y') }),
    detail('level-up', { min_level: 32, version_group: named('sun-moon') }),
  ])
  assert.deepEqual(rows.map((r) => [r.minLevel, r.unavailable]), [[30, null], [32, null]])
})

test('new unsupported keys are unavailable', () => {
  const code = (d) => one([d])[0].unavailable
  assert.equal(code(detail('level-up', { near_special_rock: true })), 'other')
  assert.equal(code(detail('level-up', { used_move: named('rage-fist') })), 'battle')
  assert.equal(code(detail('level-up', { allowed_natures: [named('low-key')] })), 'other')
})

test('regional-form evolutions are unavailable', () => {
  const rows = one([
    detail('level-up', { min_level: 20, is_default: true }),
    detail('level-up', { min_level: 20, time_of_day: 'night', is_default: true, required_pokemon_form: named('rattata-alola'), evolved_pokemon_form: named('raticate-alola') }),
  ])
  assert.deepEqual(rows.map((r) => r.unavailable), [null, 'region'])
})

test('malformed data fails loudly', () => {
  assert.throws(() => parseChain({ id: 1 }), /pokemon-evolution seed/)
  assert.throws(
    () => one([{ ...detail('level-up'), trigger: null }]),
    /pokemon-evolution seed/
  )
})

test('itemsOf lists distinct items', () => {
  const rows = [
    ...one([detail('trade')]),
    ...one([detail('use-item', { item: named('fire-stone') })]),
    ...one([detail('trade')]),
    ...one([detail('level-up', { min_level: 5 })]),
  ]
  assert.deepEqual(itemsOf(rows).sort(), ['fire-stone', 'linking-cord'])
})

test('ROW_COLUMNS covers every table column', () => {
  assert.ok(ROW_COLUMNS.includes('from_species'))
  assert.ok(ROW_COLUMNS.includes('unavailable'))
})
