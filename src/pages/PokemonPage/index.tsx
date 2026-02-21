import { useGetPokemonDetailQuery } from 'app/apis/pokemon'
import { useNavigateInfo } from 'app/router/context/InfoContext'
import Image from 'components/common/Image'
import RelatedBlogsSheet from 'components/common/RelatedBlogsSheet'
import PokemonInfo from 'components/pokemon-page/pokemon-info'
import PokemonMoveset from 'components/pokemon-page/pokemon-moveset'
import PokemonStats from 'components/pokemon-page/pokemon-stats'
import PokemonStatsLoading from 'components/pokemon-page/pokemon-stats/loading'
import PokemonTypes from 'components/pokemon-page/pokemon-types'
import { createPortal } from 'react-dom'
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
  const { name, id } = route.params
  const [curId, setCurId] = useState(Number(id))
  const pokemonDetailEndpoint = getPokemonDetailPath(name)
  const [pokemonState, setPokemonState] = useState(
    getAPIStore(pokemonDetailEndpoint)
  )

  const { data, isFetching } = useGetPokemonDetailQuery(curId || name)
  const [isFirstLoading, setIsFirstLoading] = useState(!id || isFetching)

  const pokemonNumber = pokemonState?.id
    ? pokemonState.id.toString().padStart(3, '0')
    : ''
  const isShowLoading =
    RenderingInfo.loader || (isFetching && (!isFirstLoading || !pokemonState))
  const ImagePath = `https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/${pokemonNumber}.png`

  const seoTitle = `Pokemon ${pokemonState?.name} Pokédex: Chỉ số, Chiêu thức & Cách tiến hóa (Gen 9) | Anhchangvt1994`
  const seoDescription = `Tìm hiểu mọi thứ về ${pokemonState?.name} (#${pokemonNumber}): Chỉ số cơ bản (stats), bộ chiêu thức mạnh nhất, cách tiến hóa từ Drowzee và vị trí bắt trong các phiên bản game mới nhất.`

  const swiperRef = useRef(null)

  const handleBack = () => {
    if (!navigateInfo.from) return navigate(import.meta.env.ROUTER_HOME_PATH)

    navigate(-1)
  } // handleBack

  const handleSlidePrevTransitionStart = (force = false) => {
    if (
      !pokemonState ||
      pokemonState.id - 1 <= 0 ||
      (!force && !swiperRef.current?.swiper.touches.diff)
    )
      return

    setCurId(pokemonState.id - 1)
  }
  const handleSlideNextTransitionStart = (force = false) => {
    if (!pokemonState || (!force && !swiperRef.current?.swiper.touches.diff))
      return

    setCurId(pokemonState.id + 1)
  }

  const handleSlideClick = (number) => {
    if (pokemonState.id - number === 1) {
      handleSlidePrevTransitionStart(true)
    }
    if (pokemonState.id - number === -1) {
      handleSlideNextTransitionStart(true)
    }
  }

  const pokemonStats = isShowLoading ? (
    <PokemonStatsLoading />
  ) : (
    <>
      <h2
        style={{
          display: RenderingInfo.type !== 'ISR' ? 'none' : 'inline-block',
        }}
      >
        Chỉ số cơ bản (Base Stats) của {pokemonState?.name}
      </h2>
      <PokemonStats stats={pokemonState?.stats ?? []} />
    </>
  )

  const pokemonAbilities = isShowLoading ? (
    <></>
  ) : (
    <>
      <h3
        style={{
          display: RenderingInfo.type !== 'ISR' ? 'none' : 'inline-block',
        }}
      >
        Chiều cao, cân nặng và khả năng đặc biệt (Abilities) của{' '}
      </h3>

      <PokemonInfo
        height={pokemonState?.height}
        weight={pokemonState?.weight}
        abilities={pokemonState?.abilities ?? []}
      />
    </>
  )

  const pokemonMoveset = isShowLoading ? (
    <></>
  ) : (
    <>
      <h2
        style={{
          display: RenderingInfo.type !== 'ISR' ? 'none' : 'inline-block',
        }}
      >
        Bộ chiêu thức (Moveset) của {pokemonState?.name} và cách học
      </h2>
      <PokemonMoveset moveset={pokemonState?.moves ?? []} />
    </>
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
        // Use navigate with replace option to update URL without destroying the component
        // Only navigate if the path is actually different to avoid unnecessary re-renders
        const newPath = getPokemonDetailPath(pokemonState.name)
        navigate(newPath, {
          replace: true,
          state: { pokemonId: pokemonState.id },
        })
      }

      setSeoTag({
        title: seoTitle,
        'og:title': seoTitle,
        'twitter:title': seoTitle,

        'og:type': 'website',

        description: seoDescription,
        'og:description': seoDescription,
        'twitter:description': seoDescription,

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
          <img
            src={ImagePath}
            alt={`#${tmpNumber}`}
            width={'100%'}
            height={150}
          />
        </SwiperSlide>
      )
    })
  }, [JSON.stringify(pokemonState), curId])

  return (
    <PokemonPageStyle>
      {createPortal(
        <RelatedBlogsSheet keyword={pokemonState?.name || ''} />,
        document.getElementById('related-blogs-sheet')!
      )}
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
            alt={`Pokemon ${pokemonState?.name || ''}`}
            width={'100%'}
            height={150}
          />
        ) : (
          <Swiper
            ref={swiperRef}
            spaceBetween={0}
            slidesPerView={3}
            initialSlide={1}
            onSlidePrevTransitionStart={() => handleSlidePrevTransitionStart()}
            onSlideNextTransitionStart={() => handleSlideNextTransitionStart()}
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
        {pokemonAbilities}
        {pokemonMoveset}
      </BodyStyle>
    </PokemonPageStyle>
  )
}

export default PokemonPage
