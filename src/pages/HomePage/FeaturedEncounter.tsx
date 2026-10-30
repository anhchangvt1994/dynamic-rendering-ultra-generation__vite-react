import { useGetPokemonListQuery } from 'app/apis/pokemon'
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import FieldIcon from 'components/common/FieldIcon'
import {
  POKEMON_COUNT,
  getPokemonFallbackImage,
  getPokemonImage,
  getPokemonSprite,
} from 'pages/PokemonPage/navigation.mjs'
import { buildEncounter, pickEncounterIds } from './encounter.mjs'
import { HeroStyle } from './styles'

export default function FeaturedEncounter({
  onExplore,
  onRandom,
}: {
  onExplore: () => void
  onRandom: () => void
}) {
  // three Pokémon from the whole Pokédex, drawn from this very second
  // (encounter.mjs); the app renders on the client, so no markup to match
  const [ids] = useState(() => pickEncounterIds(new Date()))
  const [selected, setSelected] = useState(0)
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
        <div className="encounter-top">
          <span>
            <i /> CUỘC GẶP HÔM NAY
          </span>
          <span>{dex}</span>
        </div>
        <div className="encounter-art">
          <span className="encounter-word" aria-hidden="true">
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
