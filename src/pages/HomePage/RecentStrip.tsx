import { useSyncExternalStore } from 'react'
import styled from 'styled-components'
import { pokemonLabel } from 'components/pokemon-page/format.mjs'
import { getFormImages, showNextImage } from 'pages/PokemonPage/navigation.mjs'
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
  /* the row scrolls: chips keep their width instead of being squeezed
     until their names spill into the next one */
  li {
    flex: none;
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
  /* a fallback artwork is a large image scaled down: smooth it */
  img[data-step] {
    image-rendering: auto;
  }
`

// JSON snapshot: a stable string for useSyncExternalStore
const snapshot = () => JSON.stringify(getRecent())

/** "Vừa xem": the last Pokémon opened, newest first. Hidden when empty. */
export default function RecentStrip() {
  const json = useSyncExternalStore(subscribeRecent, snapshot, () => '[]')
  const recent: { id: number; name: string; baseId?: number }[] =
    JSON.parse(json)
  if (!recent.length) return null
  return (
    <RecentStyle aria-labelledby="recent-heading">
      <h2 id="recent-heading">Vừa xem</h2>
      <ol>
        {recent.map((mon) => (
          <li key={mon.name}>
            <LinkCustom to={`/pokemon/${mon.name}`}>
              <img
                src={getFormImages(mon.id, mon.baseId, { small: true })[0]}
                onError={(event) => {
                  // forms without a sprite (Koraidon's builds) fall back to
                  // their artwork, then the default form's; never a hole
                  const image = event.currentTarget
                  const sources = getFormImages(mon.id, mon.baseId, {
                    small: true,
                  })
                  if (!showNextImage(image, sources))
                    image.style.visibility = 'hidden'
                }}
                alt=""
                width={38}
                height={38}
                loading="lazy"
                decoding="async"
              />
              {pokemonLabel(mon.name)}
            </LinkCustom>
          </li>
        ))}
      </ol>
    </RecentStyle>
  )
}
