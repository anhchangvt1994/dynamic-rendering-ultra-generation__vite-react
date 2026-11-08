import { useEffect, useState } from 'react'
import { getSupabase } from 'app/supabase/client'
import { fetchLearnset } from './client.mjs'

export type LearnRow = {
  move: string
  method: 'level-up' | 'machine' | 'egg' | 'tutor'
  level: number
  item?: string
}
export type MoveInfo = {
  type: string
  power: number | null
  accuracy: number | null
  pp: number
  damageClass: string
}
export type Learnset = { learnset: LearnRow[]; moves: Record<string, MoveInfo> }

// reference data never changes within a session
const cache = new Map<number, Promise<Learnset>>()

/** The learnset the server validates against, for one species. */
export function useLearnset(species: number | null, enabled: boolean) {
  const [state, setState] = useState<{
    species: number | null
    data: Learnset | null
  }>({ species: null, data: null })
  useEffect(() => {
    if (!enabled || species === null) return
    let live = true
    let promise = cache.get(species)
    if (!promise) {
      promise = getSupabase().then((supabase) =>
        fetchLearnset({ mode: 'server', supabase }, species)
      )
      cache.set(species, promise)
      promise.catch(() => cache.delete(species))
    }
    promise.then(
      (data) => live && setState({ species, data }),
      () => live && setState({ species, data: null })
    )
    return () => {
      live = false
    }
  }, [species, enabled])
  return state.species === species ? state.data : null
}
