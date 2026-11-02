import { useEffect, useState } from 'react'
import { useAccount } from 'app/supabase/account'
import { getSupabase } from 'app/supabase/client'
import { modeFor } from 'pages/QuizPage/engine/mode'
import { createGuestEngine } from './guest.mjs'
import { createServerEngine } from './server'
import type { KitchenEngine } from './types'

// NOTE - The browser's kitchen holds the secret recipes: imported only in
// dev, so a production build leaves it (and them) out
const localEngine = (): Promise<KitchenEngine> | null =>
  import.meta.env.DEV
    ? import('./local.mjs').then(
        ({ createLocalEngine }) => createLocalEngine() as KitchenEngine
      )
    : null

const guest = () => createGuestEngine() as KitchenEngine

/**
 * The kitchen the page cooks in: the account's (signed in), this browser's
 * (yarn dev, no session), a guest's (to look at). It follows the quiz's mode.
 */
export function useKitchenEngine(): KitchenEngine | null {
  const account = useAccount()
  const [engine, setEngine] = useState<KitchenEngine | null>(null)

  useEffect(() => {
    let live = true
    const mode = modeFor(account.status)
    const set = (next: KitchenEngine) => live && setEngine(next)
    setEngine(null)
    if (mode === 'server')
      getSupabase()
        .then((supabase) => set(createServerEngine(supabase)))
        .catch(() => set(guest()))
    else if (mode === 'local')
      (localEngine() ?? Promise.resolve(guest())).then(set)
    else if (mode === 'guest') set(guest())
    return () => {
      live = false
    }
  }, [account.status, account.user?.id])

  return engine
}
