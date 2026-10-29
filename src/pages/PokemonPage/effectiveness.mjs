import { TYPE_DATA } from '../../components/pokemon-page/type-data.mjs'

// Incoming damage only, under current main-series type rules. Abilities,
// items, weather and move-specific overrides are intentionally not modeled.
export function getDefenses(types = []) {
  if (
    !types.length ||
    types.some(
      (type) =>
        !['no_damage_from', 'half_damage_from', 'double_damage_from'].every(
          (key) => Array.isArray(type?.damage_relations?.[key])
        )
    )
  )
    return []
  return Object.entries(TYPE_DATA).map(([name, info]) => {
    let multiplier = 1
    for (const type of types) {
      const relations = type.damage_relations
      if (relations.no_damage_from?.some((entry) => entry.name === name))
        multiplier *= 0
      else if (
        relations.double_damage_from?.some((entry) => entry.name === name)
      )
        multiplier *= 2
      else if (relations.half_damage_from?.some((entry) => entry.name === name))
        multiplier *= 0.5
    }
    return { name, ...info, multiplier }
  })
}
