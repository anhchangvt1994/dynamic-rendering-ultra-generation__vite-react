import { useEffect, useState } from 'react'
import type { QuizEngine, ChestShardReceipt } from '../engine/types'
import { startChestClaim } from './chestClient.mjs'
import { refreshShards } from 'pages/BagPage/shardStore'

type ClaimState = { receipt: ChestShardReceipt | null; error: Error | null }
const EMPTY: ClaimState = { receipt: null, error: null }

export function useChestShards(
  engine: QuizEngine | null,
  roundId: string | undefined,
  kind: 'combo' | 'special' | undefined
) {
  const [attempt, retry] = useState(0)
  // state is tagged with the claim it belongs to, so another chest (or another
  // engine after a sign-out) never shows the previous chest's receipt
  const key = engine && roundId && kind ? `${roundId}:${kind}:${attempt}` : null
  const [state, setState] = useState<{ key: string | null } & ClaimState>({
    key: null,
    ...EMPTY,
  })
  useEffect(() => {
    if (!engine || !roundId || !kind || !key) return
    return startChestClaim(engine, roundId, kind, (next: ClaimState) => {
      setState({ key, ...next })
      if (next.receipt?.state === 'awarded') refreshShards()
    })
  }, [engine, roundId, kind, key])
  const current = state.key === key ? state : EMPTY
  return {
    receipt: current.receipt,
    error: current.error,
    retry: () => retry((n) => n + 1),
  }
}
