import { memo, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { useGetPokemonSpeciesQuery } from 'app/apis/pokemon'
import { idFromUrl, pickFlavorText, pickGenus } from './species.mjs'

/*
 * The Pokédex entry, framed as the device itself: red bezel, the big blue
 * lens and three status LEDs, a dark scan-lined screen. The lens is also
 * the cry button: it pulses while the Pokémon's cry plays.
 */
const EntryStyle = styled.section`
  margin-bottom: 16px;
  padding: 10px 12px 12px;
  border-radius: 14px 14px 14px 36px;
  background: linear-gradient(160deg, #e3350d, #a51d0b);
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.25),
    inset 0 -3px 0 rgba(0, 0, 0, 0.25),
    0 8px 18px rgba(0, 0, 0, 0.3);
  color: #e9fff6;

  .bezel {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  .lens {
    position: relative;
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 3px solid #f4f4f4;
    border-radius: 50%;
    background: radial-gradient(
      circle at 35% 30%,
      #bdf2ff,
      #2a9df4 45%,
      #0b4f8a
    );
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.3);
    cursor: pointer;
    transition: transform 120ms ease-out;
  }
  .lens:disabled {
    cursor: not-allowed;
    filter: saturate(0.4);
  }
  .lens:active:not(:disabled) {
    transform: scale(0.92);
  }
  .lens:focus-visible {
    outline: 2px solid #ffcb05;
    outline-offset: 3px;
  }
  .lens svg {
    width: 20px;
    height: 20px;
    fill: #fff;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.4));
  }
  &[data-playing='true'] .lens {
    animation: entry-lens 0.5s ease-in-out infinite alternate;
  }
  /* sound bars: still at rest, they dance while the cry plays */
  .leds {
    display: flex;
    align-items: center;
    gap: 3px;
    height: 22px;
  }
  .leds i {
    width: 3px;
    height: 6px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.75);
    transform-origin: center;
  }
  &[data-playing='true'] .leds i {
    animation: entry-led 0.42s ease-in-out infinite alternate;
  }
  &[data-playing='true'] .leds i:nth-child(2n) {
    animation-delay: -0.21s;
  }
  &[data-playing='true'] .leds i:nth-child(3n) {
    animation-delay: -0.12s;
  }
  .cry-hint {
    margin-left: auto;
    font-size: 12px;
    font-weight: 600;
    opacity: 0.85;
  }

  .screen {
    position: relative;
    padding: 12px 14px 14px;
    border-radius: 8px;
    background:
      repeating-linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.035) 0 1px,
        transparent 1px 3px
      ),
      #0f2a2a;
    box-shadow:
      inset 0 0 0 2px #0a1c1c,
      inset 0 0 18px rgba(0, 0, 0, 0.6);
  }
  .genus {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px 10px;
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 700;
    color: #7dffc4;
  }
  .badge {
    padding: 1px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    color: #1d2230;
    background: #ffcb05;
  }
  .badge[data-kind='mythical'] {
    background: linear-gradient(90deg, #ff9ae8, #a9d6ff);
  }
  .text {
    margin: 0;
    font-size: 15px;
    line-height: 1.6;
    color: #d9f7ec;
  }
  .text[lang='en'] {
    font-style: italic;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    margin-top: 10px;
    font-size: 13px;
    color: #9fd8c4;
  }
  .meta b {
    color: #e9fff6;
    font-weight: 600;
  }
  .skeleton {
    height: 14px;
    margin-top: 8px;
    border-radius: 4px;
    background: rgba(125, 255, 196, 0.12);
  }

  @keyframes entry-lens {
    from {
      box-shadow: 0 0 0 0 rgba(120, 220, 255, 0.7);
    }
    to {
      box-shadow: 0 0 0 8px rgba(120, 220, 255, 0);
    }
  }
  @keyframes entry-led {
    from {
      transform: scaleY(1);
    }
    to {
      transform: scaleY(3.2);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &[data-playing='true'] .lens,
    &[data-playing='true'] .leds i {
      animation: none;
    }
  }
`

const GROWTH: Record<string, string> = {
  slow: 'Chậm',
  medium: 'Trung bình',
  'medium-slow': 'Hơi chậm',
  fast: 'Nhanh',
  erratic: 'Thất thường',
  fluctuating: 'Dao động',
}

const PokemonEntry = memo(({ pokemon }: { pokemon: any }) => {
  const speciesId = idFromUrl(pokemon?.species?.url)
  const { data: species, isLoading } = useGetPokemonSpeciesQuery(speciesId, {
    skip: !speciesId,
  })
  const cry = pokemon?.cries?.latest || pokemon?.cries?.legacy
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  // a new Pokémon stops the previous cry
  useEffect(
    () => () => {
      audio.current?.pause()
      audio.current = null
      setPlaying(false)
    },
    [cry]
  )

  const playCry = () => {
    if (!cry) return
    audio.current?.pause()
    const sound = new Audio(cry)
    sound.volume = 0.6
    sound.onended = sound.onerror = () => setPlaying(false)
    audio.current = sound
    setPlaying(true)
    sound.play().catch(() => setPlaying(false))
  }

  const genus = pickGenus(species?.genera)
  const text = pickFlavorText(species?.flavor_text_entries)
  const female =
    species?.gender_rate >= 0 ? (species.gender_rate / 8) * 100 : null

  return (
    <EntryStyle data-playing={playing} aria-label="Mục Pokédex">
      <div className="bezel">
        <button
          type="button"
          className="lens"
          onClick={playCry}
          disabled={!cry}
          aria-label={`Nghe tiếng kêu của ${pokemon?.name ?? 'Pokémon'}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.47 4.47 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
          </svg>
        </button>
        <span className="leds" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((bar) => (
            <i key={bar} />
          ))}
        </span>
        {cry && <span className="cry-hint">Chạm ống kính để nghe</span>}
      </div>

      <div className="screen" aria-live="polite">
        {isLoading && !species ? (
          <>
            <div className="skeleton" style={{ width: '40%' }} />
            <div className="skeleton" />
            <div className="skeleton" style={{ width: '80%' }} />
          </>
        ) : (
          <>
            <p className="genus">
              {genus || 'Pokémon'}
              {species?.is_legendary && (
                <span className="badge">Huyền thoại</span>
              )}
              {species?.is_mythical && (
                <span className="badge" data-kind="mythical">
                  Bí ẩn
                </span>
              )}
              {species?.is_baby && <span className="badge">Bé con</span>}
            </p>
            {text && (
              <p className="text" lang="en">
                “{text}”
              </p>
            )}
            {species && (
              <div className="meta">
                <span>
                  Tỉ lệ bắt <b>{species.capture_rate}/255</b>
                </span>
                <span>
                  Giới tính{' '}
                  <b>
                    {female === null
                      ? 'Không có'
                      : `♂ ${100 - female}% · ♀ ${female}%`}
                  </b>
                </span>
                {species.growth_rate && (
                  <span>
                    Tăng cấp{' '}
                    <b>
                      {GROWTH[species.growth_rate.name] ??
                        species.growth_rate.name}
                    </b>
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </EntryStyle>
  )
})

PokemonEntry.displayName = 'PokemonEntry'
export default PokemonEntry
