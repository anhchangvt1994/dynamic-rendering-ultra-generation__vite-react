import BattleMessage from 'components/common/BattleMessage'
import { titleCase } from 'components/pokemon-page/format.mjs'
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
import { FreeMode, Keyboard, Virtual } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/react'
import { functionGenerator } from 'utils/EnvHelper'
import PokemonDetails, { PokemonDetailsSkeleton } from './PokemonDetails'
import PokemonActions from './PokemonActions'
import PokemonHabitat from './PokemonHabitat'
import PokemonName from './PokemonName'
import { getPokemonPower } from './power.mjs'
import {
  getPokemonFallbackImage,
  getPokemonImage,
  POKEMON_COUNT,
} from './navigation.mjs'
import {
  BackButtonStyle,
  BodyStyle,
  CarouselStageStyle,
  DetailsContentStyle,
  DetailsRegionStyle,
  HeaderStyle,
  InlineAlertStyle,
  StageWrapStyle,
  StepButtonStyle,
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
  const { currentData, isError, error, refetch } = useGetPokemonDetailQuery(
    !curId || curId === firstQuery.current.id ? firstQuery.current.key : curId
  )
  // currentData belongs to the selected query; never show a late response from
  // an earlier selection under the new image or update its URL/SEO.
  const pokemonState =
    currentData ||
    (!curId || initialPokemon?.id === curId ? initialPokemon : undefined)
  const isFirstLoading = !curId
  const carousel = usePokemonCarousel(curId, setCurId, Boolean(pokemonState))
  // for the visible prev/next buttons (they live outside the gesture area)
  const swiperRef = useRef<SwiperInstance | null>(null)

  // Shiny: swap the centred artwork's src; every new Pokémon starts normal,
  // and the slide it leaves gets its normal artwork back.
  const stageRef = useRef<HTMLDivElement>(null)
  const [shiny, setShiny] = useState(false)
  useEffect(() => setShiny(false), [curId])
  const shinyArt =
    pokemonState?.sprites?.other?.['official-artwork']?.front_shiny
  useEffect(() => {
    const img = stageRef.current?.querySelector<HTMLImageElement>(
      ':is(.swiper-slide-active, .pokemon-solo) img'
    )
    if (!img || !shiny || !shinyArt) return
    const normal = img.src
    img.src = shinyArt
    return () => {
      img.src = normal
    }
  }, [shiny, shinyArt])

  const pokemonNumber = pokemonState?.id
    ? pokemonState.id.toString().padStart(3, '0')
    : ''
  const isShowLoading =
    RenderingInfo.loader || !pokemonState || carousel.isNavigating
  const lastPokemon = useRef(pokemonState)
  const detailSnapshot = pokemonState || lastPokemon.current
  const power = getPokemonPower(detailSnapshot?.stats ?? [])
  // National Dex number of the species (forms share their species' number)
  const speciesId = Number(
    detailSnapshot?.species?.url?.match(/\/(\d+)\/?$/)?.[1] ??
      detailSnapshot?.id
  )
  const dexNumber =
    !isShowLoading && speciesId ? `#${String(speciesId).padStart(4, '0')}` : ''
  // The aura only lights up once the selected Pokémon's data is on screen.
  const showAura = !isShowLoading && Boolean(detailSnapshot?.stats?.length)
  // Alternate forms (id > POKEMON_COUNT, e.g. Eternamax #10190) have no
  // carousel slide, so they get a single stage instead.
  const inCarousel = curId >= 1 && curId <= POKEMON_COUNT
  const ImagePath = `https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/${pokemonNumber}.png`

  const displayName = titleCase(pokemonState?.name ?? '')
  const seoTitle = `${displayName} #${pokemonNumber} – Hệ, chỉ số, tiến hóa & chiêu thức | Pokédex`
  const seoDescription = `${displayName} (#${pokemonNumber}): hệ, hạng sức mạnh theo tổng chỉ số cơ bản, chuỗi tiến hóa, mục Pokédex, khả năng đặc biệt và bộ chiêu thức.`

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

  // The very first lookup failed: the name does not exist, or we are offline.
  if (isError && !pokemonState && !curId) {
    const notFound = (error as { status?: number })?.status === 404
    setSeoTag({
      title: notFound
        ? 'Không tìm thấy Pokémon | Pokédex'
        : 'Mất kết nối | Pokédex',
      robots: 'noindex, follow',
    })
    return (
      <PokemonPageStyle>
        {notFound ? (
          <BattleMessage
            title="Pokémon này chưa có trong Pokédex!"
            action={{
              label: 'Về Pokédex',
              to: import.meta.env.ROUTER_HOME_PATH,
            }}
          >
            Không có Pokémon nào tên “{name}”. Kiểm tra lại chính tả, hoặc tìm
            bằng ô tìm kiếm phía trên.
          </BattleMessage>
        ) : (
          <BattleMessage
            title="Mất kết nối với Pokédex!"
            action={{ label: 'Thử lại', onClick: () => refetch() }}
          >
            Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại.
          </BattleMessage>
        )}
      </PokemonPageStyle>
    )
  }

  return (
    <PokemonPageStyle>
      {createPortal(
        <RelatedBlogsSheet keyword={pokemonState?.name || ''} />,
        document.getElementById('related-blogs-sheet')!
      )}
      <HeaderStyle>
        <BackButtonStyle aria-label="Quay lại" onClick={handleBack}>
          {/* an arrow with a stem: distinct from the ‹ › Pokémon steppers */}
          <svg className="back-arrow" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H5M11 5l-7 7 7 7" />
          </svg>
        </BackButtonStyle>
      </HeaderStyle>
      <BodyStyle>
        {RenderingInfo.loader || isFirstLoading ? (
          <Image
            src={ImagePath}
            alt={`Pokemon ${pokemonState?.name || ''}`}
            width={'100%'}
            height={150}
          />
        ) : (
          <StageWrapStyle ref={stageRef}>
            <CarouselStageStyle
              data-scanning={carousel.isNavigating}
              data-loading={isShowLoading}
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
              {dexNumber && (
                <span key={dexNumber} className="dex-number" aria-hidden="true">
                  {dexNumber}
                </span>
              )}
              <PokemonHabitat
                types={detailSnapshot?.types ?? []}
                scanning={isShowLoading}
                power={power.level}
              />

              {inCarousel ? (
                <Swiper
                  onSwiper={(instance) => {
                    swiperRef.current = instance
                    carousel.onSwiper(instance)
                  }}
                  onResize={carousel.onResize}
                  onUpdate={carousel.onUpdate}
                  modules={[Virtual, FreeMode, Keyboard, WaveEffect]}
                  // ← / → step through the Pokédex like a swipe
                  keyboard={{ enabled: true, onlyInViewport: true }}
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
            {inCarousel && (
              <>
                <StepButtonStyle
                  type="button"
                  data-dir="prev"
                  aria-label="Pokémon trước"
                  disabled={curId <= 1}
                  onClick={() => swiperRef.current?.slidePrev()}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </StepButtonStyle>
                <StepButtonStyle
                  type="button"
                  data-dir="next"
                  aria-label="Pokémon tiếp theo"
                  disabled={curId >= POKEMON_COUNT}
                  onClick={() => swiperRef.current?.slideNext()}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </StepButtonStyle>
              </>
            )}
          </StageWrapStyle>
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
          <NameStyle>
            <PokemonName
              name={pokemonState?.name || ''}
              level={power.level}
              color={power.color}
            />
          </NameStyle>
        )}
        <PokemonTypes
          key={pokemonState?.name}
          types={isShowLoading ? [] : (pokemonState?.types ?? [])}
        />
        {/* rendered (hidden) while loading so the page below never jumps */}
        <div
          style={{ visibility: isShowLoading ? 'hidden' : 'visible' }}
          inert={isShowLoading}
        >
          <PokemonActions
            id={pokemonState?.id ?? 0}
            name={titleCase(pokemonState?.name ?? '')}
            shiny={shiny}
            hasShiny={!!shinyArt}
            onShinyChange={setShiny}
          />
        </div>

        {isError && !carousel.isNavigating && (
          <InlineAlertStyle role="alert">
            Không tải được dữ liệu Pokémon này.
            <button type="button" onClick={() => refetch()}>
              Thử lại
            </button>
          </InlineAlertStyle>
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
