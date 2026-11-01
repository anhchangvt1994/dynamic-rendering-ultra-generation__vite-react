import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'app/supabase/account'
import { getSupabase } from 'app/supabase/client'
import { modeFor } from 'pages/QuizPage/engine/mode'
import type { QuizMode } from 'pages/QuizPage/engine/mode'
import { readJSON } from 'pages/QuizPage/progress.mjs'
import { BAG_KEY } from './bag.mjs'

type Bag = Record<string, number>

// a verdict just filled the bag: every reader fetches it again
const listeners = new Set<() => void>()
export const refreshBag = () => listeners.forEach((listener) => listener())

const readAccountBag = async (): Promise<Bag> => {
  const supabase = await getSupabase()
  const { data, error } = await supabase.from('bag').select('item_id, count')
  if (error) throw error
  return Object.fromEntries(data.map((row) => [row.item_id, row.count]))
}

/**
 * The bag, wherever the game keeps it: the account's `bag` table (signed
 * in), this browser's storage (yarn dev), nothing for a guest. null while
 * it loads.
 */
export function useBagStore(): { bag: Bag | null; mode: QuizMode } {
  const account = useAccount()
  const mode = modeFor(account.status)
  const [bag, setBag] = useState<Bag | null>(null)

  const load = useCallback(() => {
    if (mode === 'local') setBag(readJSON(BAG_KEY, {}))
    else if (mode === 'server')
      readAccountBag()
        .then(setBag)
        .catch(() => setBag({}))
    else if (mode === 'guest') setBag({})
    else setBag(null)
  }, [mode])

  useEffect(() => {
    load()
    listeners.add(load)
    // another tab played (the browser game only)
    const onStorage = (event: StorageEvent) => {
      if (mode === 'local' && (event.key === BAG_KEY || event.key === null))
        load()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(load)
      window.removeEventListener('storage', onStorage)
    }
  }, [load, mode, account.user?.id])

  return { bag, mode }
}
