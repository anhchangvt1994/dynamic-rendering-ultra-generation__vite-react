import {
  useGetPokemonDetailQuery,
  useGetPokemonListQuery,
} from 'app/apis/pokemon'
import { searchPokemon } from 'components/common/SearchPokemonBar/search.mjs'
import { statLabel, titleCase } from 'components/pokemon-page/format.mjs'
import { TYPE_DATA } from 'components/pokemon-page/type-data.mjs'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { getPokemonPower } from 'pages/PokemonPage/power.mjs'
import { useId, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { compareStats, readComparePair } from './compare.mjs'
import { CompareStyle } from './styles'

const SIDE_COLOR = { a: '#e3350d', b: '#2a6fdb' }

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

/** Pick a Pokémon by name or dex number (same ranking as the header search). */
function Picker({
  label,
  value,
  onPick,
}: {
  label: string
  value: string
  onPick: (name: string) => void
}) {
  const id = useId()
  const [query, setQuery] = useState('')
  const { data } = useGetPokemonListQuery({ limit: 1500, offset: 0 })
  const results = useMemo(
    () => searchPokemon(data?.results, query, 6),
    [data?.results, query]
  )
  return (
    <div className="picker">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="search"
        value={query}
        placeholder={value ? titleCase(value) : 'Tên hoặc số…'}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && results[0]) {
            event.preventDefault()
            onPick(results[0].name)
            setQuery('')
          }
        }}
      />
      {query.trim() && (
        <ul className="picker-results">
          {results.map((result) => (
            <li key={result.name}>
              <button
                type="button"
                onClick={() => {
                  onPick(result.name)
                  setQuery('')
                }}
              >
                {titleCase(result.name)}
                <small>#{String(result.id).padStart(4, '0')}</small>
              </button>
            </li>
          ))}
          {!results.length && <li className="none">Không có Pokémon này</li>}
        </ul>
      )}
    </div>
  )
}

function Fighter({ pokemon, side }: { pokemon: any; side: 'a' | 'b' }) {
  if (!pokemon) {
    return (
      <div className={`fighter fighter--${side} fighter--empty`}>
        <span className="placeholder" aria-hidden="true">
          ?
        </span>
        <p>Chọn một Pokémon</p>
      </div>
    )
  }
  const power = getPokemonPower(pokemon.stats ?? [])
  return (
    <div
      className={`fighter fighter--${side}`}
      style={{ '--tier': power.color.a } as CSSProperties}
    >
      <img
        key={pokemon.id}
        src={getPokemonImage(pokemon.id)}
        alt=""
        width={220}
        height={220}
        decoding="async"
      />
      <h2>
        <LinkCustom to={`/pokemon/${pokemon.name}`}>
          {titleCase(pokemon.name)}
        </LinkCustom>
      </h2>
      <p className="tier">
        <b>{power.rank}</b> {power.label}{' '}
        <span className="nowrap">· {power.bst} BST</span>
      </p>
      <p className="types">
        {(pokemon.types ?? []).map(({ type }: { type: { name: string } }) => (
          <span
            key={type.name}
            style={
              {
                '--type': TYPE_DATA[type.name as keyof typeof TYPE_DATA]?.color,
              } as CSSProperties
            }
          >
            {TYPE_DATA[type.name as keyof typeof TYPE_DATA]?.label ?? type.name}
          </span>
        ))}
      </p>
    </div>
  )
}

/** /so-sanh?a=garchomp&b=salamence — two Pokémon, side by side. */
export default function ComparePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const pair = readComparePair(location.search)
  const setPair = (next: { a: string; b: string }) => {
    const params = new URLSearchParams()
    if (next.a) params.set('a', next.a)
    if (next.b) params.set('b', next.b)
    navigate(`?${params}`, { replace: true })
  }

  const { data: a } = useGetPokemonDetailQuery(pair.a, { skip: !pair.a })
  const { data: b } = useGetPokemonDetailQuery(pair.b, { skip: !pair.b })
  const both = a && b
  const result = both ? compareStats(a, b) : null

  setSeoTag({
    title: both
      ? `${titleCase(a.name)} vs ${titleCase(b.name)} – So sánh | Pokédex`
      : 'So sánh Pokémon | Pokédex',
    description:
      'Đặt hai Pokémon cạnh nhau: hạng sức mạnh, hệ và từng chỉ số cơ bản.',
    robots: both ? 'index, follow' : 'noindex, follow',
  })

  const shape = (pokemon: any) =>
    RADAR_AXES.map((name, i) => {
      const value =
        Number(
          pokemon?.stats?.find((s: any) => s?.stat?.name === name)?.base_stat
        ) || 0
      return point(i, Math.min(value, 200) / 200).join(',')
    }).join(' ')

  const verdict = (() => {
    if (!result || !both) return ''
    const nameA = titleCase(a.name)
    const nameB = titleCase(b.name)
    if (result.totalA === result.totalB && result.winsA === result.winsB)
      return 'Ngang tài ngang sức.'
    const leader =
      result.totalA !== result.totalB
        ? result.totalA > result.totalB
          ? 'a'
          : 'b'
        : result.winsA > result.winsB
          ? 'a'
          : 'b'
    const name = leader === 'a' ? nameA : nameB
    const wins = leader === 'a' ? result.winsA : result.winsB
    const gap = Math.abs(result.totalA - result.totalB)
    return gap
      ? `${name} nhỉnh hơn ${gap} điểm tổng, hơn ở ${wins}/6 chỉ số.`
      : `Cùng ${result.totalA} điểm tổng; ${name} hơn ở ${wins}/6 chỉ số.`
  })()

  return (
    <CompareStyle
      style={{ '--a': SIDE_COLOR.a, '--b': SIDE_COLOR.b } as CSSProperties}
    >
      <h1>So sánh Pokémon</h1>

      <div className="pickers">
        <Picker
          label="Pokémon A"
          value={pair.a}
          onPick={(name) => setPair({ ...pair, a: name })}
        />
        <button
          type="button"
          className="swap"
          aria-label="Đổi chỗ hai Pokémon"
          onClick={() => setPair({ a: pair.b, b: pair.a })}
          disabled={!pair.a && !pair.b}
        >
          ⇄
        </button>
        <Picker
          label="Pokémon B"
          value={pair.b}
          onPick={(name) => setPair({ ...pair, b: name })}
        />
      </div>

      <section className="versus" aria-label="Hai Pokémon">
        <Fighter pokemon={a} side="a" />
        <span className="vs" aria-hidden="true">
          VS
        </span>
        <Fighter pokemon={b} side="b" />
      </section>

      {result && both && (
        <>
          <p className="verdict" role="status">
            {verdict}
          </p>

          <div className="radar">
            <svg
              viewBox="0 0 300 240"
              role="img"
              aria-label="Lục giác chỉ số chồng lên nhau"
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

          <table className="stats">
            <caption className="sr-only">
              Chỉ số cơ bản của {titleCase(a.name)} và {titleCase(b.name)}
            </caption>
            <thead>
              <tr>
                <th scope="col">{titleCase(a.name)}</th>
                <th scope="col">Chỉ số</th>
                <th scope="col">{titleCase(b.name)}</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.name} data-lead={row.lead}>
                  <td className="side side--a">
                    <span className="num">{row.a}</span>
                    <span
                      className="bar"
                      style={
                        { '--w': Math.min(row.a, 200) / 2 } as CSSProperties
                      }
                    />
                  </td>
                  <th scope="row">{statLabel(row.name)}</th>
                  <td className="side side--b">
                    <span
                      className="bar"
                      style={
                        { '--w': Math.min(row.b, 200) / 2 } as CSSProperties
                      }
                    />
                    <span className="num">{row.b}</span>
                  </td>
                </tr>
              ))}
              <tr
                className="total"
                data-lead={
                  result.totalA > result.totalB
                    ? 'a'
                    : result.totalA < result.totalB
                      ? 'b'
                      : 'tie'
                }
              >
                <td className="side side--a">
                  <span className="num">{result.totalA}</span>
                </td>
                <th scope="row">Tổng</th>
                <td className="side side--b">
                  <span className="num">{result.totalB}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}
      {!both && (
        <p className="hint">
          Chọn hai Pokémon để xem ai mạnh hơn ở từng chỉ số. Mẹo: từ trang một
          Pokémon, bấm “So sánh”.
        </p>
      )}
    </CompareStyle>
  )
}
