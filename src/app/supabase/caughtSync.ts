import type { SupabaseClient } from '@supabase/supabase-js'
import { getCaught, replaceCaught, subscribeCaught } from 'utils/caught.mjs'

const difference = (a: Set<number>, b: Set<number>) =>
  [...a].filter((id) => !b.has(id))

/**
 * The account's collection mirrored in the local one (utils/caught.mjs),
 * which every page already reads and toggles.
 * - merge (just signed in): what was caught as a guest joins the account
 * - otherwise (came back signed in): the account is the truth, so a release
 *   made on another device is not undone by this one
 * Then each catch / release is sent as it happens. Returns the stop function.
 */
export async function startCaughtSync(
  supabase: SupabaseClient,
  merge: boolean
) {
  const { data, error } = await supabase.from('caught').select('pokemon_id')
  if (error) throw error
  const remote = new Set<number>(data.map((row) => row.pokemon_id))
  const local = getCaught() as Set<number>

  let synced = remote
  if (merge) {
    const missing = difference(local, remote)
    if (missing.length) {
      const { error } = await supabase.from('caught').upsert(
        missing.map((pokemon_id) => ({ pokemon_id })),
        { onConflict: 'user_id,pokemon_id', ignoreDuplicates: true }
      )
      if (error) throw error
    }
    synced = new Set([...remote, ...local])
  }
  replaceCaught(synced)

  return subscribeCaught(async () => {
    const now = getCaught() as Set<number>
    const added = difference(now, synced)
    const removed = difference(synced, now)
    synced = now
    // NOTE - A failed request is left out of `synced`: the next change
    // sends it again
    if (added.length) {
      const { error } = await supabase.from('caught').upsert(
        added.map((pokemon_id) => ({ pokemon_id })),
        { onConflict: 'user_id,pokemon_id', ignoreDuplicates: true }
      )
      if (error) added.forEach((id) => synced.delete(id))
    }
    if (removed.length) {
      const { error } = await supabase
        .from('caught')
        .delete()
        .in('pokemon_id', removed)
      if (error) removed.forEach((id) => synced.add(id))
    }
  }) as () => void
}
