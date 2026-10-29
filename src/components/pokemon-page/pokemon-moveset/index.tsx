import { useMemo, useState } from 'react'
import {
  MagnifyingGlassIcon,
  Cross2Icon,
  PlusIcon,
} from '@radix-ui/react-icons'
import AppSelect from 'components/common/Select'
import { titleCase } from '../format.mjs'
import { filterMoves, getMoveVersions, getMoveMethods } from './moves.mjs'
import { MovesetStyle } from './styles'

const METHODS = [
  ['all', 'Tất cả'],
  ['level-up', 'Lên cấp'],
  ['machine', 'TM'],
  ['egg', 'Trứng'],
  ['tutor', 'Dạy chiêu'],
  ['train', 'Huấn luyện'],
]
const PAGE_SIZE = 12

export default function PokemonMoveset({ moveset = [] }) {
  const versions = useMemo(() => getMoveVersions(moveset), [moveset])
  const [version, setVersion] = useState(() => versions[0]?.value || '')
  const [query, setQuery] = useState('')
  const [method, setMethod] = useState('all')
  const [shown, setShown] = useState(PAGE_SIZE)
  const availableMethods = useMemo(
    () => getMoveMethods(moveset, version),
    [moveset, version]
  )
  const moves = useMemo(
    () => filterMoves(moveset, { version, method, query }),
    [moveset, version, method, query]
  )
  const filtered = !!query || method !== 'all'
  const reset = () => {
    setQuery('')
    setMethod('all')
    setShown(PAGE_SIZE)
  }
  return (
    <MovesetStyle aria-label="Bộ chiêu thức">
      <div className="moves-heading">
        <div>
          <span className="eyebrow">MOVE LIBRARY</span>
          <h3>Bộ chiêu thức</h3>
        </div>
        <span className="moves-total" role="status">
          {moves.length} chiêu
        </span>
      </div>
      {versions.length > 0 && (
        <div className="moves-version">
          <span>Phiên bản trò chơi</span>
          <AppSelect
            label="Phiên bản trò chơi"
            value={version}
            options={versions}
            onValueChange={(value) => {
              setVersion(value)
              setMethod('all')
              setShown(PAGE_SIZE)
            }}
          />
        </div>
      )}
      <div className="moves-search">
        <MagnifyingGlassIcon width={18} height={18} />
        <input
          type="search"
          aria-label="Tìm chiêu thức"
          placeholder="Tìm chiêu thức…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setShown(PAGE_SIZE)
          }}
        />
        {query && (
          <button
            type="button"
            aria-label="Xóa tìm chiêu thức"
            onClick={(event) => {
              setQuery('')
              setShown(PAGE_SIZE)
              event.currentTarget.parentElement?.querySelector('input')?.focus()
            }}
          >
            <Cross2Icon width={16} height={16} />
          </button>
        )}
      </div>
      <div className="move-methods" aria-label="Lọc cách học">
        {METHODS.filter(
          ([key]) => key === 'all' || availableMethods.includes(key)
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={method === key}
            onClick={() => {
              setMethod(key)
              setShown(PAGE_SIZE)
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {moves.length ? (
        <>
          <table>
            <caption className="sr-only">
              Chiêu thức theo{' '}
              {versions.find((item) => item.value === version)?.label ||
                'dữ liệu hiện có'}
            </caption>
            <thead>
              <tr>
                <th scope="col">Chiêu thức</th>
                <th scope="col">Cách học</th>
              </tr>
            </thead>
            <tbody>
              {moves.slice(0, shown).map(({ entry, learning }) => (
                <tr key={entry.move.name}>
                  <td>{titleCase(entry.move.name)}</td>
                  <td>
                    <span className="learning-badge">{learning.label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {moves.length > shown && (
            <button
              className="moves-more"
              type="button"
              onClick={() => setShown((count) => count + PAGE_SIZE)}
            >
              <PlusIcon width={15} height={15} /> Xem thêm{' '}
              {Math.min(PAGE_SIZE, moves.length - shown)} chiêu
              <span>
                {shown}/{moves.length}
              </span>
            </button>
          )}
        </>
      ) : (
        <div className="moves-empty">
          <p>
            {moveset.length
              ? 'Không có chiêu phù hợp.'
              : 'Chưa có dữ liệu chiêu thức.'}
          </p>
          {filtered && (
            <button type="button" onClick={reset}>
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}
      <p className="moves-note">
        Cách học theo phiên bản đã chọn. Một chiêu có thể học bằng nhiều cách;
        chọn cách học để xem từng nhóm.
      </p>
    </MovesetStyle>
  )
}
