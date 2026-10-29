import useEscapeToClose from 'hooks/useEscapeToClose'
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

  // An empty keyword has no request to make (the endpoint returns nothing).
  const { data, isFetching } = useSearchArticlesByTitleQuery(keyword, {
    skip: !keyword,
  })

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
  }, [data?.data])

  useEffect(() => {
    if (currentPathname.current === location.pathname) return

    currentPathname.current = location.pathname
    onClose()
  }, [location.pathname, onClose])

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
  }, [isSearching, keyword, results])

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
            aria-label="Tìm bài viết theo tiêu đề"
            placeholder="Tìm bài viết…"
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

export default SearchBlogBar
