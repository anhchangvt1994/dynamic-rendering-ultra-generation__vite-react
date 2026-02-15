import Image from 'components/common/Image'
import { functionGenerator } from 'utils/EnvHelper'
import {
  DescriptionStyle,
  ImageColStyle,
  InfoColStyle,
  NameStyle,
  SearchItemInnerStyle,
  SearchItemStyle,
  SearchListStyle,
} from './styles'
import { generateShortDescription } from './utils'

const SearchResults = (props) => {
  const { keyword = '', searchResults = [] } = props

  const searchResultList = searchResults.map((result) => {
    if (!result) return null

    const title = result.title.replace(keyword, `<span>${keyword}</span>`)
    const description =
      result.content && result.content.length > 0
        ? generateShortDescription(result.content)
        : ''
    const getBlogDetailPath = functionGenerator(
      import.meta.env.ROUTER_BLOG_DETAIL_GET_PATH_FUNCTION
    )

    return (
      <SearchItemStyle key={result.id}>
        <SearchItemInnerStyle to={getBlogDetailPath(result.slug)}>
          <ImageColStyle>
            <Image
              hash={result.coverImage?.blurhash ?? ''}
              src={`${import.meta.env.HOST}${result.coverImage?.url ?? 'null.jpg'}`}
              height={'100%'}
              width={'100%'}
              alt={result.title}
            />
          </ImageColStyle>
          <InfoColStyle>
            <NameStyle
              dangerouslySetInnerHTML={{
                __html: title,
              }}
            />
            <DescriptionStyle>{description}</DescriptionStyle>
          </InfoColStyle>
        </SearchItemInnerStyle>
      </SearchItemStyle>
    )
  })

  return <SearchListStyle>{searchResultList}</SearchListStyle>
}

export default SearchResults
