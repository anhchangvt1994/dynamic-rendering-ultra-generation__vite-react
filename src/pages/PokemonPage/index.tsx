import type { CSSProperties } from 'react'
import pokemonApi, { useGetPokemonDetailQuery } from 'app/apis/pokemon'
import store from 'app/store'
import { useNavigateInfo } from 'app/router/context/InfoContext'
import Image from 'components/common/Image'
import RelatedBlogsSheet from 'components/common/RelatedBlogsSheet'
import PokemonTypes from 'components/pokemon-page/pokemon-types'
import { createPortal } from 'react-dom'
import 'swiper/css'
import 'swiper/css/free-mode'
import 'swiper/css/virtual'
import { FreeMode, Virtual } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import { functionGenerator } from 'utils/EnvHelper'
import PokemonDetails, { PokemonDetailsSkeleton } from './PokemonDetails'
import PokemonHabitat from './PokemonHabitat'
import { getPokemonPower } from './power.mjs'
import {
  getPokemonFallbackImage,
  getPokemonImage,
  POKEMON_COUNT,
} from './navigation.mjs'
import {
  BackButtonStyle,
  BackIconStyle,
  BodyStyle,
  CarouselStageStyle,
  DetailsContentStyle,
  DetailsRegionStyle,
  HeaderStyle,
  NameLoadingStyle,
  NameStyle,
  PokemonPageStyle,
} from './styles'
import usePokemonCarousel from './usePokemonCarousel'
import WaveEffect from './waveEffect'

// Hides the loading placeholder once the artwork has really painted; also
// covers images that were already complete (cached) when they mounted.
const markArtworkLoaded = (image: HTMLImageElement | null) => {
  if (image?.complete && image.naturalWidth) image.dataset.loaded = 'true'
}

const PokemonPage = () => {
  const route = useRoute()
  const navigateInfo = useNavigateInfo()
  const navigate = useNavigate()
  const getPokemonDetailPath = useMemo(
    () => functionGenerator(import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION),
    []
  )
  const { name } = route.params
  const pokemonDetailEndpoint = getPokemonDetailPath(name)
  const initialPokemon = getAPIStore(pokemonDetailEndpoint)
  // History state can survive a reload with an unrelated ID. Mount the
  // carousel only after the URL's ID is known (SSR data can provide it now).
  const [curId, setCurId] = useState(() =>
    initialPokemon?.name === name ? Number(initialPokemon.id) || 0 : 0
  )
  const firstQuery = useRef({ key: name, id: curId, resolved: false })
  const { currentData, isError, refetch } = useGetPokemonDetailQuery(
    !curId || curId === firstQuery.current.id ? firstQuery.current.key : curId
  )
  // currentData belongs to the selected query; never show a late response from
  // an earlier selection under the new image or update its URL/SEO.
  const pokemonState =
    currentData ||
    (!curId || initialPokemon?.id === curId ? initialPokemon : undefined)
  const isFirstLoading = !curId
  const carousel = usePokemonCarousel(curId, setCurId, Boolean(pokemonState))

  const pokemonNumber = pokemonState?.id
    ? pokemonState.id.toString().padStart(3, '0')
    : ''
  const isShowLoading =
    RenderingInfo.loader || !pokemonState || carousel.isNavigating
  const lastPokemon = useRef(pokemonState)
  const detailSnapshot = pokemonState || lastPokemon.current
  const power = getPokemonPower(detailSnapshot?.stats ?? [])
  // The aura only lights up once the selected Pokémon's data is on screen.
  const showAura = !isShowLoading && Boolean(detailSnapshot?.stats?.length)
  // Alternate forms (id > POKEMON_COUNT, e.g. Eternamax #10190) have no
  // carousel slide, so they get a single stage instead.
  const inCarousel = curId >= 1 && curId <= POKEMON_COUNT
  const ImagePath = `https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/${pokemonNumber}.png`

  const seoTitle = `Pokemon ${pokemonState?.name} Pokédex: Chỉ số, Chiêu thức & Cách tiến hóa (Gen 9) | Anhchangvt1994`
  const seoDescription = `Tìm hiểu mọi thứ về ${pokemonState?.name} (#${pokemonNumber}): Chỉ số cơ bản (stats), bộ chiêu thức mạnh nhất, cách tiến hóa từ Drowzee và vị trí bắt trong các phiên bản game mới nhất.`

  const handleBack = () => {
    if (!navigateInfo.from) return navigate(import.meta.env.ROUTER_HOME_PATH)
    navigate(-1)
  }

  useEffect(() => {
    if (pokemonState) lastPokemon.current = pokemonState
  }, [pokemonState])

  useEffect(() => {
    if (
      !firstQuery.current.resolved &&
      (!curId || curId === firstQuery.current.id) &&
      pokemonState?.id
    ) {
      // Keep the initial name-keyed query instead of immediately requesting
      // the same Pokémon a second time under its numeric ID. The URL name
      // takes precedence over history state restored by a browser reload.
      firstQuery.current.resolved = true
      firstQuery.current.id = pokemonState.id
      store.dispatch(
        pokemonApi.util.upsertQueryData(
          import.meta.env.API_ENDPOINT_GET_POKEMON_DETAIL,
          pokemonState.id,
          pokemonState
        )
      )
      setCurId(pokemonState.id)
    }
  }, [curId, pokemonState])

  useEffect(() => {
    if (pokemonState && !carousel.isNavigating) {
      if (pokemonState.name !== name) {
        // Use navigate with replace option to update URL without destroying the component
        // Only navigate if the path is actually different to avoid unnecessary re-renders
        const newPath = getPokemonDetailPath(pokemonState.name)
        navigate(newPath, {
          replace: true,
          state: { pokemonId: pokemonState.id, keepPage: true },
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
  }, [
    pokemonState,
    name,
    navigate,
    getPokemonDetailPath,
    seoTitle,
    seoDescription,
    ImagePath,
    carousel.isNavigating,
  ])

  const pokemonSwiperSlides = useMemo(
    () =>
      Array.from({ length: POKEMON_COUNT }, (_, index) => {
        const pokemonId = index + 1
        return (
          <SwiperSlide
            key={pokemonId}
            virtualIndex={index}
            data-pokemon-id={pokemonId}
          >
            <div className="pokemon-visual">
              <img
                src={getPokemonImage(pokemonId)}
                alt={`Pokémon #${pokemonId}`}
                width="100%"
                height={150}
                decoding="async"
                draggable={false}
                ref={markArtworkLoaded}
                onLoad={(event) => markArtworkLoaded(event.currentTarget)}
                onError={(event) => {
                  const image = event.currentTarget
                  if (image.dataset.fallback === 'placeholder') return
                  delete image.dataset.loaded
                  image.src = image.dataset.fallback
                    ? '/images/pokemon-02.webp'
                    : getPokemonFallbackImage(pokemonId)
                  image.dataset.fallback = image.dataset.fallback
                    ? 'placeholder'
                    : 'true'
                }}
              />
            </div>
          </SwiperSlide>
        )
      }),
    []
  )

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
        <div style={{ visibility: isShowLoading ? 'hidden' : 'visible' }}>
          <PokemonTypes types={detailSnapshot?.types ?? []} />
        </div>
        {RenderingInfo.loader || isFirstLoading ? (
          <Image
            src={ImagePath}
            alt={`Pokemon ${pokemonState?.name || ''}`}
            width={'100%'}
            height={150}
          />
        ) : (
          <CarouselStageStyle
            data-scanning={carousel.isNavigating}
            data-aura={showAura ? power.level : undefined}
            style={
              {
                '--aura-a': power.color.a,
                '--aura-b': power.color.b,
                // PokeAPI's copy of the same artwork serves CORS, which
                // CSS masks need (pokemon.com does not).
                '--art': detailSnapshot?.id
                  ? `url(${getPokemonFallbackImage(detailSnapshot.id)})`
                  : undefined,
              } as CSSProperties
            }
            onPointerDownCapture={carousel.onPointerDownCapture}
            onPointerMoveCapture={carousel.onPointerMoveCapture}
            onPointerUpCapture={carousel.onPointerUpCapture}
            onPointerCancelCapture={carousel.onPointerCancelCapture}
          >
            <PokemonHabitat
              types={detailSnapshot?.types ?? []}
              scanning={isShowLoading}
              power={power.level}
            />

            {inCarousel ? (
              <Swiper
                onSwiper={carousel.onSwiper}
                onResize={carousel.onResize}
                onUpdate={carousel.onUpdate}
                modules={[Virtual, FreeMode, WaveEffect]}
                onSlideChange={carousel.onSlideChange}
                onTouchStart={carousel.onTouchStart}
                onSliderMove={carousel.onSliderMove}
                onTouchEnd={carousel.onTouchEnd}
                onTransitionEnd={carousel.onTransitionEnd}
                virtual={{
                  addSlidesBefore: carousel.renderAhead,
                  addSlidesAfter: carousel.renderAhead,
                }}
                centeredSlides
                slidesPerView={3}
                initialSlide={Math.max(0, curId - 1)}
                grabCursor
                threshold={0}
                preventInteractionOnTransition={false}
                speed={carousel.reducedMotion ? 0 : 560}
                freeMode={{
                  enabled: true,
                  sticky: true,
                  momentum: !carousel.reducedMotion,
                  momentumBounce: false,
                }}
              >
                {pokemonSwiperSlides}
              </Swiper>
            ) : (
              <div className="pokemon-solo">
                <div className="pokemon-visual">
                  <img
                    key={curId}
                    src={getPokemonFallbackImage(curId)}
                    alt={`Pokémon ${pokemonState?.name || ''}`}
                    width="100%"
                    height={150}
                    decoding="async"
                    draggable={false}
                    ref={markArtworkLoaded}
                    onLoad={(event) => markArtworkLoaded(event.currentTarget)}
                    onError={(event) => {
                      const image = event.currentTarget
                      if (image.dataset.fallback) return
                      image.dataset.fallback = 'placeholder'
                      image.src = '/images/pokemon-02.webp'
                    }}
                  />
                </div>
              </div>
            )}
          </CarouselStageStyle>
        )}
        {isShowLoading ? (
          <NameLoadingStyle role="status" aria-live="polite">
            <span className="tuning-signal" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((bar) => (
                <i key={bar} />
              ))}
            </span>
            Who&apos;s that Pokémon?
          </NameLoadingStyle>
        ) : (
          <NameStyle>{pokemonState?.name}</NameStyle>
        )}

        {isError && !carousel.isNavigating && (
          <div role="alert" style={{ textAlign: 'center' }}>
            Không tải được dữ liệu Pokémon.{' '}
            <button onClick={() => refetch()}>Thử lại</button>
          </div>
        )}
        <DetailsRegionStyle aria-busy={isShowLoading}>
          <DetailsContentStyle
            data-loading={isShowLoading}
            aria-hidden={isShowLoading}
            inert={isShowLoading}
          >
            <PokemonDetails pokemon={detailSnapshot} />
          </DetailsContentStyle>
          {isShowLoading && <PokemonDetailsSkeleton />}
        </DetailsRegionStyle>
      </BodyStyle>
    </PokemonPageStyle>
  )
}

export default PokemonPage
