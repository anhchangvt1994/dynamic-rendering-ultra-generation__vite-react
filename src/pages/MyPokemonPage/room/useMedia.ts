import { useSyncExternalStore } from 'react'

/** A media query's match, live; false on the server. */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (change) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', change)
      return () => list.removeEventListener('change', change)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

export const useReducedMotion = () =>
  useMedia('(prefers-reduced-motion: reduce)')
