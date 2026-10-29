import { sortMoves, titleCase } from '../format.mjs'
import { versionOrder } from '../version-order.mjs'
const VERSION_LABELS = {
  'red-blue': 'Red / Blue',
  yellow: 'Yellow',
  'gold-silver': 'Gold / Silver',
  crystal: 'Crystal',
  'ruby-sapphire': 'Ruby / Sapphire',
  emerald: 'Emerald',
  'firered-leafgreen': 'FireRed / LeafGreen',
  'diamond-pearl': 'Diamond / Pearl',
  platinum: 'Platinum',
  'heartgold-soulsilver': 'HeartGold / SoulSilver',
  'black-white': 'Black / White',
  'black-2-white-2': 'Black 2 / White 2',
  'x-y': 'X / Y',
  'omega-ruby-alpha-sapphire': 'Omega Ruby / Alpha Sapphire',
  'sun-moon': 'Sun / Moon',
  'ultra-sun-ultra-moon': 'Ultra Sun / Ultra Moon',
  'lets-go-pikachu-lets-go-eevee': 'Let’s Go Pikachu / Eevee',
  'sword-shield': 'Sword / Shield',
  'the-isle-of-armor': 'The Isle of Armor',
  'the-crown-tundra': 'The Crown Tundra',
  'brilliant-diamond-shining-pearl': 'Brilliant Diamond / Shining Pearl',
  'legends-arceus': 'Legends: Arceus',
  'scarlet-violet': 'Scarlet / Violet',
  'the-teal-mask': 'The Teal Mask',
  'the-indigo-disk': 'The Indigo Disk',
  'legends-za': 'Legends: Z-A',
  'legends-z-a': 'Legends: Z-A',
}
export function getMoveVersions(moves = []) {
  const versions = new Map()
  for (const move of moves)
    for (const detail of move.version_group_details || []) {
      const version = detail.version_group
      if (version?.name)
        versions.set(version.name, {
          value: version.name,
          label: VERSION_LABELS[version.name] || titleCase(version.name),
          id: versionOrder(version),
        })
    }
  return [...versions.values()].sort((a, b) => b.id - a.id)
}
export function getMoveMethods(moves = [], version = '') {
  return [
    ...new Set(
      moves.flatMap((entry) =>
        (entry.version_group_details || [])
          .filter(
            (detail) => !version || detail.version_group?.name === version
          )
          .map((detail) => detail.move_learn_method?.name)
          .filter(Boolean)
      )
    ),
  ]
}
const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[-_\s]+/g, ' ')
    .trim()
export function filterMoves(
  moves = [],
  { version = '', method = 'all', query = '' } = {}
) {
  const q = normalize(query)
  const matching = []
  for (const entry of moves) {
    if (!entry?.move?.name || (q && !normalize(entry.move.name).includes(q)))
      continue
    const details = (entry.version_group_details || []).filter(
      (detail) =>
        (!version || detail.version_group?.name === version) &&
        (method === 'all' || detail.move_learn_method?.name === method)
    )
    if (!details.length) continue
    matching.push({ ...entry, version_group_details: details })
  }
  return sortMoves(matching)
}
