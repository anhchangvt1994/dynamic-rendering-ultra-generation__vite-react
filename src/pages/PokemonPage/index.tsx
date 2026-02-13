import { useGetPokemonDetailQuery } from 'app/apis/pokemon'
import { useNavigateInfo } from 'app/router/context/InfoContext'
import Image from 'components/common/Image'
import PokemonStats from 'components/pokemon-page/pokemon-stats'
import PokemonStatsLoading from 'components/pokemon-page/pokemon-stats/loading'
import PokemonTypes from 'components/pokemon-page/pokemon-types'
import { functionGenerator } from 'utils/EnvHelper'
import {
  BackButtonStyle,
  BackIconStyle,
  BodyStyle,
  HeaderStyle,
  NameLoadingStyle,
  NameStyle,
  PokemonPageStyle,
} from './styles'

const PokemonPage = () => {
  const route = useRoute()
  const navigateInfo = useNavigateInfo()
  const navigate = useNavigate()
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
  const ImagePath = `https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/${pokemonNumber}.png`

  const onLoad = (img) => {
    img.classList.add('show')
  } // onLoad

  const onError = (img) => {
    img.classList.add('error')
  } // onError

  const handleBack = () => {
    if (!navigateInfo.from) return navigate(import.meta.env.ROUTER_HOME_PATH)

    navigate(-1)
  } // handleBack

  const pokemonStats = isShowLoading ? (
    <PokemonStatsLoading />
  ) : (
    <PokemonStats stats={pokemonState?.stats ?? []} />
  )

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

  useEffect(() => {
    if (pokemonState) {
      setSeoTag({
        title: pokemonState.name || 'Pokemon',
        'og:type': 'website',
        'og:title': pokemonState.name || 'Pokemon',
        'og:description': `Pokemon ${pokemonState.name || ''}`,
        description: `Pokemon ${pokemonState.name || ''}`,
        'og:url': window.location.pathname,
        'og:site_name': `Pokemon ${pokemonState.name || ''}`,
        'og:image': ImagePath,
        'twitter:image': ImagePath,
        'og:image:width': '1200',
        'og:image:height': '628',
        robots: 'index, follow',
      })
    }
  }, [JSON.stringify(pokemonState)])

  return (
    <PokemonPageStyle>
      <HeaderStyle>
        <BackButtonStyle onClick={handleBack}>
          <BackIconStyle />
        </BackButtonStyle>
      </HeaderStyle>
      <BodyStyle>
        {!isShowLoading && <PokemonTypes types={pokemonState?.types ?? []} />}
        <Image
          src={ImagePath}
          onLoad={(e) => onLoad(e.target)}
          onError={(e) => onError(e.target)}
          alt={name}
          width={'100%'}
          height={150}
        />
        {isShowLoading ? (
          <NameLoadingStyle>
            <div className="stage">
              <div className="dot-flashing"></div>
            </div>
          </NameLoadingStyle>
        ) : (
          <NameStyle>{name}</NameStyle>
        )}

        {pokemonStats}
      </BodyStyle>
    </PokemonPageStyle>
  )
}

export default PokemonPage
