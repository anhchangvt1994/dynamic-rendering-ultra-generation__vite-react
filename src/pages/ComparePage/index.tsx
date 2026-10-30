import {
  useGetPokemonDetailQuery,
  useGetPokemonListQuery,
  useGetPokemonTypeQuery,
} from 'app/apis/pokemon'
import { useNavigateInfo } from 'app/router/context/InfoContext'
import { searchPokemon } from 'components/common/SearchPokemonBar/search.mjs'
import { pokemonLabel, statLabel } from 'components/pokemon-page/format.mjs'
import { TYPE_DATA } from 'components/pokemon-page/type-data.mjs'
import useDialog from 'hooks/useDialog'
import { getRecent } from 'utils/recent.mjs'
import {
  getPokemonImage,
  getPokemonSprite,
} from 'pages/PokemonPage/navigation.mjs'
import { getPokemonPower } from 'pages/PokemonPage/power.mjs'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  STAT_ORDER,
  bestHit,
  compareStats,
  formatMultiplier,
  hitLabel,
  readComparePair,
} from './compare.mjs'
import { CompareStyle, SheetStyle } from './styles'

type Side = 'a' | 'b'
const SIDE_NAME: Record<Side, string> = { a: 'A', b: 'B' }

// classic match-ups offered while the arena is empty (slug, dex id)
const RIVALRIES: [string, number, string, number][] = [
  ['charizard', 6, 'blastoise', 9],
  ['garchomp', 445, 'salamence', 373],
  ['lucario', 448, 'zoroark', 571],
  ['mewtwo', 150, 'mew', 151],
  ['gengar', 94, 'alakazam', 65],
  ['pikachu', 25, 'raichu', 26],
]

const typeNames = (pokemon: any): string[] =>
  (pokemon?.types ?? [])
    .map((entry: any) => entry?.type?.name)
    .filter(Boolean)
    .slice(0, 2)

/** PokéAPI /type payloads for a Pokémon's typing ([] until all loaded). */
function useTypeDetails(pokemon: any) {
  const names = typeNames(pokemon)
  const first = useGetPokemonTypeQuery(names[0] || '', { skip: !names[0] })
  const second = useGetPokemonTypeQuery(names[1] || '', { skip: !names[1] })
  const details = [first.currentData, second.currentData].slice(0, names.length)
  return details.every(Boolean) ? details : []
}

/** "Ai khắc ai?": each side's best same-type hit on the other. */
function Matchup({ a, b }: { a: any; b: any }) {
  const typesA = useTypeDetails(a)
  const typesB = useTypeDetails(b)
  const hits = [
    { side: 'a' as Side, from: a, to: b, hit: bestHit(typeNames(a), typesB) },
    { side: 'b' as Side, from: b, to: a, hit: bestHit(typeNames(b), typesA) },
  ]
  if (hits.some(({ hit }) => !hit)) return null
  return (
    <section className="matchup" aria-labelledby="matchup-heading">
      <h2 id="matchup-heading">Ai khắc ai?</h2>
      <div className="matchup-grid">
        {hits.map(({ side, from, to, hit }) => {
          const info = TYPE_DATA[hit!.type as keyof typeof TYPE_DATA]
          const tone =
            hit!.multiplier > 1 ? 'up' : hit!.multiplier < 1 ? 'down' : 'even'
          return (
            <div
              key={side}
              className={`hit hit--${side}`}
              data-tone={tone}
              style={{ '--type': info?.color } as CSSProperties}
            >
              <p className="hit-who">
                {pokemonLabel(from.name)} <span aria-hidden="true">→</span>
                <span className="sr-only"> đánh </span> {pokemonLabel(to.name)}
              </p>
              <p className="hit-power">{formatMultiplier(hit!.multiplier)}</p>
              <p className="hit-how">
                <span className="hit-type">{info?.label ?? hit!.type}</span>
                {hitLabel(hit!.multiplier)}
              </p>
            </div>
          )
        })}
      </div>
      <p className="matchup-note">
        Chiêu cùng hệ với chính nó, chưa tính khả năng và vật phẩm.
      </p>
    </section>
  )
}

// radar geometry (HP on top, clockwise), values past 200 sit on the rim
const RADAR_AXES = STAT_ORDER
const R = 92
const point = (i: number, ratio: number) => {
  const angle = (i * Math.PI) / 3
  return [150 + R * ratio * Math.sin(angle), 120 - R * ratio * Math.cos(angle)]
}
const ring = (ratio: number) =>
  RADAR_AXES.map((_, i) => point(i, ratio).join(',')).join(' ')
const shape = (pokemon: any) =>
  RADAR_AXES.map((name, i) => {
    const value =
      Number(
        pokemon?.stats?.find((s: any) => s?.stat?.name === name)?.base_stat
      ) || 0
    return point(i, Math.min(value, 200) / 200).join(',')
  }).join(' ')

/** Bottom sheet to choose a Pokémon by name or dex number. */
function PickerSheet({
  side,
  onPick,
  onClose,
}: {
  side: Side | null
  onPick: (name: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const dialogRef = useDialog<HTMLDivElement>(!!side, onClose)
  const inputRef = useRef<HTMLInputElement>(null)
  // moving on from A to B keeps the sheet open: back to the search box
  useEffect(() => {
    if (side) inputRef.current?.focus()
  }, [side])
  const { data, isError, refetch } = useGetPokemonListQuery(
    { limit: 1500, offset: 0 },
    { skip: !side }
  )
  const results = useMemo(
    () => searchPokemon(data?.results, query, 12),
    [data?.results, query]
  )
  // an empty box offers the Pokémon read most recently
  const recent: { id: number; name: string }[] = side ? getRecent() : []
  const shown = query.trim() ? results : recent
  if (!side) return null
  const pick = (name: string) => {
    onPick(name)
    setQuery('')
  }
  return (
    <SheetStyle onClick={onClose} data-side={side}>
      <div
        ref={dialogRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Chọn Pokémon ${SIDE_NAME[side]}`}
        onClick={(event) => event.stopPropagation()}
      >
        <span className="grip" aria-hidden="true" />
        <div className="sheet-head">
          <h2>Chọn đấu thủ {SIDE_NAME[side]}</h2>
          <button type="button" className="close" onClick={onClose}>
            Đóng
          </button>
        </div>
        <input
          ref={inputRef}
          type="search"
          autoFocus
          value={query}
          placeholder="Tên hoặc số Pokédex"
          aria-label="Tìm Pokémon"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && shown[0]) {
              event.preventDefault()
              pick(shown[0].name)
            }
          }}
        />
        {isError ? (
          <p className="note">
            Không tải được danh sách.{' '}
            <button type="button" onClick={() => refetch()}>
              Thử lại
            </button>
          </p>
        ) : !query.trim() && !recent.length ? (
          <p className="note">Gõ tên hoặc số để tìm đấu thủ.</p>
        ) : shown.length ? (
          <>
            {!query.trim() && <h3 className="results-heading">Vừa xem</h3>}
            <ul className="results">
              {shown.map((result) => (
                <li key={result.name}>
                  <button type="button" onClick={() => pick(result.name)}>
                    <img
                      src={getPokemonSprite(result.id)}
                      alt=""
                      width={48}
                      height={48}
                      loading="lazy"
                    />
                    <span>{pokemonLabel(result.name)}</span>
                    {result.id <= 1025 && (
                      <small>#{String(result.id).padStart(4, '0')}</small>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="note">Không có Pokémon nào khớp “{query.trim()}”.</p>
        )}
      </div>
    </SheetStyle>
  )
}

const haloOf = (pokemon: any) =>
  TYPE_DATA[typeNames(pokemon)[0] as keyof typeof TYPE_DATA]?.color ??
  'transparent'

/**
 * One half of the arena. The whole portrait is the control: tap the
 * Pokémon to swap it, tap the empty ring to pick one.
 */
function Portrait({
  pokemon,
  side,
  loading,
  onChange,
}: {
  pokemon: any
  side: Side
  loading: boolean
  onChange: () => void
}) {
  const label = pokemon
    ? `Đổi ${pokemonLabel(pokemon.name)} (đấu thủ ${SIDE_NAME[side]})`
    : `Chọn đấu thủ ${SIDE_NAME[side]}`
  return (
    <button
      type="button"
      className={`portrait portrait--${side}`}
      data-empty={!pokemon}
      aria-label={label}
      onClick={onChange}
      style={{ '--halo': haloOf(pokemon) } as CSSProperties}
    >
      {pokemon ? (
        <img
          key={pokemon.id}
          src={getPokemonImage(pokemon.id)}
          alt=""
          width={200}
          height={200}
          decoding="async"
        />
      ) : (
        <span className="slot" aria-hidden="true">
          {loading ? '…' : '+'}
        </span>
      )}
      {pokemon && (
        <span className="edit" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5" />
          </svg>
        </span>
      )}
    </button>
  )
}

const NAME_MIN = 11
const NAME_LINES = 2

/**
 * Shrinks a plate name until it fits in two lines without any word
 * overflowing. Starts from the CSS size each time, so it grows back
 * when the plate gets wider.
 */
function fitPlateName(title: HTMLElement) {
  title.style.fontSize = ''
  let size = parseFloat(getComputedStyle(title).fontSize)
  // offsetHeight, not scrollHeight: the link's tap padding overflows on purpose
  const fits = () =>
    title.scrollWidth <= title.clientWidth + 1 &&
    title.offsetHeight <= size * 1.1 * NAME_LINES + 2
  while (!fits() && size > NAME_MIN) {
    size = Math.max(NAME_MIN, size - 1)
    title.style.fontSize = `${size}px`
  }
}

function useFitPlateName(text: string) {
  const ref = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    const title = ref.current
    if (!title) return
    let width = 0
    const fit = () => {
      // only width changes matter; our own height changes must not loop
      if (title.clientWidth === width) return
      width = title.clientWidth
      fitPlateName(title)
    }
    fit()
    let alive = true
    document.fonts?.ready.then(() => {
      if (!alive) return
      width = 0
      fit()
    })
    const observer = new ResizeObserver(fit)
    observer.observe(title)
    return () => {
      alive = false
      observer.disconnect()
    }
  }, [text])
  return ref
}

/** Name plate under the arena; rows line up with the other side's. */
function Plate({
  pokemon,
  side,
  leader,
  loading,
}: {
  pokemon: any
  side: Side
  leader: boolean
  loading: boolean
}) {
  const power = pokemon ? getPokemonPower(pokemon.stats ?? []) : null
  const name = pokemon
    ? pokemonLabel(pokemon.name)
    : `Đấu thủ ${SIDE_NAME[side]}`
  const nameRef = useFitPlateName(loading && !pokemon ? 'loading' : name)
  return (
    <div
      className={`plate plate--${side}`}
      data-leader={leader}
      style={{ '--tier': power?.color.a } as CSSProperties}
    >
      <h2
        ref={nameRef}
        className="fighter-name"
        style={
          {
            '--word': Math.max(
              ...name.split(/\s+/).map((word: string) => word.length)
            ),
          } as CSSProperties
        }
      >
        {leader && (
          <svg className="crown" viewBox="0 0 24 24" aria-label="Mạnh hơn">
            <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.6 9H4.6z" />
          </svg>
        )}
        {pokemon ? (
          <LinkCustom to={`/pokemon/${pokemon.name}`}>{name}</LinkCustom>
        ) : loading ? (
          'Đang tải…'
        ) : (
          name
        )}
      </h2>
      {power ? (
        <p className="tier">
          <b>{power.rank}</b>
          <span>{power.bst} BST</span>
        </p>
      ) : (
        <p className="tier tier--empty">Chạm ô trên để chọn</p>
      )}
      <p className="types">
        {(pokemon?.types ?? []).map(({ type }: { type: { name: string } }) => {
          const info = TYPE_DATA[type.name as keyof typeof TYPE_DATA]
          return (
            <span
              key={type.name}
              style={{ '--type': info?.color } as CSSProperties}
            >
              {info?.label ?? type.name}
            </span>
          )
        })}
      </p>
    </div>
  )
}

/** /so-sanh?a=garchomp&b=salamence — two Pokémon, head to head. */
export default function ComparePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navigateInfo = useNavigateInfo()
  const pair = readComparePair(location.search)
  const [picking, setPicking] = useState<Side | null>(null)
  const [shared, setShared] = useState(false)
  const setPair = (next: { a: string; b: string }) => {
    const params = new URLSearchParams()
    if (next.a) params.set('a', next.a)
    if (next.b) params.set('b', next.b)
    navigate(`?${params}`, { replace: true, state: { keepPage: true } })
  }
  const goBack = () =>
    navigateInfo.from
      ? navigate(-1)
      : navigate(import.meta.env.ROUTER_HOME_PATH)

  const { data: a, isFetching: loadingA } = useGetPokemonDetailQuery(pair.a, {
    skip: !pair.a,
  })
  const { data: b, isFetching: loadingB } = useGetPokemonDetailQuery(pair.b, {
    skip: !pair.b,
  })
  const both = a && b
  const result = both ? compareStats(a, b) : null

  setSeoTag({
    title: both
      ? `${pokemonLabel(a.name)} vs ${pokemonLabel(b.name)} – So sánh | Pokédex`
      : 'So sánh Pokémon | Pokédex',
    description:
      'Đặt hai Pokémon cạnh nhau: hạng sức mạnh, hệ và từng chỉ số cơ bản.',
    robots: both ? 'index, follow' : 'noindex, follow',
  })

  // who leads: total first, stats won as the tie-break
  const leader: Side | null = !result
    ? null
    : result.totalA !== result.totalB
      ? result.totalA > result.totalB
        ? 'a'
        : 'b'
      : result.winsA !== result.winsB
        ? result.winsA > result.winsB
          ? 'a'
          : 'b'
        : null

  const verdict = (() => {
    if (!result || !both) return ''
    if (!leader) return 'Ngang tài ngang sức!'
    const name = pokemonLabel((leader === 'a' ? a : b).name)
    const wins = leader === 'a' ? result.winsA : result.winsB
    const gap = Math.abs(result.totalA - result.totalB)
    return gap
      ? `${name} nhỉnh hơn ${gap} điểm, thắng ${wins}/6 chỉ số.`
      : `Cùng ${result.totalA} điểm; ${name} thắng ${wins}/6 chỉ số.`
  })()

  const share = async () => {
    const url = window.location.href
    const title = `${pokemonLabel(a.name)} vs ${pokemonLabel(b.name)}`
    try {
      if (navigator.share) {
        await navigator.share({ title, text: verdict, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setShared(true)
      window.setTimeout(() => setShared(false), 2000)
    } catch {
      // the reader closing the share sheet is not an error
    }
  }

  const label = (side: Side) => {
    const mon = side === 'a' ? a : b
    return mon ? pokemonLabel(mon.name) : `Đấu thủ ${SIDE_NAME[side]}`
  }

  return (
    <CompareStyle
      style={{ '--a': '#e3350d', '--b': '#2a6fdb' } as CSSProperties}
    >
      <div className="topbar">
        <button type="button" className="back" onClick={goBack}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12H5M11 5l-7 7 7 7" />
          </svg>
          Quay lại
        </button>
        <h1>So sánh</h1>
        <button
          type="button"
          className="swap"
          aria-label="Đổi chỗ hai đấu thủ"
          onClick={() => setPair({ a: pair.b, b: pair.a })}
          disabled={!pair.a && !pair.b}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
          </svg>
        </button>
      </div>

      <section
        className="versus"
        aria-label="Hai đấu thủ"
        data-ready={!!both}
        // replay the clash whenever the line-up changes
        key={`${pair.a}|${pair.b}`}
      >
        <div className="arena">
          <span className="half" aria-hidden="true" />
          <span className="seam" aria-hidden="true" />
          <Portrait
            pokemon={a}
            side="a"
            loading={!!pair.a && loadingA && !a}
            onChange={() => setPicking('a')}
          />
          <span className="vs" aria-hidden="true">
            VS
          </span>
          <Portrait
            pokemon={b}
            side="b"
            loading={!!pair.b && loadingB && !b}
            onChange={() => setPicking('b')}
          />
        </div>
        <div className="plates">
          <Plate
            pokemon={a}
            side="a"
            leader={leader === 'a'}
            loading={!!pair.a && loadingA && !a}
          />
          <Plate
            pokemon={b}
            side="b"
            leader={leader === 'b'}
            loading={!!pair.b && loadingB && !b}
          />
        </div>
      </section>

      {result && both ? (
        <>
          <div className="verdict-row">
            <p className="verdict" role="status">
              {verdict}
            </p>
            <button type="button" className="share" onClick={share}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
              </svg>
              {shared ? 'Đã chép link' : 'Chia sẻ trận này'}
            </button>
          </div>

          <Matchup a={a} b={b} />

          <div className="board">
            <div className="ropes">
              {/* who is red, who is blue, kept in view while reading the ropes */}
              <p className="legend">
                <span className="legend-a">{label('a')}</span>
                <span className="legend-b">{label('b')}</span>
              </p>

              <ol className="tug" aria-label="Từng chỉ số">
                {result.rows.map((row, index) => {
                  const total = Math.max(row.a + row.b, 1)
                  const gap = Math.abs(row.diff)
                  return (
                    <li
                      key={row.name}
                      data-lead={row.lead}
                      style={
                        {
                          '--share': `${(row.a / total) * 100}%`,
                          '--i': index,
                        } as CSSProperties
                      }
                    >
                      <span className="num num--a">
                        {row.a}
                        {row.lead === 'a' && <small>+{gap}</small>}
                      </span>
                      <span className="label">{statLabel(row.name)}</span>
                      <span className="num num--b">
                        {row.lead === 'b' && <small>+{gap}</small>}
                        {row.b}
                      </span>
                      <span
                        className="rope"
                        role="img"
                        aria-label={`${statLabel(row.name)}: ${label('a')} ${row.a}, ${label('b')} ${row.b}`}
                      />
                    </li>
                  )
                })}
                <li
                  className="sum"
                  data-lead={leader ?? 'tie'}
                  style={
                    {
                      '--share': `${(result.totalA / Math.max(result.totalA + result.totalB, 1)) * 100}%`,
                      '--i': 6,
                    } as CSSProperties
                  }
                >
                  <span className="num num--a">{result.totalA}</span>
                  <span className="label">Tổng</span>
                  <span className="num num--b">{result.totalB}</span>
                  <span className="rope" aria-hidden="true" />
                </li>
              </ol>
            </div>

            <figure className="radar">
              <svg
                viewBox="-20 -6 340 262"
                role="img"
                aria-label="Lục giác chỉ số của hai đấu thủ chồng lên nhau"
              >
                <g fill="none" stroke="var(--line)">
                  {[0.25, 0.5, 0.75, 1].map((r) => (
                    <polygon key={r} points={ring(r)} />
                  ))}
                </g>
                <polygon className="shape shape--a" points={shape(a)} />
                <polygon className="shape shape--b" points={shape(b)} />
                {RADAR_AXES.map((name, i) => {
                  const [x, y] = point(i, 1.2)
                  return (
                    <text
                      key={name}
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {statLabel(name)}
                    </text>
                  )
                })}
              </svg>
              <figcaption>Hình dạng chỉ số</figcaption>
            </figure>
          </div>
        </>
      ) : (
        <div className="empty">
          <p className="hint">
            {pair.a || pair.b
              ? 'Chọn thêm một đấu thủ để bắt đầu trận so tài.'
              : 'Chọn hai Pokémon để xem ai mạnh hơn ở từng chỉ số.'}
          </p>
          {!pair.a && !pair.b && (
            <>
              <h2 className="rivals-heading">Cặp đấu kinh điển</h2>
              <ul className="rivals">
                {RIVALRIES.map(([slugA, idA, slugB, idB]) => (
                  <li key={slugA}>
                    <button
                      type="button"
                      onClick={() => setPair({ a: slugA, b: slugB })}
                    >
                      <img
                        src={getPokemonSprite(idA)}
                        alt=""
                        width={44}
                        height={44}
                        loading="lazy"
                      />
                      <span>
                        {pokemonLabel(slugA)} <em>vs</em> {pokemonLabel(slugB)}
                      </span>
                      <img
                        src={getPokemonSprite(idB)}
                        alt=""
                        width={44}
                        height={44}
                        loading="lazy"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <PickerSheet
        side={picking}
        onClose={() => setPicking(null)}
        onPick={(name) => {
          if (!picking) return
          setPair({ ...pair, [picking]: name })
          // the duel needs two: go straight on to the empty corner
          const other: Side = picking === 'a' ? 'b' : 'a'
          setPicking(pair[other] ? null : other)
        }}
      />
    </CompareStyle>
  )
}
