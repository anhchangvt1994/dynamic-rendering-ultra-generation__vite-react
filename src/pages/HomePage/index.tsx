import { useGetPokemonListQuery } from 'app/apis/pokemon'
import PokemonCard from 'components/home-page/pokemon-card'
import PokemonCardLoading from 'components/home-page/pokemon-card/loading'
import { PokemonListStyle } from './styles'

function HomePage() {
  setTitleTag('Trang chủ')
  setSeoTag({
    'og:type': 'website',
    'og:title': 'Trang chủ',
    'og:description': 'Trang chủ React and WSC-SEO',
    'og:url': window.location.pathname,
    'og:site_name': 'React and WSC-SEO',
    'og:image': '',
    'og:image:width': '1200',
    'og:image:height': '628',
    robots: 'index, follow',
  })

  const [pokemonListState, setPokemonListState] = useState(
    getAPIStore(import.meta.env.API_ENDPOINT_GET_POKEMON_LIST)?.results ?? {}
  )

  const { data, isFetching } = useGetPokemonListQuery()
  const [isFirstTimeLoading, setIsFirstTimeLoading] = useState(isFetching)
  const [isLoading, setIsLoading] = useState(isFetching)

  const pokemonList = useMemo(() => {
    if (
      RenderingInfo.loader ||
      (isLoading && (!isFirstTimeLoading || !pokemonListState))
    ) {
      return Array.from({ length: 8 }).map((_, index) => (
        <PokemonCardLoading key={index} />
      ))
    }

    return pokemonListState?.map?.((pokemon) => (
      <PokemonCard key={pokemon.name} pokemon={pokemon} />
    ))
  }, [JSON.stringify(pokemonListState), isLoading])

  useEffect(() => {
    if (data) {
      setPokemonListState(data.results)
    }
  }, [JSON.stringify(data)])

  useEffect(() => {
    setIsLoading(isFetching)

    if (isFirstTimeLoading) {
      setIsFirstTimeLoading(false)
    }
  }, [isFetching])

  return (
    <div className="home-page">
      <PokemonListStyle>{pokemonList}</PokemonListStyle>
      <Outlet />
    </div>
  )
}

export default HomePage
