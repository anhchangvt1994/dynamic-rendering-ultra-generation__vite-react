import { getSupabase } from 'app/supabase/client'
import { createShardJournal } from 'pages/QuizPage/shards/local.mjs'
import type { QuizMode } from 'pages/QuizPage/engine/mode'
import { nameIndividual, tradeCard } from './operations.mjs'
import { speciesVibe } from './speciesVibe.mjs'

/**
 * Appearance v3: a curated palette (from the species' vibe set or the common
 * pool), a small shift per colour region, marks. A v2 one may still arrive
 * until the upgrade re-derives it.
 */
export type Appearance = {
  v: 2 | 3
  palette: string
  shift: [number, number, number][]
  marks: null | { kind: string; count: number; seed: number }
}
export type Traits = {
  personality: number
  appearance: Appearance
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
  vibe: speciesVibe,
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

/** What the server computes for one individual (pokemon_build). Stat order: hp, atk, def, spa, spd, spe. */
export type Build = {
  species: number
  level: number
  exp: number
  expFloor: number
  expNext: number | null
  cap: number
  capped: boolean
  stars: number
  bonusStars: number
  awakened: boolean
  itemUses: number
  iv: number[]
  ev: number[]
  stats: number[]
  moves: (string | null)[]
  nature: number
  ability: { name: string; hidden: boolean; slot: number }
  gender: 'male' | 'female' | 'none'
  shiny: boolean
  size: number
}
