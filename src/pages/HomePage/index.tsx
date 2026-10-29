import {
  useGetPokemonListQuery,
  useGetPokemonTypeQuery,
} from 'app/apis/pokemon'
import FieldIcon, { Pokeball } from 'components/common/FieldIcon'
import AppSelect from 'components/common/Select'
import PokemonCard from 'components/home-page/pokemon-card'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { getCaught, subscribeCaught } from 'utils/caught.mjs'
import { POKEMON_COUNT } from 'pages/PokemonPage/navigation.mjs'
import {
  filterCatalog,
  GENERATIONS,
  pokemonId,
  readCatalogParams,
  TYPES,
} from './catalog.mjs'
import FeaturedEncounter from './FeaturedEncounter'
import { HomePageStyle, PokemonListStyle } from './styles'

const caughtSnapshot = () => [...getCaught()].sort((a, b) => a - b).join(',')

function HomePage() {
  setSeoTag({
    title: 'Pokédex — Mỗi Pokémon, một cuộc khám phá',
    description:
      'Khám phá 1025 Pokémon. Lọc theo hệ, thế hệ, tìm hiểu tiến hóa và xây bộ sưu tập của riêng bạn.',
    'og:type': 'website',
    'og:title': 'Pokédex — Mỗi Pokémon, một cuộc khám phá',
    'og:description':
      'Khám phá, tìm hiểu và lưu dấu hành trình Pokémon của bạn.',
    'og:url': window.location.pathname,
    'og:site_name': 'Pokédex',
    'og:image': '/images/pikachu-01.webp',
    robots: 'index, follow',
  })
  const [params, setParams] = useSearchParams()
  const filters = readCatalogParams(params.toString())
  // on phones the chips scroll sideways: bring the chosen type into view
  const typeFilterRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // horizontal only: never move the page itself
    const row = typeFilterRef.current
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return
    row.scrollLeft =
      chip.offsetLeft -
      row.offsetLeft -
      (row.clientWidth - chip.offsetWidth) / 2
  }, [filters.type])
  const [query, setQuery] = useState(filters.query)
  const [composing, setComposing] = useState(false)
  useEffect(() => setQuery(filters.query), [filters.query])
  // Keep keystrokes local; committing a URL on every key can interrupt fast
  // typing in the app router. Filtering stays immediate, URL updates settle.
  const paramsKey = params.toString()
  useEffect(() => {
    if (composing || query === filters.query) return
    const timer = setTimeout(() => {
      const next = new URLSearchParams(paramsKey)
      query ? next.set('q', query) : next.delete('q')
      next.delete('shown')
      setParams(next, { replace: true, state: { keepPage: true } })
    }, 300)
    return () => clearTimeout(timer)
  }, [query, composing, filters.query, paramsKey, setParams])
  const navigate = useNavigate()
  const catalogRef = useRef<HTMLElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const caughtKey = useSyncExternalStore(
    subscribeCaught,
    caughtSnapshot,
    () => ''
  )
  const caughtIds = useMemo(
    () =>
      new Set<number>(
        caughtKey
          .split(',')
          .map(Number)
          .filter((id) => id > 0 && id <= POKEMON_COUNT)
      ),
    [caughtKey]
  )
  const { data, isFetching, isError, refetch } = useGetPokemonListQuery({
    limit: POKEMON_COUNT,
    offset: 0,
  })
  // currentData prevents a previous type from flashing while another loads.
  const {
    currentData: typeData,
    isFetching: fetchingType,
    isError: typeError,
    refetch: retryType,
  } = useGetPokemonTypeQuery(filters.type, { skip: !filters.type })
  const typeIds = useMemo(
    () =>
      filters.type
        ? new Set<number>(
            (typeData?.pokemon ?? []).map((item) => pokemonId(item.pokemon))
          )
        : undefined,
    [typeData, filters.type]
  )
  const entries = useMemo(
    () =>
      filterCatalog(data?.results, { ...filters, query, caughtIds, typeIds }),
    [
      data?.results,
      query,
      filters.generation,
      filters.sort,
      filters.caughtOnly,
      caughtIds,
      typeIds,
    ]
  )
  const waiting =
    (!data && isFetching) || (!!filters.type && !typeData && fetchingType)
  const failed =
    (!data && isError) || (!!filters.type && !typeData && typeError)
  const activeFilters = !!(
    query ||
    filters.generation ||
    filters.type ||
    filters.caughtOnly
  )
  const count = caughtIds.size
  const update = (key: string, value: string, replace = false) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    if (key !== 'shown') next.delete('shown')
    setParams(next, { replace, state: { keepPage: true } })
  }
  const reset = () => {
    setQuery('')
    setParams({}, { state: { keepPage: true } })
  }
  const explore = () => {
    catalogRef.current?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    })
    searchRef.current?.focus({ preventScroll: true })
  }
  const random = () => {
    const pool = entries.length
      ? entries
      : data?.results?.filter((item) => pokemonId(item) <= POKEMON_COUNT)
    if (pool?.length)
      navigate(`/pokemon/${pool[Math.floor(Math.random() * pool.length)].name}`)
    else
      navigate(
        `/pokemon/${['pikachu', 'eevee', 'gengar', 'dragonite'][Math.floor(Math.random() * 4)]}`
      )
  }
  return (
    <HomePageStyle className="home-page">
      <FeaturedEncounter onExplore={explore} onRandom={random} />
      <div className="field-strip">
        <span>
          <FieldIcon name="spark" size={15} /> MỖI POKÉMON, MỘT CÂU CHUYỆN.
        </span>
        <span>
          Hành trình của bạn bắt đầu ở đây <FieldIcon name="arrow" size={16} />
        </span>
      </div>
      <section className="collection" aria-label="Tiến độ bộ sưu tập">
        <div className="collection-mark">
          <Pokeball />
        </div>
        <div className="collection-copy">
          <h2>Bộ sưu tập của bạn</h2>
          <p>
            {count
              ? 'Thêm một cuộc gặp. Thêm một dấu ấn.'
              : 'Cuộc phiêu lưu nào cũng bắt đầu từ số 0.'}
          </p>
        </div>
        <div className="collection-progress">
          <div>
            <strong>
              {count.toLocaleString('vi-VN')}
              <small> / 1.025</small>
            </strong>
            <span>đã bắt</span>
          </div>
          <progress
            value={count}
            max={POKEMON_COUNT}
            aria-label={`${count} trên 1025 Pokémon đã bắt`}
          />
        </div>
        <button
          type="button"
          className="collection-link"
          aria-label="Xem bộ sưu tập"
          onClick={() => {
            update('view', filters.caughtOnly ? '' : 'caught')
            catalogRef.current?.scrollIntoView({
              block: 'start',
              behavior: 'smooth',
            })
          }}
          aria-pressed={filters.caughtOnly}
        >
          <span>Xem bộ sưu tập</span>
          <FieldIcon name="arrow" />
        </button>
      </section>
      <section
        className="catalog"
        ref={catalogRef}
        aria-labelledby="catalog-heading"
      >
        <div className="catalog-heading">
          <div>
            <span className="eyebrow">NATIONAL POKÉDEX</span>
            <h2 id="catalog-heading">
              Tìm người bạn tiếp theo<span>.</span>
            </h2>
          </div>
          <button
            className="random-small"
            type="button"
            onClick={random}
            aria-label="Khám phá Pokémon ngẫu nhiên"
          >
            <FieldIcon name="shuffle" />
          </button>
        </div>
        <div className="catalog-tools">
          <div className="catalog-search">
            <FieldIcon name="search" />
            <input
              ref={searchRef}
              type="search"
              aria-label="Tìm trong Pokédex"
              placeholder="Tên hoặc số Pokédex…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
              spellCheck={false}
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                aria-label="Xóa tìm kiếm"
                onClick={() => {
                  setQuery('')
                  update('q', '', true)
                  searchRef.current?.focus()
                }}
              >
                <FieldIcon name="close" size={17} />
              </button>
            )}
          </div>
          <div className="catalog-selects">
            <AppSelect
              label="Lọc theo thế hệ"
              value={filters.generation || 'all'}
              options={[
                { value: 'all', label: 'Mọi thế hệ' },
                ...GENERATIONS.map((gen) => ({
                  value: gen.id,
                  label: gen.name,
                  description: `Thế hệ ${gen.id}`,
                })),
              ]}
              onValueChange={(value) =>
                update('gen', value === 'all' ? '' : value)
              }
            />
            <AppSelect
              label="Sắp xếp Pokémon"
              value={filters.sort}
              options={[
                { value: 'number', label: 'Số tăng dần' },
                { value: 'number-desc', label: 'Số giảm dần' },
                { value: 'name', label: 'Tên A–Z' },
              ]}
              onValueChange={(value) =>
                update('sort', value === 'number' ? '' : value)
              }
            />
          </div>
        </div>
        <div
          ref={typeFilterRef}
          className="type-filter"
          role="group"
          aria-label="Lọc theo hệ Pokémon"
        >
          <button
            type="button"
            aria-pressed={!filters.type}
            onClick={() => update('type', '')}
          >
            Tất cả hệ
          </button>
          {TYPES.map(([key, label, color]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filters.type === key}
              onClick={() => update('type', filters.type === key ? '' : key)}
            >
              <span style={{ background: color }} />
              {label}
            </button>
          ))}
        </div>
        <div className="results-heading">
          <div className="view-tabs" aria-label="Danh sách Pokémon">
            <button
              type="button"
              aria-pressed={!filters.caughtOnly}
              onClick={() => update('view', '')}
            >
              <FieldIcon name="grid" size={15} /> Tất cả
            </button>
            <button
              type="button"
              aria-pressed={filters.caughtOnly}
              onClick={() => update('view', 'caught')}
            >
              <Pokeball /> Đã bắt <span>{count}</span>
            </button>
          </div>
          <span className="result-count" role="status">
            {waiting
              ? 'Đang tìm…'
              : `${entries.length.toLocaleString('vi-VN')} Pokémon`}
          </span>
        </div>
        {activeFilters && (
          <div className="active-filters">
            <span>
              {[
                filters.query && `“${filters.query}”`,
                filters.generation &&
                  GENERATIONS.find((gen) => gen.id === filters.generation)
                    ?.name,
                filters.type &&
                  `Hệ ${TYPES.find((type) => type[0] === filters.type)?.[1]}`,
                filters.caughtOnly && 'Đã bắt',
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <button type="button" onClick={reset}>
              Xóa bộ lọc <FieldIcon name="close" size={13} />
            </button>
          </div>
        )}
        {waiting ? (
          <div className="catalog-state" role="status">
            <Pokeball className="loading-ball" />
            <p>Đang mở Pokédex…</p>
          </div>
        ) : failed ? (
          <div className="catalog-state" role="alert">
            <Pokeball />
            <h3>Chưa tải được Pokémon</h3>
            <p>Kiểm tra kết nối rồi thử lại nhé.</p>
            <button
              type="button"
              onClick={() => {
                if (!data) refetch()
                if (filters.type) retryType()
              }}
            >
              Thử lại
            </button>
          </div>
        ) : entries.length ? (
          <>
            <PokemonListStyle>
              {entries.slice(0, filters.shown).map((pokemon) => (
                <PokemonCard key={pokemon.name} pokemon={pokemon} />
              ))}
            </PokemonListStyle>
            {entries.length > filters.shown && (
              <div className="load-more">
                <button
                  type="button"
                  onClick={() => update('shown', String(filters.shown + 24))}
                >
                  Khám phá thêm{' '}
                  <span>+{Math.min(24, entries.length - filters.shown)}</span>
                  <FieldIcon name="arrow" size={17} />
                </button>
                <p>
                  {Math.min(filters.shown, entries.length)} /{' '}
                  {entries.length.toLocaleString('vi-VN')} Pokémon
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="catalog-state">
            <Pokeball />
            <h3>
              {filters.caughtOnly && !count
                ? 'Người bạn đầu tiên đang chờ'
                : 'Chưa tìm thấy người bạn này'}
            </h3>
            <p>
              {filters.caughtOnly && !count
                ? 'Mở hồ sơ Pokémon và nhấn “Bắt” để bắt đầu.'
                : 'Thử tên khác hoặc bớt một bộ lọc nhé.'}
            </p>
            <button type="button" onClick={reset}>
              Khám phá tất cả <FieldIcon name="arrow" size={16} />
            </button>
          </div>
        )}
      </section>
      <footer className="field-footer">
        <span>
          <Pokeball /> Dành cho những người luôn muốn khám phá.
        </span>
        <p>
          Dữ liệu từ{' '}
          <a href="https://pokeapi.co/" target="_blank" rel="noreferrer">
            PokéAPI
          </a>
          . Pokémon © Nintendo / Creatures / GAME FREAK.
          <br />
          Dự án cộng đồng, không liên kết với The Pokémon Company.
        </p>
      </footer>
    </HomePageStyle>
  )
}
export default HomePage
