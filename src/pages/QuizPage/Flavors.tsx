import styled from 'styled-components'
import type { CSSProperties } from 'react'
import { FLAVOR_INFO, flavorsOf } from './items.mjs'

type Flavor = keyof typeof FLAVOR_INFO

/**
 * What an ingredient tastes of, as chips in the Pokéblock colours, a pip per
 * 10 of potency: the kitchen's clue (src/pages/KitchenPage). Nothing for an
 * item that is no ingredient; "Không vị" for water.
 */
export default function Flavors({
  id,
  className,
}: {
  id: string
  className?: string
}) {
  const flavors = flavorsOf(id) as Partial<Record<Flavor, number>> | null
  if (!flavors) return null
  const entries = (Object.keys(FLAVOR_INFO) as Flavor[]).filter(
    (flavor) => flavors[flavor]
  )
  return (
    // spans with list roles: it also sits inside buttons (the quiz's gift)
    <FlavorsStyle
      role="list"
      className={['flavors', className].filter(Boolean).join(' ')}
      aria-label="Vị"
    >
      {entries.length ? (
        entries.map((flavor) => (
          <span
            role="listitem"
            key={flavor}
            style={{ '--c': FLAVOR_INFO[flavor].color } as CSSProperties}
          >
            {FLAVOR_INFO[flavor].label}
            <span aria-hidden="true" className="pips">
              {'•'.repeat((flavors[flavor] ?? 0) / 10)}
            </span>
            {(flavors[flavor] ?? 0) > 10 && (
              <span className="sr-only"> đậm</span>
            )}
          </span>
        ))
      ) : (
        <span role="listitem" className="plain">
          Không vị
        </span>
      )}
    </FlavorsStyle>
  )
}

const FlavorsStyle = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;

  > span {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px 2px 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--c) 18%, transparent);
    box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--c) 70%, transparent);
    color: inherit;
    font-size: 11px;
    font-weight: 800;
    line-height: 1.4;
    white-space: nowrap;
  }
  > span::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c);
  }
  > span.plain {
    --c: #9aa3b2;
  }
  .pips {
    color: var(--c);
    letter-spacing: -1px;
  }
`
