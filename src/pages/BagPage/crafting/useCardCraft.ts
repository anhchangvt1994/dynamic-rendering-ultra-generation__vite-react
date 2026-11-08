import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccount } from 'app/supabase/account'
import { modeFor } from 'pages/QuizPage/engine/mode'
import { refreshShards } from '../shardStore'
import { submitCraft, type CraftReceipt } from './client'
import { createCraftController } from './operations.mjs'

export type CraftState = {
  kind: 'submitting' | 'uncertain' | 'error' | 'success'
  retryable: boolean
  origin?: 'user' | 'resume'
  code?: string
  receipt?: CraftReceipt
}

/**
 * Crafting for the signed-in or local player: one controller per owner, so
 * another account never sees or resumes this one's pending operations. Guests
 * and the checking state get no craft at all.
 */
export function useCardCraft(enabled: boolean) {
  const account = useAccount()
  const mode = modeFor(account.status)
  const userId = account.user?.id
  const ownerKey =
    mode === 'local'
      ? 'local'
      : mode === 'server' && userId
        ? `server:${userId}`
        : null
  const [states, setStates] = useState<Record<number, CraftState>>({})
  const controller = useRef<ReturnType<typeof createCraftController> | null>(
    null
  )

  useEffect(() => {
    setStates({})
    controller.current = null
    if (!enabled || !ownerKey) return
    const mine = createCraftController({
      ownerKey,
      storage: window.localStorage,
      submit: (operationId: string, speciesId: number) =>
        submitCraft(mode, operationId, speciesId),
      refresh: async () => refreshShards(),
      onState: (speciesId: number, state: CraftState) =>
        setStates((all) => ({ ...all, [speciesId]: state })),
    })
    controller.current = mine
    mine.resume()
    return () => {
      mine.dispose()
      if (controller.current === mine) controller.current = null
    }
  }, [enabled, ownerKey, mode])

  const craft = useCallback(
    (speciesId: number) => controller.current?.craft(speciesId),
    []
  )
  return useMemo(
    () => ({ states, craft, available: ownerKey !== null }),
    [states, craft, ownerKey]
  )
}
