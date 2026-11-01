import type { QuizEngine } from './types'
import { createLocalEngine as local } from './local.mjs'
import { createGuestEngine as guest } from './guest.mjs'

export type {
  PlayRound,
  QuizEngine,
  StartOptions,
  Status,
  Verdict,
} from './types'

export const createLocalEngine = local as () => QuizEngine
export const createGuestEngine = guest as () => QuizEngine
