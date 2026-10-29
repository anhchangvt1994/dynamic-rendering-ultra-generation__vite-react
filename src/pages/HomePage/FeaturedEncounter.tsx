import { useState } from 'react'
import type { CSSProperties } from 'react'
import FieldIcon from 'components/common/FieldIcon'
import { getPokemonFallbackImage } from 'pages/PokemonPage/navigation.mjs'
import { HeroStyle } from './styles'

const encounters = [
  {
    id: 25,
    name: 'Pikachu',
    type: 'Điện',
    code: 'ELECTRIC',
    color: '#ffda55',
    note: 'Nhỏ bé. Năng lượng thì không.',
    word: 'PIKA!',
    path: 'pikachu',
  },
  {
    id: 6,
    name: 'Charizard',
    type: 'Lửa · Bay',
    code: 'FIRE / FLYING',
    color: '#f7b78b',
    note: 'Một cuộc gặp. Cả bầu trời rực lửa.',
    word: 'ROAR!',
    path: 'charizard',
  },
  {
    id: 94,
    name: 'Gengar',
    type: 'Ma · Độc',
    code: 'GHOST / POISON',
    color: '#c9b7ee',
    note: 'Có gì đó đang cười trong bóng tối.',
    word: 'BOO!',
    path: 'gengar',
  },
]

export default function FeaturedEncounter({
  onExplore,
  onRandom,
}: {
  onExplore: () => void
  onRandom: () => void
}) {
  const [selected, setSelected] = useState(0)
  const pokemon = encounters[selected]
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
          <span>#{String(pokemon.id).padStart(4, '0')}</span>
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
            aria-label={`Khám phá ${pokemon.name}`}
          >
            <img
              key={pokemon.id}
              src={`/images/pokemon/hero-${pokemon.id}.webp`}
              width="360"
              height="360"
              alt={pokemon.name}
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
              {pokemon.name} <span>↗</span>
            </LinkCustom>
            <p>{pokemon.note}</p>
          </div>
          <div className="encounter-picker" aria-label="Chọn Pokémon nổi bật">
            {encounters.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Xem ${item.name}`}
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
              >
                <img
                  src={`/images/pokemon/${item.id}.webp`}
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
