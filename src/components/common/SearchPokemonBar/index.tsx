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
  // the 1300-name list is only needed once someone actually searches
  const [wanted, setWanted] = useState(false)
  useEffect(() => {
    if (isOpen) setWanted(true)
  }, [isOpen])

  const { data, isFetching } = useGetPokemonListQuery(
    { limit: 1500, offset: 0 },
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
        <SearchBarStyle>
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
          <input
            autoFocus
            type="search"
            role="combobox"
            aria-label="Tìm Pokémon theo tên hoặc số Pokédex"
            aria-expanded={results.length > 0}
            aria-controls={LIST_ID}
            aria-autocomplete="list"
            aria-activedescendant={active ? optionId(active.name) : undefined}
            placeholder="Tên hoặc số, ví dụ “pika” hay “25”"
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
        </SearchBarStyle>

        <SearchBodyStyle>
          {!keyword.trim() ? null : waiting ? (
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
