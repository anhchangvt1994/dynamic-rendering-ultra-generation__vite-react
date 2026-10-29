import Image from 'components/common/Image'
import { getPokemonSprite } from 'pages/PokemonPage/navigation.mjs'
import { functionGenerator } from 'utils/EnvHelper'
import { useSyncExternalStore } from 'react'
import { isCaught, subscribeCaught } from 'utils/caught.mjs'
import { CaughtStyle, DexStyle, NameStyle, PokemonCardStyle } from './styles'

const getPokemonDetailUrl = functionGenerator(
  import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION
)

const PokemonCard = ({ pokemon }) => {
  // ".../pokemon/445/" → "#0445"
  const id = pokemon.url?.match(/\/(\d+)\/?$/)?.[1]
  const dexNumber = id ? `#${id.padStart(4, '0')}` : ''
  const caught = useSyncExternalStore(
    subscribeCaught,
    () => isCaught(Number(id)),
    () => false
  )

  return (
    <PokemonCardStyle to={getPokemonDetailUrl(getSlug(pokemon.name))}>
      {dexNumber && <DexStyle aria-hidden="true">{dexNumber}</DexStyle>}
      {caught && (
        <CaughtStyle viewBox="0 0 24 24" role="img" aria-label="Đã bắt">
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="#f4f4f4"
            stroke="#222"
            strokeWidth="2"
          />
          <path
            d="M2 12a10 10 0 0 1 20 0z"
            fill="#e3350d"
            stroke="#222"
            strokeWidth="2"
          />
          <path d="M2 12h20" stroke="#222" strokeWidth="2" />
          <circle
            cx="12"
            cy="12"
            r="3.2"
            fill="#f4f4f4"
            stroke="#222"
            strokeWidth="2"
          />
        </CaughtStyle>
      )}
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
