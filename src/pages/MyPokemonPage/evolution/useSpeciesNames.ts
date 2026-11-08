import { useCallback, useEffect, useState } from 'react'
import { pokemonLabel } from 'components/pokemon-page/format.mjs'

let cache: Record<number, string> | null = null

/** Species names from the shard catalog, loaded once when first needed. */
export function useSpeciesNames() {
  const [names, setNames] = useState<Record<number, string>>(cache ?? {})
  useEffect(() => {
    if (cache) return
    let live = true
    import('pages/QuizPage/shards/catalog.json').then(({ default: data }) => {
      const map: Record<number, string> = {}
      for (const s of data.species) map[s.id] = pokemonLabel(s.name)
      cache = map
      if (live) setNames(map)
    })
    return () => {
      live = false
    }
  }, [])
  return useCallback((id: number) => names[id] ?? `#${id}`, [names])
}
