import { useEffect, useState } from 'react'
import { useAccount } from 'app/supabase/account'
import { getSupabase } from 'app/supabase/client'
import { modeFor } from 'pages/QuizPage/engine/mode'

/** Species the account has recorded (pokemon_dex); errors are ignored. `version` reloads. */
export function useDexSpecies(version: unknown): number[] {
  const account = useAccount()
  const server = modeFor(account.status) === 'server'
  const userId = account.user?.id
  const [ids, setIds] = useState<number[]>([])
  useEffect(() => {
    if (!server || !userId) {
      setIds([])
      return
    }
    let live = true
    getSupabase()
      .then((supabase) => supabase.from('pokemon_dex').select('pokemon_id'))
      .then((out: any) => {
        if (live && !out.error)
          setIds((out.data ?? []).map((row: any) => row.pokemon_id))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [server, userId, version])
  return ids
}
