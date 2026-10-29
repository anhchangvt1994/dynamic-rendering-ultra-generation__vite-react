import FieldIcon, { Pokeball } from 'components/common/FieldIcon'
import {
  getPokemonFallbackImage,
  getPokemonSprite,
} from 'pages/PokemonPage/navigation.mjs'
import { pokemonLabel } from 'components/pokemon-page/format.mjs'
import { useState, useSyncExternalStore } from 'react'
import { isCaught, subscribeCaught } from 'utils/caught.mjs'
import { pokemonId, GENERATIONS } from 'pages/HomePage/catalog.mjs'
import { TYPE_DATA } from 'components/pokemon-page/type-data.mjs'
import { typesOf } from 'components/pokemon-page/type-index.mjs'
import type { CSSProperties } from 'react'
import { DexStyle, NameStyle, PokemonCardStyle } from './styles'

const PokemonCard = ({ pokemon }) => {
  const id = pokemonId(pokemon)
  const caught = useSyncExternalStore(
    subscribeCaught,
    () => isCaught(id),
    () => false
  )
  const [imageFailed, setImageFailed] = useState(false)
  const region = GENERATIONS.find((gen) => id >= gen.start && id <= gen.end)
  // type colours the card: the art's halo (split for dual types) and pills
  const types = typesOf(id)
  const [first, second = first] = types.map((type) => TYPE_DATA[type].color)
  const image =
    id <= 151 ? `/images/pokemon/${id}.webp` : getPokemonFallbackImage(id)
  return (
    <PokemonCardStyle
      to={`/pokemon/${getSlug(pokemon.name)}`}
      data-caught={caught}
      style={{ '--t1': first, '--t2': second } as CSSProperties}
      aria-label={`${pokemonLabel(pokemon.name)}, số ${id}${caught ? ', đã bắt' : ''}`}
    >
      <div className="card-top">
        <DexStyle>#{String(id).padStart(4, '0')}</DexStyle>
        {caught && (
          <span className="caught-mark" aria-label="Đã bắt">
            <FieldIcon name="check" size={12} />
          </span>
        )}
      </div>
      <div className="card-art">
        <span className="card-orbit" aria-hidden="true" />
        {!imageFailed ? (
          <img
            src={image}
            width="160"
            height="142"
            loading="lazy"
            decoding="async"
            alt=""
            onError={(event) => {
              if (!event.currentTarget.dataset.fallback) {
                event.currentTarget.dataset.fallback = 'true'
                event.currentTarget.src = getPokemonSprite(id)
              } else setImageFailed(true)
            }}
          />
        ) : (
          <Pokeball />
        )}
      </div>
      <div className="card-bottom">
        <NameStyle>{pokemonLabel(pokemon.name)}</NameStyle>
        <span className="card-types">
          {types.map((type) => (
            <span
              key={type}
              className="type-pill"
              style={{ '--type': TYPE_DATA[type].color } as CSSProperties}
            >
              {TYPE_DATA[type].label}
            </span>
          ))}
          <span className="card-region">{region?.name}</span>
        </span>
      </div>
    </PokemonCardStyle>
  )
}
export default PokemonCard
