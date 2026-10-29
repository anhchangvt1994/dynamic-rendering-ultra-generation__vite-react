import { memo } from 'react'
import PokemonInfo from 'components/pokemon-page/pokemon-info'
import PokemonMoveset from 'components/pokemon-page/pokemon-moveset'
import PokemonStats from 'components/pokemon-page/pokemon-stats'
import PokemonPower from './PokemonPower'
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
      <PokemonStats stats={pokemon.stats ?? []} />
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
      <div>
        <i className="skeleton-shape" />
        <i className="skeleton-shape" />
      </div>
    </div>
    <div className="skeleton-stats">
      {import.meta.env.INFO_POKEMON_STATS_DEFAULT.map((item, index) => (
        <div className="skeleton-stat" key={item.stat.name}>
          <div className="skeleton-stat-label">
            <span>{item.stat.name}</span>
            <span className="skeleton-shape skeleton-value" />
          </div>
          <div className="skeleton-track">
            <span
              className="skeleton-shape"
              style={{ width: `${[54, 72, 43, 64, 48, 80][index]}%` }}
            />
          </div>
        </div>
      ))}
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
