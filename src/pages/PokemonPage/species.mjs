import { titleCase } from '../../components/pokemon-page/format.mjs'
import { getPokemonFallbackImage } from './navigation.mjs'

export const getEvolutionArtwork = (pokemonId, form) =>
  form?.sprites?.other?.['official-artwork']?.front_default ||
  form?.sprites?.front_default ||
  (pokemonId ? getPokemonFallbackImage(pokemonId) : '')

// ".../pokemon-species/445/" → 445
export const idFromUrl = (url = '') =>
  Number(url.match(/\/(\d+)\/?$/)?.[1]) || 0

const TIME = { day: 'ban ngày', night: 'ban đêm', dusk: 'chạng vạng' }

// One evolution_details entry → a short Vietnamese condition.
export function describeEvolution(detail) {
  if (!detail) return ''
  const parts = []
  const trigger = detail.trigger?.name
  if (trigger === 'trade') parts.push('Trao đổi')
  if (detail.item) parts.push(titleCase(detail.item.name))
  if (detail.held_item) parts.push(`Giữ ${titleCase(detail.held_item.name)}`)
  if (detail.min_level) parts.push(`Lv ${detail.min_level}`)
  if (detail.gender === 1) parts.push('Giống cái')
  if (detail.gender === 2) parts.push('Giống đực')
  if (detail.min_beauty) parts.push(`Sắc đẹp ≥ ${detail.min_beauty}`)
  if (detail.min_happiness) parts.push('Thân thiết')
  if (detail.min_affection) parts.push('Yêu mến')
  if (detail.known_move) parts.push(`Biết ${titleCase(detail.known_move.name)}`)
  if (detail.known_move_type)
    parts.push(`Biết chiêu hệ ${titleCase(detail.known_move_type.name)}`)
  if (detail.location) parts.push(`Tại ${titleCase(detail.location.name)}`)
  if (TIME[detail.time_of_day]) parts.push(TIME[detail.time_of_day])
  if (detail.needs_overworld_rain) parts.push('Trời mưa')
  if (detail.turn_upside_down) parts.push('Lật ngược thiết bị')
  const physical = { '-1': 'Công < Thủ', 0: 'Công = Thủ', 1: 'Công > Thủ' }
  if (
    Number.isInteger(detail.relative_physical_stats) &&
    physical[detail.relative_physical_stats]
  )
    parts.push(physical[detail.relative_physical_stats])
  if (!parts.length) parts.push(trigger === 'level-up' ? 'Lên cấp' : 'Đặc biệt')
  return parts.join(' · ')
}

// Evolution tree → stages by depth: [[base], [stage 1…], [stage 2…]].
// Each entry keeps how it is reached from the previous stage.
export function flattenEvolution(chain) {
  const stages = []
  const walk = (node, depth) => {
    if (!node?.species) return
    // Some chains list an older location-based method before a stone method
    // (Leafeon/Glaceon). Prefer the explicit item route when one is available.
    const detail =
      node.evolution_details?.find((entry) => entry.item) ||
      node.evolution_details?.[0]
    const items = [detail?.item, detail?.held_item]
      .filter((item) => item?.name && /^[a-z0-9-]+$/.test(item.name))
      .map((item) => ({ name: item.name, label: titleCase(item.name) }))
    ;(stages[depth] ||= []).push({
      name: node.species.name,
      id: idFromUrl(node.species.url),
      condition: depth ? describeEvolution(detail) : '',
      ...(items.length ? { items } : {}),
    })
    node.evolves_to?.forEach((child) => walk(child, depth + 1))
  }
  walk(chain, 0)
  return stages
}

// Build form-aware routes first; grouping a species-only tree by depth would
// incorrectly connect ordinary Meowth to Perrserker and mix regional branches.
export function getEvolutionStages(
  chain,
  { speciesId = 0, pokemonName = '', isDefault = false, formNames = [] } = {}
) {
  const routes = []
  const entry = (node, detail) => {
    const items = [detail?.item, detail?.held_item]
      .filter((item) => item?.name)
      .map((item) => ({ name: item.name, label: titleCase(item.name) }))
    const form = detail?.evolved_pokemon_form?.name
    return {
      id: idFromUrl(node.species.url),
      name: node.species.name,
      condition: detail ? describeEvolution(detail) : '',
      ...(form && form !== node.species.name ? { form } : {}),
      ...(items.length ? { items } : {}),
    }
  }
  const walk = (node, route) => {
    if (!node.evolves_to?.length) {
      routes.push(route)
      return
    }
    let advanced = false
    for (const child of node.evolves_to) {
      const groups = new Map()
      for (const detail of child.evolution_details?.length
        ? child.evolution_details
        : [undefined]) {
        const key = `${detail?.required_pokemon_form?.name || ''}|${detail?.evolved_pokemon_form?.name || ''}`
        const existing = groups.get(key)
        if (!groups.has(key) || (detail?.item && !existing?.item))
          groups.set(key, detail)
      }
      for (const detail of groups.values()) {
        const parent = route[route.length - 1]
        const required = detail?.required_pokemon_form?.name
        if (required && parent.form && parent.form !== required) continue
        // An intermediate form is already fixed by its incoming edge. Do not
        // silently turn ordinary Linoone into Galarian Linoone just because a
        // later edge requires Galar. Only the root may resolve its form here.
        if (
          required &&
          route.length > 1 &&
          !parent.form &&
          required !== parent.name
        )
          continue
        const resolvedParent =
          required && required !== parent.name
            ? { ...parent, form: required }
            : parent
        advanced = true
        walk(child, [
          ...route.slice(0, -1),
          resolvedParent,
          entry(child, detail),
        ])
      }
    }
    // A species may have outgoing edges only for another regional form.
    // Its default-form route is still valid and terminates at this point.
    if (!advanced) routes.push(route)
  }
  if (!chain?.species) return []
  walk(chain, [entry(chain)])
  const acceptedForms = new Set([pokemonName, ...formNames])
  const matching = speciesId
    ? routes.filter((route) =>
        route.some(
          (mon) =>
            mon.id === speciesId &&
            (mon.form
              ? acceptedForms.has(mon.form)
              : mon.name === pokemonName || isDefault)
        )
      )
    : routes
  const stages = []
  for (const route of matching)
    route.forEach((mon, depth) => {
      const stage = (stages[depth] ||= [])
      if (
        !stage.some(
          (existing) => existing.id === mon.id && existing.form === mon.form
        )
      )
        stage.push(mon)
    })
  return stages
}

const clean = (text = '') =>
  text
    .replace(/[\f\n\r­]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// The newest English Pokédex entry (PokéAPI has no Vietnamese text).
export function pickFlavorText(entries = []) {
  const english = entries.filter((entry) => entry?.language?.name === 'en')
  return clean(english[english.length - 1]?.flavor_text)
}

export function pickGenus(genera = []) {
  const find = (lang) => genera.find((g) => g?.language?.name === lang)?.genus
  return find('vi') || find('en') || ''
}

const titled = (slug = '') =>
  slug
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')

/**
 * The name to show for a Pokémon: the species' official English name
 * ("Mr. Mime", "Farfetch’d", "Type: Null", "Nidoran♀"), plus the form for
 * non-default varieties ("Charizard Mega X"). Without species data yet it
 * falls back to the title-cased slug.
 */
export function displayNameOf(pokemon, species) {
  const slug = pokemon?.name ?? ''
  const official = species?.names?.find(
    (entry) => entry?.language?.name === 'en'
  )?.name
  if (!official) return titled(slug)
  const base = species.name ?? ''
  const form =
    slug !== base &&
    slug.startsWith(`${base}-`) &&
    pokemon?.is_default === false
      ? titled(slug.slice(base.length + 1))
      : ''
  return form ? `${official} ${form}` : official
}
