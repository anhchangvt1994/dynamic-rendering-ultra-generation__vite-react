import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  describeEvolution,
  getEvolutionStages,
  getEvolutionArtwork,
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

test('evolution keeps item identities so stones and held items can render sprites', () => {
  const chain = flattenEvolution(
    node(
      'pikachu',
      25,
      null,
      node('raichu', 26, {
        trigger: { name: 'use-item' },
        item: { name: 'thunder-stone' },
      })
    )
  )
  assert.deepEqual(chain[1][0].items, [
    { name: 'thunder-stone', label: 'Thunder Stone' },
  ])
  const trade = flattenEvolution(
    node(
      'onix',
      95,
      null,
      node('steelix', 208, {
        trigger: { name: 'trade' },
        held_item: { name: 'metal-coat' },
      })
    )
  )
  assert.deepEqual(trade[1][0].items, [
    { name: 'metal-coat', label: 'Metal Coat' },
  ])
})

test('stone methods remain visible when the API lists an older location method first', () => {
  const child = node('leafeon', 470, {
    trigger: { name: 'level-up' },
    location: { name: 'eterna-forest' },
  })
  child.evolution_details.push({
    trigger: { name: 'use-item' },
    item: { name: 'leaf-stone' },
  })
  const stages = flattenEvolution(node('eevee', 133, null, child))
  assert.equal(stages[1][0].condition, 'Leaf Stone')
  assert.equal(stages[1][0].items[0].name, 'leaf-stone')
})

const meowthFamily = () => {
  const persian = node('persian', 53, level(28))
  persian.evolution_details.push({
    trigger: { name: 'level-up' },
    min_happiness: 160,
    required_pokemon_form: { name: 'meowth-alola' },
    evolved_pokemon_form: { name: 'persian-alola' },
  })
  return node(
    'meowth',
    52,
    null,
    persian,
    node('perrserker', 863, {
      ...level(28),
      required_pokemon_form: { name: 'meowth-galar' },
    })
  )
}

test('Perrserker ancestry selects Galarian Meowth and excludes unrelated Persian', () => {
  const stages = getEvolutionStages(meowthFamily(), {
    speciesId: 863,
    pokemonName: 'perrserker',
  })
  assert.deepEqual(
    stages.map((stage) => stage.map((mon) => [mon.name, mon.form || ''])),
    [[['meowth', 'meowth-galar']], [['perrserker', '']]]
  )
  assert.equal(stages[1][0].condition, 'Lv 28')
})

test('regional Persian and ordinary Meowth stay on their own evolution routes', () => {
  const alola = getEvolutionStages(meowthFamily(), {
    speciesId: 53,
    pokemonName: 'persian-alola',
  })
  assert.equal(alola[0][0].form, 'meowth-alola')
  assert.equal(alola[1][0].form, 'persian-alola')
  const ordinary = getEvolutionStages(meowthFamily(), {
    speciesId: 52,
    pokemonName: 'meowth',
  })
  assert.deepEqual(
    ordinary.map((stage) => stage.map((mon) => mon.name)),
    [['meowth'], ['persian']]
  )
})

test('Eevee keeps all branches while an evolved member shows its own lineage', () => {
  const root = node(
    'eevee',
    133,
    null,
    node('vaporeon', 134, {
      trigger: { name: 'use-item' },
      item: { name: 'water-stone' },
    }),
    node('jolteon', 135, {
      trigger: { name: 'use-item' },
      item: { name: 'thunder-stone' },
    })
  )
  assert.equal(
    getEvolutionStages(root, { speciesId: 133, pokemonName: 'eevee' })[1]
      .length,
    2
  )
  assert.deepEqual(
    getEvolutionStages(root, { speciesId: 135, pokemonName: 'jolteon' }).map(
      (stage) => stage.map((mon) => mon.name)
    ),
    [['eevee'], ['jolteon']]
  )
})

const zigzagoonFamily = () => {
  const linoone = node(
    'linoone',
    264,
    level(20),
    node('obstagoon', 862, {
      ...level(35),
      time_of_day: 'night',
      required_pokemon_form: { name: 'linoone-galar' },
    })
  )
  linoone.evolution_details.push({
    ...level(20),
    required_pokemon_form: { name: 'zigzagoon-galar' },
    evolved_pokemon_form: { name: 'linoone-galar' },
  })
  return node('zigzagoon', 263, null, linoone)
}

test('ordinary Zigzagoon stops at ordinary Linoone, never Obstagoon', () => {
  const stages = getEvolutionStages(zigzagoonFamily(), {
    speciesId: 263,
    pokemonName: 'zigzagoon',
    isDefault: true,
  })
  assert.deepEqual(
    stages.map((stage) => stage.map((mon) => [mon.name, mon.form || ''])),
    [[['zigzagoon', '']], [['linoone', '']]]
  )
})

test('Galar Zigzagoon keeps both regional predecessors through Obstagoon', () => {
  const stages = getEvolutionStages(zigzagoonFamily(), {
    speciesId: 862,
    pokemonName: 'obstagoon',
    isDefault: true,
  })
  assert.deepEqual(
    stages.map((stage) => stage.map((mon) => [mon.name, mon.form || ''])),
    [
      [['zigzagoon', 'zigzagoon-galar']],
      [['linoone', 'linoone-galar']],
      [['obstagoon', '']],
    ]
  )
  assert.equal(stages[2][0].condition, 'Lv 35 · ban đêm')
})

test('default names containing a form suffix still match their species route', () => {
  const chain = node('burmy', 412, null, node('wormadam', 413, level(20)))
  assert.equal(
    getEvolutionStages(chain, {
      speciesId: 413,
      pokemonName: 'wormadam-plant',
      isDefault: true,
    }).length,
    2
  )
})

test('cosmetic form identifiers match the Pokémon owning those forms', () => {
  const chain = node(
    'shellos',
    422,
    null,
    node('gastrodon', 423, {
      ...level(30),
      required_pokemon_form: { name: 'shellos-west' },
      evolved_pokemon_form: { name: 'gastrodon-west' },
    })
  )
  const base = getEvolutionStages(chain, {
    speciesId: 422,
    pokemonName: 'shellos',
    isDefault: true,
    formNames: ['shellos-west'],
  })
  const evolved = getEvolutionStages(chain, {
    speciesId: 423,
    pokemonName: 'gastrodon',
    isDefault: true,
    formNames: ['gastrodon-west'],
  })
  assert.equal(base.length, 2)
  assert.equal(evolved.length, 2)
  assert.equal(base[0][0].form, 'shellos-west')
  assert.equal(evolved[1][0].form, 'gastrodon-west')
})

test('Burmy cosmetic plant form remains a valid predecessor for Wormadam', () => {
  const chain = node(
    'burmy',
    412,
    null,
    node('wormadam', 413, {
      ...level(20),
      required_pokemon_form: { name: 'burmy-plant' },
      evolved_pokemon_form: { name: 'wormadam-plant' },
    })
  )
  const stages = getEvolutionStages(chain, {
    speciesId: 412,
    pokemonName: 'burmy',
    isDefault: true,
    formNames: ['burmy-plant', 'burmy-sandy', 'burmy-trash'],
  })
  assert.equal(stages.length, 2)
  assert.equal(stages[0][0].form, 'burmy-plant')
})

test('evolution conditions retain required gender, weather and physical-stat restrictions', () => {
  assert.equal(
    describeEvolution({ ...level(21), gender: 1 }),
    'Lv 21 · Giống cái'
  )
  assert.equal(
    describeEvolution({ ...level(50), needs_overworld_rain: true }),
    'Lv 50 · Trời mưa'
  )
  assert.equal(
    describeEvolution({ ...level(20), relative_physical_stats: 0 }),
    'Lv 20 · Công = Thủ'
  )
  assert.equal(
    describeEvolution({ trigger: { name: 'level-up' }, min_beauty: 170 }),
    'Sắc đẹp ≥ 170'
  )
})

test('cosmetic forms use their own artwork even when they share a Pokémon ID', () => {
  const form = {
    pokemon: { url: 'https://pokeapi.co/api/v2/pokemon/422/' },
    sprites: {
      other: {
        'official-artwork': {
          front_default:
            'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/422-east.png',
        },
      },
    },
  }
  assert.equal(
    getEvolutionArtwork(422, form),
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/422-east.png'
  )
  assert.equal(
    getEvolutionArtwork(422, {
      sprites: {
        front_default:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/422-east.png',
      },
    }),
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/422-east.png'
  )
})

test('display names use the official species name, plus the form', async () => {
  const { displayNameOf } = await import('./species.mjs')
  const species = (name, en) => ({
    name,
    names: [{ language: { name: 'en' }, name: en }],
  })
  assert.equal(
    displayNameOf(
      { name: 'mr-mime', is_default: true },
      species('mr-mime', 'Mr. Mime')
    ),
    'Mr. Mime'
  )
  assert.equal(
    displayNameOf(
      { name: 'charizard-mega-x', is_default: false },
      species('charizard', 'Charizard')
    ),
    'Charizard Mega X'
  )
  // a default variety with a suffix keeps the species name alone
  assert.equal(
    displayNameOf(
      { name: 'urshifu-single-strike', is_default: true },
      species('urshifu', 'Urshifu')
    ),
    'Urshifu'
  )
  assert.equal(displayNameOf({ name: 'type-null' }, undefined), 'Type Null')
})

test('forms list the default first with readable labels', async () => {
  const { formsOf } = await import('./species.mjs')
  const v = (name, id, isDefault = false) => ({
    is_default: isDefault,
    pokemon: { name, url: `https://pokeapi.co/api/v2/pokemon/${id}/` },
  })
  const forms = formsOf({
    name: 'charizard',
    varieties: [
      v('charizard-mega-x', 10034),
      v('charizard', 6, true),
      v('charizard-gmax', 10196),
    ],
  })
  assert.deepEqual(
    forms.map((f) => [f.label, f.id]),
    [
      ['Dạng gốc', 6],
      ['Mega X', 10034],
      ['Gigantamax', 10196],
    ]
  )
  assert.deepEqual(
    formsOf({ name: 'pikachu', varieties: [v('pikachu', 25, true)] }),
    []
  )
  assert.deepEqual(formsOf(undefined), [])
})
