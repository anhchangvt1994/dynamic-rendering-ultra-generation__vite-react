import { typesOf } from '../../components/pokemon-page/type-index.mjs'
import { searchPokemon } from '../../components/common/SearchPokemonBar/search.mjs'
import { POKEMON_COUNT } from '../PokemonPage/navigation.mjs'

export const GENERATIONS = [
  { id: '1', name: 'Kanto', start: 1, end: 151 },
  { id: '2', name: 'Johto', start: 152, end: 251 },
  { id: '3', name: 'Hoenn', start: 252, end: 386 },
  { id: '4', name: 'Sinnoh', start: 387, end: 493 },
  { id: '5', name: 'Unova', start: 494, end: 649 },
  { id: '6', name: 'Kalos', start: 650, end: 721 },
  { id: '7', name: 'Alola', start: 722, end: 809 },
  { id: '8', name: 'Galar & Hisui', start: 810, end: 905 },
  { id: '9', name: 'Paldea', start: 906, end: 1025 },
]

export const TYPES = [
  ['grass', 'Cỏ', '#3b8055'],
  ['fire', 'Lửa', '#c64b2c'],
  ['water', 'Nước', '#3575bd'],
  ['electric', 'Điện', '#967015'],
  ['normal', 'Thường', '#727361'],
  ['ice', 'Băng', '#32818f'],
  ['fighting', 'Giác đấu', '#a9443b'],
  ['poison', 'Độc', '#8e4a9c'],
  ['ground', 'Đất', '#93713d'],
  ['flying', 'Bay', '#7060ae'],
  ['psychic', 'Siêu linh', '#be4676'],
  ['bug', 'Bọ', '#6e7c25'],
  ['rock', 'Đá', '#88784d'],
  ['ghost', 'Ma', '#6d5897'],
  ['dragon', 'Rồng', '#6551b8'],
  ['dark', 'Bóng tối', '#625a69'],
  ['steel', 'Thép', '#607f8c'],
  ['fairy', 'Tiên', '#ad598c'],
]

export const pokemonId = (pokemon) =>
  Number(pokemon?.url?.match(/\/(\d+)\/?$/)?.[1]) || 0

export function readCatalogParams(search = '') {
  const params = new URLSearchParams(search)
  const shown = Number(params.get('shown'))
  const result = {
    query: params.get('q') || '',
    generation: GENERATIONS.some((x) => x.id === params.get('gen'))
      ? params.get('gen')
      : '',
    // one or two types, "dragon" or "dragon,ground" (unknown ones dropped)
    types: [
      ...new Set(
        (params.get('type') || '')
          .split(',')
          .filter((key) => TYPES.some((x) => x[0] === key))
      ),
    ].slice(0, 2),
    sort: ['number-desc', 'name'].includes(params.get('sort'))
      ? params.get('sort')
      : 'number',
    caughtOnly: params.get('view') === 'caught',
    shown:
      Number.isFinite(shown) && shown >= 24
        ? Math.min(POKEMON_COUNT, Math.floor(shown))
        : 24,
  }
  // the URL value, normalised ('' when no valid type)
  return { ...result, type: result.types.join(',') }
}

/** Ids of species that have every one of `types` (local type index). */
export function idsWithTypes(types = []) {
  if (!types.length) return undefined
  const ids = new Set()
  for (let id = 1; id <= POKEMON_COUNT; id++) {
    const own = typesOf(id)
    if (types.every((type) => own.includes(type))) ids.add(id)
  }
  return ids
}

/** Chip toggle: add (max two, the newest replaces the second), or remove. */
export function toggleType(types = [], key) {
  if (types.includes(key)) return types.filter((type) => type !== key)
  return types.length < 2 ? [...types, key] : [types[0], key]
}

export function filterCatalog(list = [], options = {}) {
  const {
    query = '',
    generation = '',
    sort = 'number',
    caughtOnly = false,
    caughtIds = new Set(),
    typeIds,
  } = options
  const region = GENERATIONS.find((x) => x.id === generation)
  const national = list.filter((entry) => {
    const id = pokemonId(entry)
    return (
      id > 0 &&
      id <= POKEMON_COUNT &&
      (!region || (id >= region.start && id <= region.end)) &&
      (!caughtOnly || caughtIds.has(id)) &&
      (!typeIds || typeIds.has(id))
    )
  })
  const result = query.trim()
    ? searchPokemon(national, query.trim(), POKEMON_COUNT)
    : national
  return result.sort((a, b) =>
    sort === 'name'
      ? a.name.localeCompare(b.name, 'en')
      : sort === 'number-desc'
        ? pokemonId(b) - pokemonId(a)
        : pokemonId(a) - pokemonId(b)
  )
}
