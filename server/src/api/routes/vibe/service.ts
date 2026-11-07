import { VIBE_VERSION, type Vibe, isSpeciesId, vibeOf } from './vibe'

export const VIBE_ROUTE = '/api/species-vibe/:id'
export const VIBE_CACHE = 'public, max-age=604800'

export interface VibeDeps {
  /** a PokéAPI endpoint's JSON (proxy cache first), null when unreadable */
  load: (endpoint: string) => Promise<any>
  /** stores the species' vibe for the trade RPC; failures are ignored */
  save: (row: { species_id: number; vibe: Vibe; v: number }) => Promise<void>
}

export const readVibePath = (url: string) =>
  /^\/api\/species-vibe\/([^/?#]+)/.exec(url)?.[1] ?? null

/** GET /api/species-vibe/<id> → {id, vibe, scores, v}; 400 / 502. */
export async function vibeFor(id: string, deps: VibeDeps) {
  if (!isSpeciesId(id))
    return { status: 400, body: { error: 'invalid_species' } }
  const n = Number(id)
  let species: any
  let pokemon: any
  try {
    ;[species, pokemon] = await Promise.all([
      deps.load(`/pokemon-species/${n}`),
      deps.load(`/pokemon/${n}`),
    ])
  } catch {
    species = null
  }
  if (!species || !pokemon || typeof species !== 'object')
    return { status: 502, body: { error: 'pokedex_unavailable' } }
  const { vibe, scores } = vibeOf({ ...species, id: n }, pokemon)
  try {
    await deps.save({ species_id: n, vibe, v: VIBE_VERSION })
  } catch {
    // the answer stands; the next call stores it again
  }
  return { status: 200, body: { id: n, vibe, scores, v: VIBE_VERSION } }
}
