import { useSearchArticlesByTitleQuery } from 'app/apis/blog'
import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
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

const SearchBlogBar = ({ isOpen, onClose }: SearchBarProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<{ name: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const location = useLocation()
  const currentPathname = useRef(location.pathname)

  const { data, isFetching } = useSearchArticlesByTitleQuery(keyword)

  const search = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const target = e.target as HTMLInputElement
    if (target.value) setIsSearching(true)
    else {
      setKeyword('')
      setIsSearching(false)
      return
    }

    timeoutRef.current = setTimeout(() => {
      setKeyword(target.value || '')
    }, 500)
  }

  useEffect(() => {
    setIsSearching(isFetching)
  }, [isFetching])

  useEffect(() => {
    setResults(data?.data ?? [])
  }, [JSON.stringify(data)])

  useEffect(() => {
    if (
      currentPathname.current &&
      currentPathname.current !== location.pathname
    ) {
      onClose()
    }
  }, [location.pathname])

  const handleScroll = () => {
    inputRef.current?.blur()
  }

  const searchResultBody = useMemo(() => {
    if (isSearching) return <SearchLoading />

    if (!keyword || !results || !results.length) return null

    return (
      <SearchResults
        keyword={keyword}
        searchResults={results || []}
        onScroll={handleScroll}
      />
    )
  }, [isSearching, JSON.stringify(results)])

  if (!isOpen) return null

  return (
    <OverlayStyle onClick={onClose}>
      <ContainerStyle onClick={(e) => e.stopPropagation()}>
        <SearchBarStyle>
          <span className="material-symbols-outlined">search</span>
          <input
            ref={inputRef}
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

export default SearchBlogBar
