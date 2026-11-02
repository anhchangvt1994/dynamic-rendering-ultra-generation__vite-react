import styled from 'styled-components'
import type { CSSProperties } from 'react'
import { STATS } from './kitchen.mjs'
import type { StatKey } from './engine/types'

/** A dish's stats as chips, in their flavours' colours. */
export default function StatChips({
  stats,
}: {
  stats: Partial<Record<StatKey, number>>
}) {
  return (
    <StatChipsStyle className="stat-chips" aria-label="Chỉ số">
      {(Object.entries(stats) as [StatKey, number][]).map(([stat, points]) => (
        <li key={stat} style={{ '--c': STATS[stat].color } as CSSProperties}>
          {STATS[stat].label} <b>+{points}</b>
        </li>
      ))}
    </StatChipsStyle>
  )
}

const StatChipsStyle = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0 0 6px;
  padding: 0;
  list-style: none;

  li {
    padding: 2px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--c) 20%, #fff);
    box-shadow: inset 0 0 0 1.5px var(--c);
    color: #172d45;
    font-size: 11px;
    font-weight: 800;
  }
`
