import { functionGenerator } from 'utils/EnvHelper'
import {
  ImageStyle,
  ImageWrapperStyle,
  NameStyle,
  PokemonCardStyle,
} from './styles'

const PokemonCard = ({ pokemon }) => {
  const pokemonUrlSplit = pokemon?.url?.split('/') ?? ''
  const pokemonId = pokemonUrlSplit
    ? pokemonUrlSplit[pokemonUrlSplit.length - 2]
    : ''
  const onLoad = (img) => {
    img.classList.add('show')
  }

  const onError = (img) => {
    img.classList.add('error')
  }

  const getPokemonDetailUrl = functionGenerator(
    import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION
  )

  return (
    <PokemonCardStyle to={getPokemonDetailUrl?.(pokemonId)}>
      <ImageWrapperStyle>
        <ImageStyle
          alt={pokemon.name}
          onLoad={(e) => onLoad(e.target)}
          onError={(e) => onError(e.target)}
          src={`https://projectpokemon.org/images/normal-sprite/${getSlug(pokemon.name)}.gif`}
          height={60}
        />
      </ImageWrapperStyle>
      <NameStyle>{pokemon.name}</NameStyle>
    </PokemonCardStyle>
  )
}

export default PokemonCard
