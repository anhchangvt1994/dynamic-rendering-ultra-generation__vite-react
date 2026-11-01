import type { AccountState } from 'app/supabase/account'

export type QuizMode = 'local' | 'server' | 'guest' | 'checking'

// NOTE - yarn dev only: localStorage['pokedex:quiz-mode'] = 'guest' | 'local'
// forces a mode (the QC script checks the guest's pages this way)
const forcedMode = (): 'guest' | 'local' | null => {
  if (!import.meta.env.DEV) return null
  try {
    const value = localStorage.getItem('pokedex:quiz-mode')
    return value === 'guest' || value === 'local' ? value : null
  } catch {
    return null
  }
}

/**
 * The game's mode for a session: the account's game when signed in, this
 * browser's in yarn dev, a guest's otherwise. The quiz and the bag agree.
 */
export function modeFor(status: AccountState['status']): QuizMode {
  const forced = forcedMode()
  if (forced) return forced
  if (status === 'checking') return 'checking'
  if (status === 'signed-in') return 'server'
  return import.meta.env.DEV ? 'local' : 'guest'
}
