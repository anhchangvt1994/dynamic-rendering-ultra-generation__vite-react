// The species' vibe from GET /api/species-vibe/:id (the server derives it
// from the Pokédex and stores it for the trade RPC). Any failure is null —
// the trade then draws from the common pool — and is asked again next time.
// A route that hangs counts as a failure after timeoutMs.
import { VIBES } from './palettes.mjs'

export function createSpeciesVibe(fetchImpl, { timeoutMs = 3000 } = {}) {
  const known = new Map()
  return async (speciesId) => {
    if (!Number.isInteger(speciesId) || speciesId < 1 || speciesId > 1025)
      return null
    if (known.has(speciesId)) return known.get(speciesId)
    const abort = new AbortController()
    const { signal } = abort
    let timer
    const timedOut = new Promise((_, reject) => {
      timer = setTimeout(() => {
        abort.abort()
        reject(new Error('timeout'))
      }, timeoutMs)
    })
    timedOut.catch(() => {})
    try {
      const res = await Promise.race([
        fetchImpl(`/api/species-vibe/${speciesId}`, { signal }),
        timedOut,
      ])
      if (!res?.ok) return null
      const vibe = (await Promise.race([res.json(), timedOut]))?.vibe
      if (!VIBES.includes(vibe)) return null
      known.set(speciesId, vibe)
      return vibe
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }
}

export const speciesVibe = createSpeciesVibe((...args) =>
  globalThis.fetch(...args)
)
