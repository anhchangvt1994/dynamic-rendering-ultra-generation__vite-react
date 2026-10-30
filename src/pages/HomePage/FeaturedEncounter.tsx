import { useGetPokemonListQuery } from 'app/apis/pokemon'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import FieldIcon from 'components/common/FieldIcon'
import {
  POKEMON_COUNT,
  getPokemonFallbackImage,
  getPokemonImage,
  getPokemonSprite,
} from 'pages/PokemonPage/navigation.mjs'
import { buildEncounter, pickEncounterIds, wordLength } from './encounter.mjs'
import EncounterThrow, { THROW_MS, THROW_OPEN_MS } from './EncounterThrow'
import RerollArt from './RerollArt'
import { HeroStyle } from './styles'

// set once the visitor has seen (or used) the reroll ball's hint
const HINT_KEY = 'pokedex:reroll-hint'

export default function FeaturedEncounter({
  onExplore,
  onRandom,
}: {
  onExplore: () => void
  onRandom: () => void
}) {
  // three Pokémon from the whole Pokédex, drawn from this very second
  // (encounter.mjs); the app renders on the client, so no markup to match
  const [ids, setIds] = useState(() => pickEncounterIds(new Date()))
  const [selected, setSelected] = useState(0)
  // the Poké Ball button draws a new trio: this moment plus the roll count.
  // It is thrown at the art and the new Pokémon pops out as it opens.
  const roll = useRef(0)
  const artRef = useRef<HTMLDivElement>(null)
  const [throwFx, setThrowFx] = useState<{
    key: number
    from: { x: number; y: number }
  } | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const [hint, setHint] = useState(false)
  // first visit: a speech bubble says what the ball does, once
  const hideHint = () => {
    setHint(false)
    try {
      localStorage.setItem(HINT_KEY, '1')
    } catch {
      // blocked storage: the hint may show again, nothing breaks
    }
  }
  useEffect(() => {
    let seen = true
    try {
      seen = !!localStorage.getItem(HINT_KEY)
    } catch {
      // no storage, no hint
    }
    if (seen) return
    const show = setTimeout(() => setHint(true), 1200)
    const hide = setTimeout(hideHint, 5200)
    return () => {
      clearTimeout(show)
      clearTimeout(hide)
    }
  }, [])
  const reroll = (event: MouseEvent<HTMLButtonElement>) => {
    if (throwFx) return
    hideHint()
    roll.current += 1
    const draw = () => {
      setIds(pickEncounterIds(new Date(), 3, POKEMON_COUNT, roll.current))
      setSelected(0)
    }
    const art = artRef.current?.getBoundingClientRect()
    if (!art || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw()
      return
    }
    const ball = event.currentTarget.getBoundingClientRect()
    setThrowFx({
      key: roll.current,
      from: {
        x: ball.left + ball.width / 2 - (art.left + art.width / 2),
        y: ball.top + ball.height / 2 - (art.top + art.height / 2),
      },
    })
    timers.current.push(
      setTimeout(draw, THROW_OPEN_MS),
      setTimeout(() => setThrowFx(null), THROW_MS)
    )
  }
  // the same request as the catalogue below: names come from its cache
  const { data } = useGetPokemonListQuery({ limit: POKEMON_COUNT, offset: 0 })
  const encounters = useMemo(
    () => ids.map((id) => buildEncounter(id, data?.results?.[id - 1]?.name)),
    [ids, data]
  )
  const pokemon = encounters[selected]
  const dex = `#${String(pokemon.id).padStart(4, '0')}`
  return (
    <HeroStyle style={{ '--encounter': pokemon.color } as CSSProperties}>
      <div className="hero-copy">
        <span className="eyebrow">
          <i /> NHẬT KÝ CỦA MỘT NHÀ HUẤN LUYỆN
        </span>
        <h1>
          Một thế giới.
          <br />
          <span>Ngàn người bạn.</span>
        </h1>
        <p>
          Khám phá Pokémon. Tìm người bạn đồng hành.
          <br />
          Viết tiếp hành trình của riêng bạn.
        </p>
        <div className="hero-actions">
          <button className="explore" type="button" onClick={onExplore}>
            Mở Pokédex <FieldIcon name="arrow" size={18} />
          </button>
          <button className="random" type="button" onClick={onRandom}>
            <FieldIcon name="shuffle" size={17} /> Gặp ngẫu nhiên
          </button>
          <LinkCustom className="random quiz-link" to="/ai-day">
            <span className="quiz-badge" aria-hidden="true">
              ?
            </span>
            Chơi “Ai đây?”
          </LinkCustom>
        </div>
        <div className="hero-footnote">
          <span>1.025 Pokémon</span>
          <i />
          <span>9 thế hệ</span>
          <i />
          <span>Vô vàn câu chuyện</span>
        </div>
      </div>
      <div className="encounter">
        <button
          type="button"
          className="reroll"
          aria-label="Gặp ba Pokémon khác"
          title="Gặp ba Pokémon khác"
          data-throwing={!!throwFx}
          onClick={reroll}
        >
          {/* keyed: once thrown, a fresh ball pops back onto the corner */}
          <RerollArt key={throwFx ? 'away' : 'home'} />
          {hint && (
            <span className="reroll-hint" aria-hidden="true">
              Đổi bạn khác!
            </span>
          )}
        </button>
        <div className="encounter-top">
          <span>
            <i /> CUỘC GẶP HÔM NAY
          </span>
          <span>{dex}</span>
        </div>
        <div className="encounter-art" ref={artRef}>
          {throwFx && <EncounterThrow key={throwFx.key} from={throwFx.from} />}
          <span
            className="encounter-word"
            aria-hidden="true"
            style={{ '--len': wordLength(pokemon.word) } as CSSProperties}
          >
            {pokemon.word}
          </span>
          <span className="orbit orbit-one" aria-hidden="true" />
          <span className="orbit orbit-two" aria-hidden="true" />
          <span className="spark spark-one" aria-hidden="true">
            ✦
          </span>
          <span className="spark spark-two" aria-hidden="true">
            ✧
          </span>
          <LinkCustom
            to={`/pokemon/${pokemon.path}`}
            aria-label={`Khám phá ${pokemon.name || dex}`}
          >
            <img
              key={pokemon.id}
              src={pokemon.art ?? getPokemonImage(pokemon.id)}
              width="360"
              height="360"
              alt={pokemon.name || dex}
              fetchPriority="high"
              onError={(event) => {
                if (!event.currentTarget.dataset.fallback) {
                  event.currentTarget.dataset.fallback = 'true'
                  event.currentTarget.src = getPokemonFallbackImage(pokemon.id)
                }
              }}
            />
          </LinkCustom>
          <span className="type-stamp">
            {pokemon.code}
            <FieldIcon name="spark" size={14} />
          </span>
        </div>
        <div className="encounter-bottom">
          <div aria-live="polite">
            <LinkCustom to={`/pokemon/${pokemon.path}`}>
              {pokemon.name || dex} <span>↗</span>
            </LinkCustom>
            <p>{pokemon.note}</p>
          </div>
          <div className="encounter-picker" aria-label="Chọn Pokémon nổi bật">
            {encounters.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Xem ${item.name || `#${item.id}`}`}
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
              >
                <img
                  src={item.coin ?? getPokemonSprite(item.id)}
                  alt=""
                  width="32"
                  height="32"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </HeroStyle>
  )
}
