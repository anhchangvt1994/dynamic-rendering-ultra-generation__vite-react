import Icon from 'components/common/Icon'
import FieldIcon from 'components/common/FieldIcon'
import { useGetPokemonListQuery } from 'app/apis/pokemon'
import useDialog from 'hooks/useDialog'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { functionGenerator } from 'utils/EnvHelper'
import SearchNoData from './components/SearchNoData'
import SearchResults, { optionId } from './components/SearchResults'
import { searchPokemon } from './search.mjs'
import {
  ContainerStyle,
  OverlayStyle,
  SearchBarStyle,
  SearchBodyStyle,
} from './styles'

interface SearchBarProps {
  isOpen: boolean
  onClose: () => void
}

const LIST_ID = 'pokemon-search-results'
const toPath = functionGenerator(
  import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION
)

/**
 * Pokédex search as a combobox dialog: results filter as you type (by name
 * or dex number), ↑/↓ move through them, Enter opens the highlighted one,
 * Escape closes and returns focus to the header button.
 */
const SearchPokemonBar = ({ isOpen, onClose }: SearchBarProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [keyword, setKeyword] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  // the 1300-name list is only needed once someone actually searches
  const [wanted, setWanted] = useState(false)
  useEffect(() => {
    if (isOpen) setWanted(true)
  }, [isOpen])

  const { data, isFetching, isError, refetch } = useGetPokemonListQuery(
    { limit: 1025, offset: 0 },
    { skip: !wanted }
  )
  const results = useMemo(
    () => searchPokemon(data?.results, keyword),
    [data?.results, keyword]
  )

  // every opening starts clean
  useEffect(() => {
    if (!isOpen) {
      setKeyword('')
      setActiveIndex(0)
    }
  }, [isOpen])

  // following a result (or any navigation) closes the dialog
  const pathname = location.pathname
  const lastPathname = useRef(pathname)
  useEffect(() => {
    if (lastPathname.current === pathname) return
    lastPathname.current = pathname
    onClose()
  }, [onClose, pathname])

  const dialogRef = useDialog<HTMLDivElement>(isOpen, onClose)

  const open = (index: number) => {
    const target = results[index]
    if (target) navigate(toPath(getSlug(target.name)))
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if (!results.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      const next = (activeIndex + step + results.length) % results.length
      setActiveIndex(next)
      document
        .getElementById(optionId(results[next].name))
        ?.scrollIntoView({ block: 'nearest' })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      open(activeIndex)
    }
  }

  if (!isOpen) return null

  const waiting = !!keyword && !data && isFetching
  const active = results[activeIndex]

  return (
    <OverlayStyle onClick={onClose}>
      <ContainerStyle
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Tìm Pokémon"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-heading">
          <div>
            <span>POKÉDEX SEARCH</span>
            <h2>Tìm người bạn của bạn</h2>
          </div>
          <button type="button" aria-label="Đóng tìm kiếm" onClick={onClose}>
            <FieldIcon name="close" />
          </button>
        </div>
        <SearchBarStyle>
          <Icon name="search" className="icon" />
          <input
            ref={inputRef}
            autoFocus
            type="search"
            role="combobox"
            aria-label="Tìm Pokémon theo tên hoặc số Pokédex"
            aria-expanded={results.length > 0}
            aria-controls={LIST_ID}
            aria-autocomplete="list"
            aria-activedescendant={active ? optionId(active.name) : undefined}
            placeholder="Tên hoặc số, ví dụ Pikachu, #25"
            enterKeyHint="go"
            autoComplete="off"
            spellCheck={false}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={onKeyDown}
          />
          {keyword && (
            <button
              type="button"
              aria-label="Xóa tìm kiếm"
              onClick={() => {
                setKeyword('')
                setActiveIndex(0)
                inputRef.current?.focus()
              }}
            >
              <FieldIcon name="close" size={17} />
            </button>
          )}
        </SearchBarStyle>

        <SearchBodyStyle>
          {isError && !data ? (
            <div className="search-error" role="alert">
              <p>Chưa tải được Pokédex.</p>
              <button type="button" onClick={refetch}>
                Thử lại
              </button>
            </div>
          ) : !keyword.trim() ? (
            <div className="search-suggestions">
              <p>Thử một cái tên quen thuộc</p>
              {['Pikachu', 'Eevee', 'Gengar'].map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => {
                    setKeyword(name)
                    setActiveIndex(0)
                    inputRef.current?.focus()
                  }}
                >
                  {name} ↗
                </button>
              ))}
            </div>
          ) : waiting ? (
            <p className="hint" role="status">
              Đang mở Pokédex…
            </p>
          ) : results.length ? (
            <SearchResults
              keyword={keyword}
              results={results}
              activeIndex={activeIndex}
              listId={LIST_ID}
              onHover={setActiveIndex}
            />
          ) : (
            <SearchNoData keyword={keyword} />
          )}
        </SearchBodyStyle>
      </ContainerStyle>
    </OverlayStyle>
  )
}

export default SearchPokemonBar
