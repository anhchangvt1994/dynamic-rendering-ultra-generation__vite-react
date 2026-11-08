import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccount } from 'app/supabase/account'
import { modeFor } from 'pages/QuizPage/engine/mode'
import { refreshShards } from '../shardStore'
import { submitName, submitTrade, type TradeReceipt } from './client'
import { refreshIndividuals, useIndividualList } from './individualStore'
import { createTradeController } from './operations.mjs'
import { enqueueWelcome } from './welcomeQueue.mjs'

export type TradeState = {
  kind: 'submitting' | 'uncertain' | 'error' | 'success'
  retryable: boolean
  code?: string
  receipt?: TradeReceipt
  batch?: boolean
}

/** Renaming works anywhere an individual is listed, with no trade controller. */
export function useNaming() {
  const account = useAccount()
  const mode = modeFor(account.status)
  return useCallback(
    async (individualId: string, nickname: string) => {
      const out = await submitName(mode, individualId, nickname)
      refreshIndividuals()
      return out
    },
    [mode]
  )
}

/**
 * Trading cards for individuals, naming them and counting them. One
 * controller per owner, so another account never sees or resumes this one's
 * pending trade. A receipt (fresh or replayed after a reload) opens the
 * welcome. Guests and the checking state get nothing.
 */
export function useIndividuals(enabled: boolean) {
  const account = useAccount()
  const mode = modeFor(account.status)
  const userId = account.user?.id
  const ownerKey =
    mode === 'local'
      ? 'local'
      : mode === 'server' && userId
        ? `server:${userId}`
        : null
  const [states, setStates] = useState<Record<number, TradeState>>({})
  const [welcomes, setWelcomes] = useState<{ receipts: TradeReceipt[] }[]>([])
  const welcome = welcomes[0] ?? null
  const [batchSummary, setBatchSummary] = useState<{
    speciesId: number
    receipts: TradeReceipt[]
    failures: { index: number; kind: 'error' | 'uncertain'; code?: string }[]
    uncertain: boolean
  } | null>(null)
  const controller = useRef<ReturnType<typeof createTradeController> | null>(
    null
  )
  const all = useIndividualList(enabled && ownerKey !== null, null)

  useEffect(() => {
    setStates({})
    setWelcomes([])
    setBatchSummary(null)
    controller.current = null
    if (!enabled || !ownerKey) return
    const mine = createTradeController({
      ownerKey,
      storage: window.localStorage,
      submit: (operationId: string, speciesId: number) =>
        submitTrade(mode, operationId, speciesId),
      refresh: async () => {
        refreshShards()
        refreshIndividuals()
      },
      onBatch: (
        speciesId: number,
        result: NonNullable<typeof batchSummary>
      ) => {
        setBatchSummary({ ...result, speciesId })
        setWelcomes((queue: { receipts: TradeReceipt[] }[]) =>
          enqueueWelcome(queue, result.receipts)
        )
      },
      onState: (speciesId: number, state: TradeState) => {
        setStates((s) => ({ ...s, [speciesId]: state }))
        // a batch is shown as one group when it ends (onBatch)
        if (state.kind === 'success' && state.receipt && !state.batch)
          setWelcomes((queue: { receipts: TradeReceipt[] }[]) =>
            enqueueWelcome(queue, [state.receipt!])
          )
      },
    })
    controller.current = mine
    mine.resume()
    return () => {
      mine.dispose()
      if (controller.current === mine) controller.current = null
    }
  }, [enabled, ownerKey, mode])

  const trade = useCallback(
    (speciesId: number) => controller.current?.trade(speciesId),
    []
  )
  const tradeMany = useCallback(
    (speciesId: number, quantity: number, available: number) =>
      controller.current?.tradeMany(speciesId, quantity, available),
    []
  )
  const retryMany = useCallback(
    (speciesId: number) => controller.current?.retryMany(speciesId),
    []
  )
  const name = useNaming()
  const dismissWelcome = useCallback(
    () => setWelcomes((queue) => queue.slice(1)),
    []
  )
  const dismissBatchSummary = useCallback(() => setBatchSummary(null), [])
  const counts = useMemo(() => {
    const out: Record<number, number> = {}
    for (const item of all.items ?? [])
      out[item.speciesId] = (out[item.speciesId] ?? 0) + 1
    return out
  }, [all.items])

  return useMemo(
    () => ({
      available: ownerKey !== null,
      states,
      trade,
      tradeMany,
      retryMany,
      batchSummary,
      dismissBatchSummary,
      name,
      welcome,
      dismissWelcome,
      counts,
    }),
    [
      ownerKey,
      states,
      trade,
      tradeMany,
      retryMany,
      batchSummary,
      dismissBatchSummary,
      name,
      welcome,
      dismissWelcome,
      counts,
    ]
  )
}
