import { functionGenerator } from 'utils/EnvHelper'
import {
  ImageStyle,
  ImageWrapperStyle,
  NameStyle,
  PokemonCardStyle,
} from './styles'

const PokemonCard = ({ pokemon }) => {
  const getSlugUnderScore = useCallback(getCustomSlug('_'), [])
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
    <PokemonCardStyle to={getPokemonDetailUrl(getSlug(pokemon.name))}>
      <ImageWrapperStyle>
        <ImageStyle
          alt={pokemon.name}
          onLoad={(e) => onLoad(e.target)}
          onError={(e) => onError(e.target)}
          src={`https://projectpokemon.org/images/normal-sprite/${getSlugUnderScore(pokemon.name)}.gif`}
          height={60}
        />
      </ImageWrapperStyle>
      <NameStyle>{pokemon.name}</NameStyle>
    </PokemonCardStyle>
  )
}

export default PokemonCard
