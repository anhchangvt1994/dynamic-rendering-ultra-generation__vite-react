import { useEffect, useRef, type CSSProperties } from 'react'
import { randomId } from 'utils/secure.mjs'
import { useReducedMotion } from '../room/useMedia'
import EvoArt from './EvoArt'
import { openEvolution } from './evolutionStore'
import { satelliteView } from './format.mjs'
import { snoozeKey } from './queue.mjs'
import { isSnoozed } from './snooze'
import { EvolveRippleStyle, EvolveSatelliteStyle } from './styles'
import { readyGlow } from './timeline.mjs'
import type { useEvolution } from './useEvolution'
import { useSpeciesNames } from './useSpeciesNames'

type Props = { individualId: string; api: ReturnType<typeof useEvolution> }

/**
 * A bubble on the rim of the Pokémon's disc (12 o'clock): the form it can
 * take now, or a silhouette with level progress. A tap opens the prompt.
 */
export default function EvolveSatellite({ individualId, api }: Props) {
  const nameOf = useSpeciesNames()
  const reduced = useReducedMotion()
  const node = useRef<HTMLButtonElement>(null)
  const ripple = useRef<HTMLSpanElement>(null)
  const view = satelliteView(api.options, api.items) as
    | {
        state: 'ready' | 'soon'
        to: number
        more?: number
        have?: number | null
        need?: number | null
      }
    | null
  const ready = view?.state === 'ready'
  const calm =
    ready && isSnoozed(snoozeKey(individualId, api.options))
  useEffect(() => {
    if (!ready) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const g = readyGlow((now - start) / 1000, { reduced: reduced || calm })
      node.current?.style.setProperty('--g', g.toFixed(3))
      ripple.current?.style.setProperty('--g', g.toFixed(3))
      if (!reduced && !calm) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ready, reduced, calm])
  if (!view) return null
  const soon = view.state === 'soon'
  const pct =
    soon && view.need ? Math.min(100, ((view.have ?? 0) / view.need) * 100) : 0
  const label = soon
    ? view.need
      ? `Tiến hoá thành ${nameOf(view.to)}: Lv ${view.have}/${view.need}`
      : `Xem điều kiện tiến hoá thành ${nameOf(view.to)}`
    : `Có thể tiến hoá thành ${nameOf(view.to)}`
  return (
    <>
      {ready && <EvolveRippleStyle ref={ripple} data-calm={calm || undefined} aria-hidden="true" />}
      <EvolveSatelliteStyle
        ref={node}
        type="button"
        data-evolve-satellite
        data-state={view.state}
        style={{ '--p': `${pct}%` } as CSSProperties}
        aria-label={label}
        title={label}
        onClick={() =>
          openEvolution({
            id: `prompt:${individualId}:${randomId()}`,
            individualId,
            kind: 'prompt',
          })
        }
      >
        <span className="es-aura" aria-hidden="true" />
        <EvoArt id={view.to} className="es-art" />
        {soon && view.need ? (
          <small>
            {view.have}/{view.need}
          </small>
        ) : (
          ready &&
          (view.more ?? 0) > 0 && <small>+{view.more}</small>
        )}
        <span className="es-drop" aria-hidden="true" />
      </EvolveSatelliteStyle>
    </>
  )
}
