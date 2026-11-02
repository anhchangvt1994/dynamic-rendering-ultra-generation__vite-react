import { useEffect, useState } from 'react'
import { useKitchenEngine } from './engine/useKitchenEngine'
import type { Menu } from './engine/types'

/**
 * The dishes cooked and the menu that names them (a secret dish is cooked
 * only once found, so the menu knows every cooked one): for the bag's
 * "Món ăn" pocket. null while it loads.
 */
export function useDishes(): {
  dishes: Record<string, number> | null
  menu: Menu | null
} {
  const engine = useKitchenEngine()
  const [state, setState] = useState<{
    dishes: Record<string, number> | null
    menu: Menu | null
  }>({ dishes: null, menu: null })
  useEffect(() => {
    if (!engine) return
    let live = true
    Promise.all([engine.dishes(), engine.menu()])
      .then(([dishes, menu]) => live && setState({ dishes, menu }))
      .catch(() => live && setState({ dishes: {}, menu: null }))
    return () => {
      live = false
    }
  }, [engine])
  return state
}
