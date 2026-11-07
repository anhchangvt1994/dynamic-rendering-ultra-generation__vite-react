// The species' vibe from GET /api/species-vibe/:id (the server derives it
// from the Pokédex and stores it for the trade RPC). Any failure is null —
// the trade then draws from the common pool — and is asked again next time.
import { VIBES } from './palettes.mjs'

export function createSpeciesVibe(fetchImpl) {
  const known = new Map()
  return async (speciesId) => {
    if (!Number.isInteger(speciesId) || speciesId < 1 || speciesId > 1025)
      return null
    if (known.has(speciesId)) return known.get(speciesId)
    try {
      const res = await fetchImpl(`/api/species-vibe/${speciesId}`)
      if (!res?.ok) return null
      const vibe = (await res.json())?.vibe
      if (!VIBES.includes(vibe)) return null
      known.set(speciesId, vibe)
      return vibe
    } catch {
      return null
    }
  }
}

export const speciesVibe = createSpeciesVibe((...args) =>
  globalThis.fetch(...args)
)
