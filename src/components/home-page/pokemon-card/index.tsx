import Image from 'components/common/Image'
import { getPokemonSprite } from 'pages/PokemonPage/navigation.mjs'
import { functionGenerator } from 'utils/EnvHelper'
import { DexStyle, NameStyle, PokemonCardStyle } from './styles'

const getPokemonDetailUrl = functionGenerator(
  import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION
)

const PokemonCard = ({ pokemon }) => {
  // ".../pokemon/445/" → "#0445"
  const id = pokemon.url?.match(/\/(\d+)\/?$/)?.[1]
  const dexNumber = id ? `#${id.padStart(4, '0')}` : ''

  return (
    <PokemonCardStyle to={getPokemonDetailUrl(getSlug(pokemon.name))}>
      {dexNumber && <DexStyle aria-hidden="true">{dexNumber}</DexStyle>}
      <Image
        alt={pokemon.name}
        src={getPokemonSprite(id)}
        width={'100%'}
        height={88}
      />
      <NameStyle>{pokemon.name}</NameStyle>
    </PokemonCardStyle>
  )
}

export default PokemonCard
