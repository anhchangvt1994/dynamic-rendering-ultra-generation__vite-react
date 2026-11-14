import { REGIONS } from './data/regions.mjs'
import { GYMS } from './data/gyms.mjs'
import { layoutRegion } from './layout.mjs'
import { NPC_COUNT, generateNpcs } from './npc.mjs'
import { rollRegion } from './spawn.mjs'

/** Everything on the map for one spawn window: the same draw World.ts makes. */
export function mapData(slot, owned) {
  const npcs = []
  const pokemon = []
  for (const region of REGIONS) {
    const layout = layoutRegion(region)
    for (const n of generateNpcs({ regionId: region.id, zones: layout.zones, towns: layout.towns, seed: 1, count: NPC_COUNT }))
      npcs.push({ ...n, regionId: region.id })
    const rolled = rollRegion({ regionId: region.id, zones: layout.zones, slot, owned })
    for (const [zone, ids] of Object.entries(rolled)) for (const id of ids) pokemon.push({ id, zone, regionId: region.id })
  }
  return { npcs, pokemon, gyms: GYMS }
}
