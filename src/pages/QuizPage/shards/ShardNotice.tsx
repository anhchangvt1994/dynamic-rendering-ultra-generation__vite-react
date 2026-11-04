import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import type { QuizEngine } from '../engine/types'
import { canRetry, shardMessage, startShardClaim } from './client'
import type { ShardClaim } from './client'

const Notice = styled.p`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.9);
  /* the dropped shard shows as a card (ShardDrop): this stays for readers */
  &[data-state='awarded'] {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  button {
    font: inherit;
    color: inherit;
    text-decoration: underline;
    background: none;
    border: 0;
    padding: 4px 0;
    cursor: pointer;
  }
`

/**
 * The claim of a right answer's shard, apart from the verdict: tied to the
 * engine and the round, so an old account's late reply is never shown.
 * `roundId` is null until a right verdict (and for guests, never).
 */
export function useShardClaim(
  engine: QuizEngine | null,
  roundId: string | null,
  onSettled?: () => void
) {
  const [claim, setClaim] = useState<ShardClaim | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setClaim(null)
    if (!engine || !roundId) return
    return startShardClaim(engine, roundId, (state) => {
      setClaim(state)
      if (state.kind === 'receipt' && state.receipt.state === 'awarded')
        onSettled?.()
    })
    // a settled callback that changes must not claim twice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, roundId, attempt])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { claim, retry }
}

function useSlow(on: boolean) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    setSlow(false)
    if (!on) return
    const timer = window.setTimeout(() => setSlow(true), 500)
    return () => window.clearTimeout(timer)
  }, [on])
  return slow
}

export default function ShardNotice({
  claim,
  name,
  onRetry,
}: {
  claim: ShardClaim | null
  name: string
  onRetry: () => void
}) {
  // a verdict's claim usually settles in a blink: no flash of "checking"
  const slow = useSlow(claim?.kind === 'claiming')
  // the live region stays mounted, its text changes: screen readers announce it
  const text =
    claim?.kind === 'claiming' && !slow
      ? null
      : claim
        ? claim.kind === 'error'
          ? 'Chưa xác nhận được mảnh.'
          : shardMessage(claim, name)
        : null
  if (!claim && !text) return <Notice role="status" hidden />
  return (
    <Notice
      role="status"
      hidden={!text}
      data-state={
        claim?.kind === 'receipt' ? claim.receipt.state : (claim?.kind ?? '')
      }
    >
      {text}
      {claim && canRetry(claim) && (
        <button type="button" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </Notice>
  )
}
