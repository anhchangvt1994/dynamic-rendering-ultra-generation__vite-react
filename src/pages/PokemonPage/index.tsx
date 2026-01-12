import { useGetPokemonDetailQuery } from 'app/apis/pokemon'
import { functionGenerator } from 'utils/EnvHelper'
import {
  BodyStyle,
  HeaderStyle,
  ImageStyle,
  ImageWrapperStyle,
  NameLoadingStyle,
  NameStyle,
  PokemonPageStyle,
} from './styles'

const PokemonPage = () => {
  const route = useRoute()
  const getPokemonDetailPath = functionGenerator(
    import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION
  )
  const { name } = route.params
  const pokemonDetailEndpoint = getPokemonDetailPath(name)
  const [pokemonState, setPokemonState] = useState(
    getAPIStore(pokemonDetailEndpoint)
  )
  const { data, isFetching } = useGetPokemonDetailQuery(name)
  const [isFirstLoading, setIsFirstLoading] = useState(isFetching)
  const pokemonNumber = pokemonState?.id
    ? pokemonState.id.toString().padStart(3, '0')
    : ''
  const isShowLoading =
    RenderingInfo.loader || (isFetching && (!isFirstLoading || !pokemonState))

  console.log('isShowLoading', isShowLoading)

  const onLoad = (img) => {
    img.classList.add('show')
  }

  const onError = (img) => {
    img.classList.add('error')
  }

  useEffect(() => {
    if (data) {
      setPokemonState(data)
    }
  }, [data])

  useEffect(() => {
    if (isFirstLoading && !isFetching) {
      setIsFirstLoading(false)
    }
  }, [isFetching])

  return (
    <PokemonPageStyle>
      <HeaderStyle></HeaderStyle>
      <BodyStyle>
        <ImageWrapperStyle>
          {!isShowLoading && (
            <ImageStyle
              src={`https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/${pokemonNumber}.png`}
              onLoad={(e) => onLoad(e.target)}
              onError={(e) => onError(e.target)}
              alt={name}
            />
          )}
        </ImageWrapperStyle>
        {isShowLoading ? (
          <NameLoadingStyle>
            <div className="stage">
              <div className="dot-flashing"></div>
            </div>
          </NameLoadingStyle>
        ) : (
          <NameStyle>{name}</NameStyle>
        )}
      </BodyStyle>
    </PokemonPageStyle>
  )
}

export default PokemonPage
