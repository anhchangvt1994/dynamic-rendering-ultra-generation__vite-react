import { useEffect, useRef } from 'react'
import { randomId } from 'utils/secure.mjs'
import { useReducedMotion } from '../room/useMedia'
import { openEvolution } from './evolutionStore'
import { snoozeKey } from './queue.mjs'
import { isSnoozed } from './snooze'
import { EvolveBadgeStyle } from './styles'
import { readyGlow } from './timeline.mjs'
import { useEvolution } from './useEvolution'

type Props = { individualId: string; version?: number; inline?: boolean }

/** A water drop on a card whose Pokémon can evolve; a click opens the prompt. */
export default function EvolveBadge({ individualId, version = 0, inline }: Props) {
  const { options, ready } = useEvolution(individualId, version)
  const reduced = useReducedMotion()
  const node = useRef<HTMLButtonElement>(null)
  const calm = ready.length > 0 && isSnoozed(snoozeKey(individualId, options))
  const on = ready.length > 0
  useEffect(() => {
    if (!on) return
    const el = node.current
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const g = readyGlow((now - start) / 1000, { reduced: reduced || calm })
      el?.style.setProperty('--g', g.toFixed(3))
      if (!reduced && !calm) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [on, reduced, calm])
  if (!on) return null
  return (
    <EvolveBadgeStyle
      ref={node}
      type="button"
      data-evolve-badge
      data-inline={inline || undefined}
      aria-label="Có thể tiến hoá"
      title="Có thể tiến hoá"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        openEvolution({
          id: `prompt:${individualId}:${randomId()}`,
          individualId,
          kind: 'prompt',
        })
      }}
    >
      <span className="eb-disc" />
      <span className="eb-aura" />
      <span className="eb-drop" aria-hidden="true" />
      <span className="eb-star" aria-hidden="true" />
    </EvolveBadgeStyle>
  )
}
