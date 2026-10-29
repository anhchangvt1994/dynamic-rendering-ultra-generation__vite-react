import type { CSSProperties } from 'react'
import { memo } from 'react'
import PokemonInfo from 'components/pokemon-page/pokemon-info'
import PokemonMoveset from 'components/pokemon-page/pokemon-moveset'
import PokemonPower from './PokemonPower'
import PokemonStatRadar from './PokemonStatRadar'
import { DetailsSkeletonStyle } from './styles'

// Keep the long moveset tree mounted and memoized while the carousel is moving.
// Hiding it preserves the page height and avoids rebuilding it on every slide.
const PokemonDetails = memo(({ pokemon }: { pokemon: any }) => {
  if (!pokemon) return null
  const headingStyle = {
    display: RenderingInfo.type !== 'ISR' ? 'none' : 'inline-block',
  }
  return (
    <>
      <h2 style={headingStyle}>
        Chỉ số cơ bản (Base Stats) của {pokemon.name}
      </h2>
      <PokemonPower stats={pokemon.stats ?? []} />
      <PokemonStatRadar stats={pokemon.stats ?? []} />
      <h3 style={headingStyle}>
        Chiều cao, cân nặng và khả năng đặc biệt (Abilities) của {pokemon.name}
      </h3>
      <PokemonInfo
        height={pokemon.height}
        weight={pokemon.weight}
        abilities={pokemon.abilities ?? []}
      />
      <h2 style={headingStyle}>
        Bộ chiêu thức (Moveset) của {pokemon.name} và cách học
      </h2>
      <PokemonMoveset moveset={pokemon.moves ?? []} />
    </>
  )
})

PokemonDetails.displayName = 'PokemonDetails'

export const PokemonDetailsSkeleton = () => (
  <DetailsSkeletonStyle aria-hidden="true">
    <div className="skeleton-card skeleton-power">
      <i className="skeleton-shape" />
      <div className="skeleton-ladder">
        {Array.from({ length: 10 }, (_, i) => (
          <i
            key={i}
            className="skeleton-shape"
            style={{ '--i': i } as CSSProperties}
          />
        ))}
      </div>
      <i className="skeleton-shape" />
    </div>
    <div className="skeleton-card skeleton-radar">
      <i className="skeleton-shape" />
    </div>
    <div className="skeleton-card skeleton-measurements">
      <span>Chiều cao</span>
      <span>Cân nặng</span>
      <i className="skeleton-shape" />
      <i className="skeleton-shape" />
    </div>
    <div className="skeleton-card">
      <span>Khả năng đặc biệt</span>
      <div className="skeleton-pills">
        <i className="skeleton-shape" />
        <i className="skeleton-shape" />
      </div>
    </div>
    <div className="skeleton-card">
      <span>Chiêu thức (Moveset)</span>
      {[0, 1, 2, 3].map((row) => (
        <div className="skeleton-move" key={row}>
          <i className="skeleton-shape" />
          <i className="skeleton-shape" />
        </div>
      ))}
    </div>
  </DetailsSkeletonStyle>
)

export default PokemonDetails
