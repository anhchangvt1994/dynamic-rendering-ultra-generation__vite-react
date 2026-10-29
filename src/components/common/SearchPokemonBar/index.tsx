import useEscapeToClose from 'hooks/useEscapeToClose'
import { useGetPokemonListQuery } from 'app/apis/pokemon'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import SearchNoData from './components/SearchNoData'
import SearchResults from './components/SearchResults'
import SearchLoading from './components/SearchResults/loading'
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

const SearchPokemonBar = ({ isOpen, onClose }: SearchBarProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<{ name: string }[]>([])
  const [isFiltering, setIsFiltering] = useState(false)
  const location = useLocation()
  const currentPathname = useRef(location.pathname)

  const { data } = useGetPokemonListQuery({
    limit: 1500,
    offset: 0,
  })

  const search = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement
    if (target.value) setIsFiltering(true)
    else setIsFiltering(false)

    setKeyword(target.value.toLowerCase() || '')
  }

  const handleScroll = () => {
    inputRef.current?.blur()
  }

  const searchResultBody = useMemo(() => {
    if (!keyword) return null

    if (isFiltering) return <SearchLoading />
    if (!results.length) return <SearchNoData keyword={keyword} />

    return (
      <SearchResults
        keyword={keyword}
        searchResults={results || []}
        onScroll={handleScroll}
      />
    )
  }, [isFiltering, keyword, results])

  useEffect(() => {
    if (!isOpen) return

    timeoutRef.current = setTimeout(() => {
      if (!keyword || !data?.results || !data.results.length) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setResults([])
        return
      }

      const tmpResults = data.results.filter((result: { name: string }) => {
        return result.name && result.name.indexOf(keyword) !== -1
      })

      setResults(tmpResults)
      setIsFiltering(false)
    }, 500)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [keyword, data?.results, isOpen])

  useEffect(() => {
    if (currentPathname.current === location.pathname) return

    currentPathname.current = location.pathname
    onClose()
  }, [location.pathname, onClose])

  useEscapeToClose(isOpen, onClose)

  if (!isOpen) return null

  return (
    <OverlayStyle onClick={onClose}>
      <ContainerStyle onClick={(e) => e.stopPropagation()}>
        <SearchBarStyle>
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
          <input
            ref={inputRef}
            autoFocus
            type="search"
            aria-label="Tìm Pokémon theo tên"
            placeholder="Tìm Pokémon theo tên…"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            onChange={search}
          />
        </SearchBarStyle>

        <SearchBodyStyle>{searchResultBody}</SearchBodyStyle>
      </ContainerStyle>
    </OverlayStyle>
  )
}

export default SearchPokemonBar
