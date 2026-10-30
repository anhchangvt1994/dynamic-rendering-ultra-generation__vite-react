import type { CSSProperties } from 'react'
import styled from 'styled-components'
import { GENERATIONS } from './catalog.mjs'

/*
 * One badge per region, like gym badges in a trainer case: an outline at
 * zero, a progress ring as the region fills, gold with a shine when it is
 * complete. Each badge filters the catalogue to that region.
 */
const BadgesStyle = styled.ol`
  /* phones: a sideways strip; wider screens: all nine regions in a row */
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 92px;
  gap: 8px;
  margin: 12px 0 0;
  padding: 2px 2px 6px;
  list-style: none;
  overflow-x: auto;
  /* free momentum: proximity snapping tugged each fling back to a badge's
     edge as it slowed, which read as a stutter. The edge never hands the
     swipe to the browser's back gesture */
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
  /* while it scrolls, it runs under the page gutter to the screen edges */
  @media (max-width: 899px) {
    margin-inline: calc(var(--gutter, 0px) * -1);
    padding-inline: var(--gutter, 0px);
    scroll-padding-inline: var(--gutter, 0px);
  }
  @media (min-width: 900px) {
    grid-auto-flow: row;
    grid-template-columns: repeat(9, minmax(0, 1fr));
    overflow: visible;
  }

  button {
    display: grid;
    justify-items: center;
    gap: 6px;
    width: 100%;
    min-height: 44px;
    padding: 10px 4px 8px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
    transition:
      transform 140ms ease-out,
      box-shadow 140ms ease-out;
  }
  /* a pointer that hovers: on touch, :hover sticks after a tap */
  @media (hover: hover) {
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 14px rgba(23, 45, 69, 0.12);
    }
  }
  button[aria-pressed='true'] {
    border-color: var(--ink);
    box-shadow: inset 0 0 0 1px var(--ink);
  }
  button:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }

  .ring {
    --size: 46px;
    position: relative;
    display: grid;
    place-items: center;
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    background: conic-gradient(var(--ink) calc(var(--p) * 1%), var(--line) 0);
  }
  .ring::before {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: var(--surface);
  }
  .ring b {
    position: relative;
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 400;
    font-variant-numeric: tabular-nums;
  }
  [data-complete='true'] .ring {
    background: conic-gradient(#f5b400, #ffe27a, #f5b400, #ffe27a, #f5b400);
    box-shadow: 0 0 12px rgba(245, 180, 0, 0.55);
  }
  [data-complete='true'] .ring::before {
    background: radial-gradient(circle at 35% 30%, #fff6c8, #ffda55 70%);
  }
  .name {
    font-size: 12px;
    font-weight: 700;
  }
  .count {
    font-size: 11px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
`

export default function RegionBadges({
  caught,
  active,
  onSelect,
}: {
  caught: Set<number>
  active: string
  onSelect: (generation: string) => void
}) {
  return (
    <BadgesStyle aria-label="Tiến độ theo vùng">
      {GENERATIONS.map((gen) => {
        const total = gen.end - gen.start + 1
        let have = 0
        caught.forEach((id) => {
          if (id >= gen.start && id <= gen.end) have++
        })
        const percent = Math.round((have / total) * 100)
        const complete = have === total
        return (
          <li key={gen.id}>
            <button
              type="button"
              data-complete={complete}
              aria-pressed={active === gen.id}
              aria-label={`${gen.name}: đã bắt ${have} trên ${total}${complete ? ', hoàn thành' : ''}. Lọc Pokédex theo vùng này`}
              onClick={() => onSelect(active === gen.id ? '' : gen.id)}
              style={{ '--p': percent } as CSSProperties}
            >
              <span className="ring" aria-hidden="true">
                <b>{complete ? '★' : `${percent}%`}</b>
              </span>
              <span className="name">{gen.name}</span>
              <span className="count">
                {have}/{total}
              </span>
            </button>
          </li>
        )
      })}
    </BadgesStyle>
  )
}
