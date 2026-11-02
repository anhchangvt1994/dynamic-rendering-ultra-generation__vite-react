import { useEffect, useState } from 'react'
import { useKitchenEngine } from './engine/useKitchenEngine'
import type { Menu } from './engine/types'

/**
 * The dishes cooked (the pocket's count, at once) and the menu that names
 * them, fetched only once the bag's "Món ăn" pocket is first opened (`open`):
 * a secret dish is cooked only once found, so the menu knows every cooked
 * one. null while they load.
 */
export function useDishes(open: boolean): {
  dishes: Record<string, number> | null
  menu: Menu | null
} {
  const engine = useKitchenEngine()
  const [dishes, setDishes] = useState<Record<string, number> | null>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [wanted, setWanted] = useState(open)
  if (open && !wanted) setWanted(true)

  useEffect(() => {
    if (!engine) return
    let live = true
    engine
      .dishes()
      .then((value) => live && setDishes(value))
      .catch(() => live && setDishes({}))
    return () => {
      live = false
    }
  }, [engine])
  useEffect(() => {
    if (!engine || !wanted) return
    let live = true
    engine
      .menu()
      .then((value) => live && setMenu(value))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [engine, wanted])
  return { dishes, menu }
}
