import { useSyncExternalStore } from 'react'
import styled from 'styled-components'
import { titleCase } from 'components/pokemon-page/format.mjs'
import { getPokemonSprite } from 'pages/PokemonPage/navigation.mjs'
import { getRecent, subscribeRecent } from 'utils/recent.mjs'

const RecentStyle = styled.section`
  margin-top: 18px;

  h2 {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 700;
    color: var(--muted);
  }
  ol {
    display: flex;
    gap: 8px;
    margin: 0;
    padding: 2px 2px 6px;
    list-style: none;
    overflow-x: auto;
    scrollbar-width: none;
  }
  ol::-webkit-scrollbar {
    display: none;
  }
  a {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 44px;
    padding: 0 14px 0 4px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink);
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    text-decoration: none;
    transition: transform 120ms ease-out;
  }
  a:hover {
    transform: translateY(-2px);
  }
  a:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
  img {
    width: 38px;
    height: 38px;
    image-rendering: pixelated;
  }
`

// JSON snapshot: a stable string for useSyncExternalStore
const snapshot = () => JSON.stringify(getRecent())

/** "Vừa xem": the last Pokémon opened, newest first. Hidden when empty. */
export default function RecentStrip() {
  const json = useSyncExternalStore(subscribeRecent, snapshot, () => '[]')
  const recent: { id: number; name: string }[] = JSON.parse(json)
  if (!recent.length) return null
  return (
    <RecentStyle aria-labelledby="recent-heading">
      <h2 id="recent-heading">Vừa xem</h2>
      <ol>
        {recent.map((mon) => (
          <li key={mon.name}>
            <LinkCustom to={`/pokemon/${mon.name}`}>
              <img
                src={getPokemonSprite(mon.id)}
                alt=""
                width={38}
                height={38}
                loading="lazy"
                decoding="async"
              />
              {titleCase(mon.name)}
            </LinkCustom>
          </li>
        ))}
      </ol>
    </RecentStyle>
  )
}
