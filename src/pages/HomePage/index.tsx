import { useGetPokemonListQuery } from 'app/apis/pokemon'
import PokemonCard from 'components/home-page/pokemon-card'
import PokemonCardLoading from 'components/home-page/pokemon-card/loading'
import { PokemonListStyle } from './styles'

function HomePage() {
  setSeoTag({
    title: 'Pokemon',
    'og:type': 'website',
    'og:title': 'Pokemon',
    'og:description': 'Pokemon home page',
    'og:url': window.location.pathname,
    'og:site_name': 'Pokemon',
    'og:image': '/images/pikachu_lazy-load-01.webp',
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
  const isShowLoading =
    RenderingInfo.loader ||
    (isLoading && (!isFirstTimeLoading || !pokemonListState))

  const pokemonList = isShowLoading
    ? Array.from({ length: 8 }).map((_, index) => (
        <PokemonCardLoading key={index} />
      ))
    : pokemonListState?.map?.((pokemon) => (
        <PokemonCard key={pokemon.name} pokemon={pokemon} />
      ))

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
    </div>
  )
}

export default HomePage
