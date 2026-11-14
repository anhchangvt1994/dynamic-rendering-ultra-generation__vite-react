const fold = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()

const MAX = 8

/**
 * Search everything on the map: regions, gyms (by leader, town or badge), NPCs
 * and the Pokémon currently out. Accents and case are ignored.
 */
export function searchMap(query, { regions, gyms, npcs, pokemon, speciesName }) {
  const q = fold(query)
  if (!q) return []
  const out = []
  const add = (kind, id, label, regionId, rank) => out.push({ kind, id, label, regionId, rank })
  for (const r of regions) {
    const name = fold(r.name)
    if (name.startsWith(q)) add('region', r.id, r.name, r.id, 0)
    else if (name.includes(q)) add('region', r.id, r.name, r.id, 4)
  }
  for (const g of gyms) {
    const region = regions.find((r) => r.id === g.region)
    const town = region?.towns.find((t) => t.id === g.town)
    const hay = [g.leader, town?.name, g.badge].map(fold)
    const label = `${g.leader}${town ? ` · ${town.name}` : ''}`
    if (hay[0].startsWith(q)) add('gym', g.id, label, g.region, 1)
    else if (hay.some((h) => h.includes(q))) add('gym', g.id, label, g.region, 5)
  }
  for (const p of pokemon ?? []) {
    const name = fold(speciesName(p.id))
    if (name.startsWith(q)) add('pokemon', String(p.id), speciesName(p.id), p.regionId, 2)
    else if (name.includes(q)) add('pokemon', String(p.id), speciesName(p.id), p.regionId, 6)
  }
  for (const n of npcs ?? []) {
    const name = fold(n.name)
    if (name.startsWith(q)) add('npc', n.id, n.name, n.regionId, 3)
    else if (name.includes(q)) add('npc', n.id, n.name, n.regionId, 7)
  }
  const seen = new Set()
  return out
    .sort((a, b) => a.rank - b.rank)
    .filter((h) => !seen.has(h.kind + h.id) && seen.add(h.kind + h.id))
    .slice(0, MAX)
    .map((h) => ({ kind: h.kind, id: h.id, label: h.label, regionId: h.regionId }))
}
