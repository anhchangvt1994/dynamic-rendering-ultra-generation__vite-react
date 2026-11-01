import { useEffect, useState } from 'react'
import { useAccount } from 'app/supabase/account'
import { getSupabase } from 'app/supabase/client'
import { createGuestEngine, createLocalEngine } from './index'
import { createServerEngine } from './server'
import type { QuizEngine } from './types'
import { modeFor } from './mode'
import type { QuizMode } from './mode'

export type { QuizMode }

type EngineState = { engine: QuizEngine | null; mode: QuizMode }

// the account's game could not load: this browser's in dev, a guest's else
const withoutAccount = (): EngineState =>
  import.meta.env.DEV
    ? { engine: createLocalEngine(), mode: 'local' }
    : { engine: createGuestEngine(), mode: 'guest' }

/**
 * The game the page plays: the account's (signed in), this browser's (yarn
 * dev, no session) or a guest's (no rewards). It changes with the session.
 */
export function useQuizEngine(): EngineState {
  const account = useAccount()
  const [state, setState] = useState<EngineState>({
    engine: null,
    mode: 'checking',
  })

  useEffect(() => {
    let live = true
    const mode = modeFor(account.status)
    if (mode === 'checking') setState({ engine: null, mode })
    else if (mode === 'local') setState({ engine: createLocalEngine(), mode })
    else if (mode === 'guest') setState({ engine: createGuestEngine(), mode })
    else {
      setState({ engine: null, mode: 'checking' })
      getSupabase()
        .then((supabase) => {
          if (live)
            setState({ engine: createServerEngine(supabase), mode: 'server' })
        })
        .catch(() => {
          // no client (offline, new deploy): play without the account
          if (live) setState(withoutAccount())
        })
    }
    return () => {
      live = false
    }
  }, [account.status, account.user?.id])

  return state
}
