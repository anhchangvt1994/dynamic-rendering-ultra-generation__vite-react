import { useGetPokemonListQuery } from 'app/apis/pokemon'
import InfinityLoading from 'components/common/InfinityLoading'
import PokemonCard from 'components/home-page/pokemon-card'
import PokemonCardLoading from 'components/home-page/pokemon-card/loading'
import useScrollInfinity from 'hooks/useScrollInfinity'
import { getPokemonListPath } from 'utils/ApiHelper'
import { BottomLineStyle, HomePageStyle, PokemonListStyle } from './styles'

function HomePage() {
  setSeoTag({
    title: 'Pokemon',
    'og:type': 'website',
    'og:title': 'Pokemon',
    'og:description': 'Pokemon home page',
    'og:url': window.location.pathname,
    'og:site_name': 'Pokemon',
    'og:image': '/images/pikachu-01.webp',
    'og:image:width': '1200',
    'og:image:height': '628',
    robots: 'index, follow',
  })

  const limit = 20
  const [offset, setOffset] = useState(0)
  const cacheKey = getPokemonListPath(limit, offset)
  const observer = React.useRef<any>(null)
  const bottomLineRef = useRef<HTMLDivElement>(null)

  const { data = getAPIStore(cacheKey), isFetching } = useGetPokemonListQuery({
    limit,
    offset,
  })
  const [pokemonListState, setPokemonListState] = useState(data?.results ?? [])
  const total = pokemonListState?.length ?? 0

  const hasBottomRef = !!bottomLineRef.current
  const isShowLoading = RenderingInfo.loader || (isFetching && !data)

  const enablePagination = data?.count ? offset < data.count : false
  const enableToShowBottomLine =
    !isShowLoading && enablePagination && total - 20 === offset
  const enableToShowInfinityLoading =
    !data || data.count <= total ? false : true

  const pokemonList = isShowLoading
    ? Array.from({ length: 8 }).map((_, index) => (
        <PokemonCardLoading key={index} />
      ))
    : pokemonListState.map?.((pokemon) => (
        <PokemonCard key={pokemon.name} pokemon={pokemon} />
      ))

  const handlePageChange = () => {
    if (!isFetching) setOffset(offset + limit)
  } // handlePageChange

  useEffect(() => {
    if (
      !data ||
      !data.results ||
      !data.results.length ||
      pokemonListState.length > offset
    )
      return

    const tmpPokemonList = [...pokemonListState, ...data.results]

    setPokemonListState(tmpPokemonList)
  }, [JSON.stringify(data)])

  useScrollInfinity(
    (initObserver, getOnIntersection) => {
      const onIntersection = getOnIntersection(handlePageChange)

      if (enablePagination)
        observer.current = initObserver(bottomLineRef.current, onIntersection)

      return () => {
        if (observer.current) {
          observer.current.disconnect()
        }
      }
    },
    [offset, isFetching, hasBottomRef, enablePagination]
  )

  return (
    <HomePageStyle className="home-page">
      <PokemonListStyle>{pokemonList}</PokemonListStyle>
      {enableToShowBottomLine && <BottomLineStyle ref={bottomLineRef} />}
      {enableToShowInfinityLoading && <InfinityLoading />}
    </HomePageStyle>
  )
}

export default HomePage
