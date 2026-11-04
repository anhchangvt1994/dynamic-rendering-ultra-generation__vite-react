import type { QuizEngine, ShardReceipt } from '../engine/types'
import { parseReceipt } from './receipt.mjs'

export { parseReceipt }

export type ShardClaim =
  | { kind: 'claiming' }
  | { kind: 'receipt'; receipt: ShardReceipt }
  | { kind: 'error' }
  // the browser journal can never settle this round: nothing to retry
  | { kind: 'unavailable' }

const PERMANENT = ['locks_unavailable', 'journal_corrupt', 'no_round']
const isPermanent = (error: any) =>
  PERMANENT.includes(error?.code) || PERMANENT.includes(error?.message)

/** The notice offers a retry for a failure or a claim still pending. */
export const canRetry = (state: ShardClaim) =>
  state.kind === 'error' ||
  (state.kind === 'receipt' && state.receipt.state === 'pending')

/**
 * Claims a right answer's shard apart from the verdict: a failure leaves the
 * verdict as it was. Returns the cancel; once called (the engine changed, the
 * page left), no later state is delivered. Guests make no claim at all.
 */
export function startShardClaim(
  engine: Pick<QuizEngine, 'rewards' | 'claimShard'>,
  roundId: string,
  onState: (state: ShardClaim) => void
): () => void {
  if (!engine.rewards) return () => {}
  let live = true
  const emit = (state: ShardClaim) => {
    if (live) onState(state)
  }
  emit({ kind: 'claiming' })
  engine.claimShard(roundId).then(
    (receipt) => emit({ kind: 'receipt', receipt }),
    (error) => emit({ kind: isPermanent(error) ? 'unavailable' : 'error' })
  )
  return () => {
    live = false
  }
}

/** What the notice says; nothing for a miss, no promise to a guest. */
export function shardMessage(state: ShardClaim, name: string): string | null {
  if (state.kind === 'claiming') return 'Đang xác nhận mảnh'
  if (state.kind !== 'receipt') return null
  if (state.receipt.state === 'awarded') return `Nhận 1 mảnh ${name}`
  if (state.receipt.state === 'pending') return 'Đang xác nhận mảnh'
  return null
}
