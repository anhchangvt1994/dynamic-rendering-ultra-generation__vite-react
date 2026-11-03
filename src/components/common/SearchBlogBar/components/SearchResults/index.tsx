import type { CSSProperties } from 'react'
import type { ArticleHit } from 'app/apis/blog'
import { articleHref } from 'pages/BlogPage/href'
import { splitHit } from 'pages/BlogPage/text.mjs'
import {
  DescriptionStyle,
  ImageColStyle,
  InfoColStyle,
  NameStyle,
  SearchItemInnerStyle,
  SearchItemStyle,
  SearchListStyle,
} from './styles'

export const optionId = (slug: string) => `blog-search-option-${slug}`

const SearchResults = ({
  keyword = '',
  searchResults = [],
  activeIndex,
  listId,
  onHover,
}: {
  keyword?: string
  searchResults?: ArticleHit[]
  activeIndex: number
  listId: string
  onHover: (index: number) => void
}) => (
  // focus stays in the combobox input; arrows drive the selection
  <SearchListStyle
    id={listId}
    role="listbox"
    aria-label="Kết quả tìm bài viết"
    tabIndex={-1}
  >
    {searchResults.map((result, index) => (
      <SearchItemStyle
        key={result.slug}
        id={optionId(result.slug)}
        role="option"
        aria-selected={index === activeIndex}
        onMouseEnter={() => onHover(index)}
      >
        <SearchItemInnerStyle to={articleHref(result.slug)} tabIndex={-1}>
          <ImageColStyle
            style={{ '--cover': result.cover_color } as CSSProperties}
          >
            {result.cover_url && (
              <img src={result.cover_url} alt="" loading="lazy" />
            )}
          </ImageColStyle>
          <InfoColStyle>
            {/* the hit is a <mark>, never an HTML string */}
            <NameStyle>
              {splitHit(result.title, keyword).map((part, i) =>
                part.hit ? <mark key={i}>{part.text}</mark> : part.text
              )}
            </NameStyle>
            <DescriptionStyle>{result.excerpt}</DescriptionStyle>
          </InfoColStyle>
        </SearchItemInnerStyle>
      </SearchItemStyle>
    ))}
  </SearchListStyle>
)

export default SearchResults
