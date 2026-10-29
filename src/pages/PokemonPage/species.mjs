import { titleCase } from '../../components/pokemon-page/format.mjs'

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
  if (detail.min_happiness) parts.push('Thân thiết')
  if (detail.min_affection) parts.push('Yêu mến')
  if (detail.known_move) parts.push(`Biết ${titleCase(detail.known_move.name)}`)
  if (detail.known_move_type)
    parts.push(`Biết chiêu hệ ${titleCase(detail.known_move_type.name)}`)
  if (detail.location) parts.push(`Tại ${titleCase(detail.location.name)}`)
  if (TIME[detail.time_of_day]) parts.push(TIME[detail.time_of_day])
  if (!parts.length) parts.push(trigger === 'level-up' ? 'Lên cấp' : 'Đặc biệt')
  return parts.join(' · ')
}

// Evolution tree → stages by depth: [[base], [stage 1…], [stage 2…]].
// Each entry keeps how it is reached from the previous stage.
export function flattenEvolution(chain) {
  const stages = []
  const walk = (node, depth) => {
    if (!node?.species) return
    ;(stages[depth] ||= []).push({
      name: node.species.name,
      id: idFromUrl(node.species.url),
      condition: depth ? describeEvolution(node.evolution_details?.[0]) : '',
    })
    node.evolves_to?.forEach((child) => walk(child, depth + 1))
  }
  walk(chain, 0)
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
