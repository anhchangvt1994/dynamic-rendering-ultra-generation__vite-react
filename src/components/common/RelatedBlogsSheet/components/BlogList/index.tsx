import Image from 'components/common/Image'
import { functionGenerator } from 'utils/EnvHelper'
import {
  BlogItemInnerStyle,
  BlogItemStyle,
  BlogListStyle,
  DescriptionStyle,
  ImageColStyle,
  InfoColStyle,
  NameStyle,
} from './styles'
import { generateShortDescription } from './utils'

const BlogList = (props) => {
  const { keyword = '', searchResults = [], onScroll } = props

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
      <BlogItemStyle key={result.id}>
        <BlogItemInnerStyle to={getBlogDetailPath(result.slug)}>
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
        </BlogItemInnerStyle>
      </BlogItemStyle>
    )
  })

  return <BlogListStyle onScroll={onScroll}>{searchResultList}</BlogListStyle>
}

export default BlogList
