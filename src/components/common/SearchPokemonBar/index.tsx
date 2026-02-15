import { useGetPokemonListQuery } from 'app/apis/pokemon'
import React, { useEffect, useMemo, useRef, useState } from 'react'
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

    setKeyword(target.value || '')
  }

  const searchResultBody = useMemo(() => {
    if (!keyword) return null

    // if (isError || !results) return <SearchError />

    // if (!results.length) return <SearchNoData />
    if (isFiltering) return <SearchLoading />

    return <SearchResults keyword={keyword} searchResults={results || []} />
  }, [isFiltering, JSON.stringify(results)])

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
  }, [keyword, JSON.stringify(data), isOpen])

  useEffect(() => {
    if (
      currentPathname.current &&
      currentPathname.current !== location.pathname
    ) {
      onClose()
    }
  }, [location.pathname])

  if (!isOpen) return null

  return (
    <OverlayStyle onClick={onClose}>
      <ContainerStyle onClick={(e) => e.stopPropagation()}>
        <SearchBarStyle>
          <span className="material-symbols-outlined">search</span>
          <input
            autoFocus
            type="text"
            placeholder="Search..."
            onChange={search}
          />
        </SearchBarStyle>

        <SearchBodyStyle>{searchResultBody}</SearchBodyStyle>
      </ContainerStyle>
    </OverlayStyle>
  )
}

export default SearchPokemonBar
