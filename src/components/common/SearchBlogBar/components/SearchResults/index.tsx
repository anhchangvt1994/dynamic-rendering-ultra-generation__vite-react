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

const SearchResults = ({
  keyword = '',
  searchResults = [],
  onScroll,
}: {
  keyword?: string
  searchResults?: ArticleHit[]
  onScroll?: () => void
}) => (
  <SearchListStyle onScroll={onScroll}>
    {searchResults.map((result) => (
      <SearchItemStyle key={result.slug}>
        <SearchItemInnerStyle to={articleHref(result.slug)}>
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
