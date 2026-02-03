import { functionGenerator } from 'utils/EnvHelper'
import Image from '../Image'
import {
  BlogCardStyle,
  BodyStyle,
  DescriptionStyle,
  TitleStyle,
} from './styles'
import { generateShortDescription } from './utils'

const BlogCard = (props) => {
  const { coverImage = {}, slug = '', title = '', content = [] } = props
  const getBlogDetailPath = functionGenerator(
    import.meta.env.ROUTER_BLOG_DETAIL_GET_PATH_FUNCTION
  )

  const description =
    content && content.length > 0 ? generateShortDescription(content) : ''

  return (
    <BlogCardStyle to={getBlogDetailPath(slug)}>
      <Image
        hash={coverImage?.blurhash ?? ''}
        src={`${import.meta.env.HOST}${coverImage?.url ?? 'null.jpg'}`}
        height={'100%'}
        width={'100%'}
        alt={title}
      />
      <BodyStyle>
        <TitleStyle>{title}</TitleStyle>
        <DescriptionStyle>{description}</DescriptionStyle>
      </BodyStyle>
    </BlogCardStyle>
  )
}

export default BlogCard
