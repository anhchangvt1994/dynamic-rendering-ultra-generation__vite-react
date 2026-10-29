import Image from 'components/common/Image'
import { functionGenerator } from 'utils/EnvHelper'
import { DexStyle, NameStyle, PokemonCardStyle } from './styles'

const PokemonCard = ({ pokemon }) => {
  const getSlugUnderScore = useMemo(() => getCustomSlug('_'), [])

  // ".../pokemon/445/" → "#0445"
  const id = pokemon.url?.match(/\/(\d+)\/?$/)?.[1]
  const dexNumber = id ? `#${id.padStart(4, '0')}` : ''

  const getPokemonDetailUrl = functionGenerator(
    import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION
  )

  return (
    <PokemonCardStyle to={getPokemonDetailUrl(getSlug(pokemon.name))}>
      {dexNumber && <DexStyle aria-hidden="true">{dexNumber}</DexStyle>}
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
