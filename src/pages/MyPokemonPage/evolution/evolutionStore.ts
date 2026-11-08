import { useSyncExternalStore } from 'react'
import { dismissEvolution, enqueueEvolution } from './queue.mjs'

export type EvolutionRequest = {
  id: string
  individualId: string
  kind: 'prompt' | 'run'
  item?: string
  branch?: number
  speciesId?: number
  name?: string
}

const EMPTY: EvolutionRequest[] = []
let queue: EvolutionRequest[] = EMPTY
let rev = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Ask the host (mounted once in the layout) to show an evolution dialog or effect. */
export function openEvolution(request: EvolutionRequest) {
  const next = enqueueEvolution(queue, request) as EvolutionRequest[]
  if (next === queue) return
  queue = next
  emit()
}

export function closeEvolution() {
  const next = dismissEvolution(queue) as EvolutionRequest[]
  queue = next.length ? next : EMPTY
  emit()
}

export const useEvolutionQueue = () =>
  useSyncExternalStore(
    subscribe,
    () => queue,
    () => EMPTY
  )

/** An evolution settled: every reader of the options fetches them again. */
export const bumpEvolution = () => {
  rev += 1
  emit()
}
export const useEvolutionRev = () =>
  useSyncExternalStore(
    subscribe,
    () => rev,
    () => 0
  )
