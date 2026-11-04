import { getSupabase } from 'app/supabase/client'
import { createShardJournal } from 'pages/QuizPage/shards/local.mjs'
import type { QuizMode } from 'pages/QuizPage/engine/mode'
import { craftCard } from './operations.mjs'

export type CraftReceipt = {
  operationId: string
  speciesId: number
  spent: number
  shardCount: number
  cardCount: number
}

/** Crafts one card: the account's database when signed in, this browser's journal in dev. */
export async function submitCraft(
  mode: QuizMode,
  operationId: string,
  speciesId: number
): Promise<CraftReceipt> {
  const supabase = mode === 'server' ? await getSupabase() : undefined
  const journal = mode === 'local' ? createShardJournal() : undefined
  return craftCard({ mode, supabase, journal }, operationId, speciesId)
}
