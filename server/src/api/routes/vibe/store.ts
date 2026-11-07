export interface VibeRow {
  species_id: number
  vibe: string
  v: number
}

/**
 * Stores a species' vibe through pokemon_species_vibe_store (service role):
 * a missing row is added, a row of an older rule version replaced, the seed's
 * same-version row kept. No settings: nothing is sent. A refused store throws.
 */
export async function storeVibe(
  fetchImpl: typeof fetch,
  { url, key }: { url: string; key: string },
  row: VibeRow
) {
  if (!url || !key) return
  const res = await fetchImpl(`${url}/rest/v1/rpc/pokemon_species_vibe_store`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_species: row.species_id,
      p_vibe: row.vibe,
      p_v: row.v,
    }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`vibe store ${res.status}`)
}
