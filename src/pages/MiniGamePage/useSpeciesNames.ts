import { useEffect, useState } from 'react'
import { pokemonLabel } from 'components/pokemon-page/format.mjs'

// species names come from the shard catalog, loaded on first use
export function useSpeciesNames() {
  const [names, setNames] = useState<Record<number, string>>({})
  useEffect(() => {
    let live = true
    import('pages/QuizPage/shards/catalog.json').then(({ default: data }) => {
      if (!live) return
      const map: Record<number, string> = {}
      for (const s of data.species) map[s.id] = pokemonLabel(s.name)
      setNames(map)
    })
    return () => {
      live = false
    }
  }, [])
  return (id: number) => names[id] ?? `#${id}`
}
