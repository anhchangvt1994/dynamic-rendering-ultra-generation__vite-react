import FieldIcon, { Pokeball } from 'components/common/FieldIcon'
import {
  getPokemonFallbackImage,
  getPokemonSprite,
} from 'pages/PokemonPage/navigation.mjs'
import { titleCase } from 'components/pokemon-page/format.mjs'
import { useState, useSyncExternalStore } from 'react'
import { isCaught, subscribeCaught } from 'utils/caught.mjs'
import { pokemonId, GENERATIONS } from 'pages/HomePage/catalog.mjs'
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
  const image =
    id <= 151 ? `/images/pokemon/${id}.webp` : getPokemonFallbackImage(id)
  return (
    <PokemonCardStyle
      to={`/pokemon/${getSlug(pokemon.name)}`}
      data-caught={caught}
      aria-label={`${titleCase(pokemon.name)}, số ${id}${caught ? ', đã bắt' : ''}`}
    >
      <div className="card-top">
        <DexStyle>#{String(id).padStart(4, '0')}</DexStyle>
        {caught ? (
          <span className="caught-mark" aria-label="Đã bắt">
            <FieldIcon name="check" size={12} />
          </span>
        ) : (
          <span className="card-arrow" aria-hidden="true">
            ↗
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
        <NameStyle>{titleCase(pokemon.name)}</NameStyle>
        <span className="card-region">
          {region?.name}
          <i />
          {caught ? 'Đã bắt' : 'Khám phá'}
        </span>
      </div>
    </PokemonCardStyle>
  )
}
export default PokemonCard
