import { useCallback } from 'react'
import { QUESTS, questState } from './quests.mjs'
import type { ClaimReceipt, QuestItem, useMiniGame } from './useMiniGame'

export type QuestRow = QuestItem & { label: string; state: 'doing' | 'done' | 'claimed' }

/** Today's quests and the streak, read from the mini game status; a claim refreshes it. */
export function useQuests(mg: ReturnType<typeof useMiniGame>) {
  const quests = mg.status?.quests
  const items: QuestRow[] = (quests?.items ?? []).map((item) => ({
    ...item,
    label: QUESTS.find((q) => q.kind === item.kind)?.label ?? item.kind,
    state: questState(item),
  }))
  const claim = useCallback(
    (slot: number): Promise<ClaimReceipt> => mg.claim(slot),
    [mg.claim] // eslint-disable-line react-hooks/exhaustive-deps
  )
  return {
    items,
    streak: quests?.streak ?? 0,
    claim,
    canClaim: mg.mode === 'server' && items.some((i) => i.state === 'done'),
  }
}
