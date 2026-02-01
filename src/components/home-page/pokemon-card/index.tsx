import Image from 'components/common/Image'
import { functionGenerator } from 'utils/EnvHelper'
import { NameStyle, PokemonCardStyle } from './styles'

const PokemonCard = ({ pokemon }) => {
  const getSlugUnderScore = useCallback(getCustomSlug('_'), [])

  const getPokemonDetailUrl = functionGenerator(
    import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION
  )

  return (
    <PokemonCardStyle to={getPokemonDetailUrl(getSlug(pokemon.name))}>
      <Image
        alt={pokemon.name}
        src={`https://projectpokemon.org/images/normal-sprite/${getSlugUnderScore(pokemon.name)}.gif`}
        width={'100%'}
        height={60}
      />
      <NameStyle>{pokemon.name}</NameStyle>
    </PokemonCardStyle>
  )
}

export default PokemonCard
