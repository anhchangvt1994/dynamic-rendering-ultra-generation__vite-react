import { getSupabase } from 'app/supabase/client'
import { createShardJournal } from 'pages/QuizPage/shards/local.mjs'
import type { QuizMode } from 'pages/QuizPage/engine/mode'
import { nameIndividual, tradeCard } from './operations.mjs'

export type Traits = {
  personality: number
  appearance: {
    v: number
    hue: number
    sat: number
    light: number
    mark: null | {
      kind: string
      x: number
      y: number
      size: number
      rot: number
    }
  }
  potential: { v: number; offsets: number[]; stars: number }
}
export type TradeReceipt = {
  operationId: string
  speciesId: number
  individualId: string
  cardCount: number
  traits: Traits
}
export type Individual = Traits & {
  id: string
  speciesId: number
  nickname: string | null
  createdAt: string
}

const deps = async (mode: QuizMode) => ({
  mode,
  supabase: mode === 'server' ? await getSupabase() : undefined,
  journal: mode === 'local' ? createShardJournal() : undefined,
})

export async function submitTrade(
  mode: QuizMode,
  operationId: string,
  speciesId: number
): Promise<TradeReceipt> {
  return tradeCard(await deps(mode), operationId, speciesId)
}

export async function submitName(
  mode: QuizMode,
  individualId: string,
  nickname: string
): Promise<{ individualId: string; nickname: string | null }> {
  return nameIndividual(await deps(mode), individualId, nickname)
}
