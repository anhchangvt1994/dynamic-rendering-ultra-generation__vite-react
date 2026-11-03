import Icon from 'components/common/Icon'
import FieldIcon from 'components/common/FieldIcon'
import SearchNoData from './components/SearchNoData'
import useDismissKeyboardOnDrag from 'hooks/useDismissKeyboardOnDrag'
import useDialog from 'hooks/useDialog'
import {
  BLOG_ENABLED,
  useGetArticlesQuery,
  useSearchArticlesQuery,
} from 'app/apis/blog'
import type { ArticleHit } from 'app/apis/blog'
import { cleanTerm } from 'app/apis/blogPaths.mjs'
import { articleHref } from 'pages/BlogPage/href'
import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import SearchResults, { optionId } from './components/SearchResults'
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

const LIST_ID = 'blog-search-results'
const DEBOUNCE_MS = 400

/**
 * Field Notes search, the Pokédex search's dialog: type to filter (title),
 * ↑/↓ move through the hits, Enter opens the highlighted one, Escape closes.
 */
const SearchBlogBar = ({ isOpen, onClose }: SearchBarProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  // what is asked of the API: the typed text after a pause
  const [keyword, setKeyword] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const { data, isFetching, isError, refetch } = useSearchArticlesQuery(
    keyword,
    { skip: !keyword }
  )
  // the desk is cached already: a few words of it make the suggestions
  const { data: list } = useGetArticlesQuery({ skip: !isOpen })

  const results: ArticleHit[] = Array.isArray(data) ? data : []
  const suggestions: string[] = Array.isArray(list)
    ? [
        ...new Set(
          (list as ArticleHit[]).map((a) =>
            a.title.split(/[\s:,]+/)[0].slice(0, 16)
          )
        ),
      ]
        .filter(Boolean)
        .slice(0, 3)
    : []

  useEffect(() => {
    const id = setTimeout(() => setKeyword(value.trim()), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [value])

  // every opening starts clean
  useEffect(() => {
    if (!isOpen) {
      setValue('')
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
  // dragging the results hides the keyboard so they get the room
  useDismissKeyboardOnDrag(dialogRef, inputRef, isOpen)

  const change = (text: string) => {
    setValue(text)
    setActiveIndex(0)
  }

  const open = (index: number) => {
    const target = results[index]
    if (!target) return
    const path = articleHref(target.slug)
    if (path === location.pathname) onClose()
    else navigate(path)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if (!results.length || keyword !== value.trim()) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      const next = (activeIndex + step + results.length) % results.length
      setActiveIndex(next)
      document
        .getElementById(optionId(results[next].slug))
        ?.scrollIntoView({ block: 'nearest' })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      open(activeIndex)
    }
  }

  if (!isOpen) return null

  const asked = value.trim()
  const waiting = !!asked && (asked !== keyword || (isFetching && !data))
  const nothingToAsk = !!asked && !cleanTerm(asked)
  const active = results[activeIndex]

  return (
    <OverlayStyle onClick={onClose}>
      <ContainerStyle
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Tìm bài viết"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-heading">
          <div>
            <span>FIELD NOTES SEARCH</span>
            <h2>Lục lại sổ tay</h2>
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
            aria-label="Tìm bài viết theo tiêu đề"
            aria-expanded={results.length > 0}
            aria-controls={LIST_ID}
            aria-autocomplete="list"
            aria-activedescendant={active ? optionId(active.slug) : undefined}
            placeholder="Tiêu đề bài viết, ví dụ Pikachu"
            enterKeyHint="go"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => change(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {value && (
            <button
              type="button"
              aria-label="Xóa tìm kiếm"
              onClick={() => {
                change('')
                inputRef.current?.focus()
              }}
            >
              <FieldIcon name="close" size={17} />
            </button>
          )}
        </SearchBarStyle>

        <SearchBodyStyle
          onClickCapture={(event) => {
            // a click on the article already open would change nothing
            const link = (event.target as HTMLElement).closest('a')
            if (link && link.pathname === location.pathname) {
              event.preventDefault()
              onClose()
            }
          }}
        >
          {!BLOG_ENABLED ? (
            <p className="hint" role="status">
              Sổ tay thực địa cần Supabase để tìm bài.
            </p>
          ) : isError && !data ? (
            <div className="search-error" role="alert">
              <p>Chưa tải được kết quả.</p>
              <button type="button" onClick={refetch}>
                Thử lại
              </button>
            </div>
          ) : !asked ? (
            suggestions.length > 0 && (
              <div className="search-suggestions">
                <p>Thử một chủ đề</p>
                {suggestions.map((name) => (
                  <button
                    type="button"
                    key={name}
                    onClick={() => {
                      change(name)
                      inputRef.current?.focus()
                    }}
                  >
                    {name} ↗
                  </button>
                ))}
              </div>
            )
          ) : nothingToAsk ? (
            <SearchNoData keyword={asked} />
          ) : waiting ? (
            <SearchLoading />
          ) : results.length ? (
            <SearchResults
              keyword={cleanTerm(asked)}
              searchResults={results}
              activeIndex={activeIndex}
              listId={LIST_ID}
              onHover={setActiveIndex}
            />
          ) : (
            <SearchNoData keyword={asked} />
          )}
        </SearchBodyStyle>
      </ContainerStyle>
    </OverlayStyle>
  )
}

export default SearchBlogBar
