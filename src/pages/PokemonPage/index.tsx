import { useGetPokemonDetailQuery } from 'app/apis/pokemon'
import { useNavigateInfo } from 'app/router/context/InfoContext'
import Image from 'components/common/Image'
import RelatedBlogsSheet from 'components/common/RelatedBlogsSheet'
import PokemonStats from 'components/pokemon-page/pokemon-stats'
import PokemonStatsLoading from 'components/pokemon-page/pokemon-stats/loading'
import PokemonTypes from 'components/pokemon-page/pokemon-types'
import 'swiper/css'
import { Swiper, SwiperSlide } from 'swiper/react'
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
  const [curId, setCurId] = useState(null)
  const pokemonDetailEndpoint = getPokemonDetailPath(name)
  const [pokemonState, setPokemonState] = useState(
    getAPIStore(pokemonDetailEndpoint)
  )

  const { data, isFetching } = useGetPokemonDetailQuery(curId || name)
  const [isFirstLoading, setIsFirstLoading] = useState(isFetching)

  const pokemonNumber = pokemonState?.id
    ? pokemonState.id.toString().padStart(3, '0')
    : ''
  const isShowLoading =
    RenderingInfo.loader || (isFetching && (!isFirstLoading || !pokemonState))
  const ImagePath = `https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/${pokemonNumber}.png`

  const swiperRef = useRef(null)

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

  const handleSlidePrevTransitionStart = () => {
    if (
      !pokemonState ||
      pokemonState.id - 1 <= 0 ||
      !swiperRef.current?.swiper.touches.diff
    )
      return

    setCurId(pokemonState.id - 1)
  }
  const handleSlideNextTransitionStart = () => {
    if (!pokemonState || !swiperRef.current?.swiper.touches.diff) return

    setCurId(pokemonState.id + 1)
  }

  const handleSlideClick = (number) => {
    if (pokemonState.id - number === 1) {
      handleSlidePrevTransitionStart()
    }
    if (pokemonState.id - number === -1) {
      handleSlideNextTransitionStart()
    }
  }

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
      if (pokemonState.name !== name) {
        // Use replaceState to update URL without destroying the component
        const newPath = getPokemonDetailPath(pokemonState.name)
        window.history.replaceState(null, '', newPath)
      }

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

  const pokemonSwiperSlides = useMemo(() => {
    if (!pokemonState) return null

    const pokemonId = curId || pokemonState.id
    const orderList = pokemonId <= 1 ? [-2, -1, 0, 1, 2] : [-2, -1, 0, 1, 2]

    return orderList.map((order) => {
      const tmpNumber = pokemonId + order

      if (tmpNumber === 0 || tmpNumber === -1)
        return <SwiperSlide key={tmpNumber}></SwiperSlide>

      const pokemonNumber = pokemonState?.id
        ? tmpNumber.toString().padStart(3, '0')
        : ''
      const ImagePath = `https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/${pokemonNumber}.png`

      return (
        <SwiperSlide
          key={tmpNumber}
          onClick={() => handleSlideClick(tmpNumber)}
        >
          <Image
            src={ImagePath}
            className="show"
            onLoad={(e) => onLoad(e.target)}
            onError={(e) => onError(e.target)}
            alt={tmpNumber}
            width={'100%'}
            height={150}
          />
        </SwiperSlide>
      )
    })
  }, [JSON.stringify(pokemonState), curId])

  return (
    <PokemonPageStyle>
      <RelatedBlogsSheet keyword={pokemonState?.name || ''} />
      <HeaderStyle>
        <BackButtonStyle onClick={handleBack}>
          <BackIconStyle />
        </BackButtonStyle>
      </HeaderStyle>
      <BodyStyle>
        {!isShowLoading && <PokemonTypes types={pokemonState?.types ?? []} />}
        {RenderingInfo.loader || isFirstLoading ? (
          <Image
            src={ImagePath}
            className="show"
            onLoad={(e) => onLoad(e.target)}
            onError={(e) => onError(e.target)}
            alt={name}
            width={'100%'}
            height={150}
          />
        ) : (
          <Swiper
            ref={swiperRef}
            spaceBetween={0}
            slidesPerView={3}
            initialSlide={1}
            onSlidePrevTransitionStart={handleSlidePrevTransitionStart}
            onSlideNextTransitionStart={handleSlideNextTransitionStart}
            onSnapIndexChange={() => swiperRef.current?.swiper.slideTo(1)}
            speed={700}
            effect="coverflow"
            coverflowEffect={{
              rotate: 0,
              stretch: 0,
              depth: 200,
              modifier: 1.2,
            }}
          >
            {pokemonSwiperSlides}
          </Swiper>
        )}
        {isShowLoading ? (
          <NameLoadingStyle>
            <div className="stage">
              <div className="dot-flashing"></div>
            </div>
          </NameLoadingStyle>
        ) : (
          <NameStyle>{pokemonState?.name}</NameStyle>
        )}

        {pokemonStats}
      </BodyStyle>
    </PokemonPageStyle>
  )
}

export default PokemonPage
