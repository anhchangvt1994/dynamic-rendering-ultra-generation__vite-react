import {
  useGetPokemonDetailQuery,
  useGetPokemonListQuery,
} from 'app/apis/pokemon'
import { useNavigateInfo } from 'app/router/context/InfoContext'
import { searchPokemon } from 'components/common/SearchPokemonBar/search.mjs'
import { pokemonLabel, statLabel } from 'components/pokemon-page/format.mjs'
import { TYPE_DATA } from 'components/pokemon-page/type-data.mjs'
import useDialog from 'hooks/useDialog'
import {
  getPokemonImage,
  getPokemonSprite,
} from 'pages/PokemonPage/navigation.mjs'
import { getPokemonPower } from 'pages/PokemonPage/power.mjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { compareStats, readComparePair } from './compare.mjs'
import { CompareStyle, SheetStyle } from './styles'

type Side = 'a' | 'b'
const SIDE_NAME: Record<Side, string> = { a: 'A', b: 'B' }

// radar geometry (HP on top, clockwise), values past 200 sit on the rim
const RADAR_AXES = [
  'hp',
  'attack',
  'defense',
  'speed',
  'special-defense',
  'special-attack',
]
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
          placeholder="Tên hoặc số, ví dụ “gar” hay “445”"
          aria-label="Tìm Pokémon"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && results[0]) {
              event.preventDefault()
              pick(results[0].name)
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
        ) : !query.trim() ? (
          <p className="note">Gõ tên hoặc số để tìm đấu thủ.</p>
        ) : results.length ? (
          <ul className="results">
            {results.map((result) => (
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
        ) : (
          <p className="note">Không có Pokémon nào khớp “{query.trim()}”.</p>
        )}
      </div>
    </SheetStyle>
  )
}

function Fighter({
  pokemon,
  side,
  leader,
  loading,
  onChange,
}: {
  pokemon: any
  side: Side
  leader: boolean
  loading: boolean
  onChange: () => void
}) {
  const power = pokemon ? getPokemonPower(pokemon.stats ?? []) : null
  return (
    <div
      className={`fighter fighter--${side}`}
      data-leader={leader}
      style={power ? ({ '--tier': power.color.a } as CSSProperties) : undefined}
    >
      {leader && (
        <span className="crown">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.6 9H4.6z" />
          </svg>
          Mạnh hơn
        </span>
      )}
      <div className="art">
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
          <span className="placeholder" aria-hidden="true">
            {loading ? '…' : '?'}
          </span>
        )}
      </div>
      <h2
        className="fighter-name"
        style={
          {
            '--word': Math.max(
              ...(pokemon ? pokemonLabel(pokemon.name) : 'Đấu thủ')
                .split(/\s+/)
                .map((word: string) => word.length)
            ),
          } as CSSProperties
        }
      >
        {pokemon ? (
          <LinkCustom to={`/pokemon/${pokemon.name}`}>
            {pokemonLabel(pokemon.name)}
          </LinkCustom>
        ) : loading ? (
          'Đang tải…'
        ) : (
          `Đấu thủ ${SIDE_NAME[side]}`
        )}
      </h2>
      {power && (
        <p className="tier">
          <b>{power.rank}</b>
          <span>{power.bst} BST</span>
        </p>
      )}
      {pokemon && (
        <p className="types">
          {(pokemon.types ?? []).map(({ type }: { type: { name: string } }) => {
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
      )}
      <button type="button" className="change" onClick={onChange}>
        {pokemon ? 'Đổi' : 'Chọn Pokémon'}
      </button>
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

      <section className="versus" aria-label="Hai đấu thủ">
        <Fighter
          pokemon={a}
          side="a"
          leader={leader === 'a'}
          loading={!!pair.a && loadingA && !a}
          onChange={() => setPicking('a')}
        />
        <span className="vs" aria-hidden="true">
          VS
        </span>
        <Fighter
          pokemon={b}
          side="b"
          leader={leader === 'b'}
          loading={!!pair.b && loadingB && !b}
          onChange={() => setPicking('b')}
        />
      </section>

      {result && both ? (
        <>
          <p className="verdict" role="status">
            {verdict}
          </p>

          <div className="board">
            <ol className="tug" aria-label="Từng chỉ số">
              {result.rows.map((row, index) => {
                const total = Math.max(row.a + row.b, 1)
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
                    <span className="num num--a">{row.a}</span>
                    <span className="label">{statLabel(row.name)}</span>
                    <span className="num num--b">{row.b}</span>
                    <span
                      className="rope"
                      role="img"
                      aria-label={`${statLabel(row.name)}: ${pokemonLabel(a.name)} ${row.a}, ${pokemonLabel(b.name)} ${row.b}`}
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

            <div className="radar">
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
            </div>
          </div>
        </>
      ) : (
        <p className="hint">
          {pair.a || pair.b
            ? 'Chọn thêm một đấu thủ để bắt đầu trận so tài.'
            : 'Chọn hai Pokémon để xem ai mạnh hơn ở từng chỉ số.'}
        </p>
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
