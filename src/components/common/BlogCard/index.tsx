import { functionGenerator } from 'utils/EnvHelper'
import {
  BlogCardStyle,
  BodyStyle,
  DescriptionStyle,
  ImageWrapperStyle,
  TitleStyle,
} from './styles'

const BlogCard = (props) => {
  const { coverImage = {}, slug = '', title = '', content = [] } = props
  const getBlogDetailPath = functionGenerator(
    import.meta.env.ROUTER_BLOG_DETAIL_GET_PATH_FUNCTION
  )

  return (
    <BlogCardStyle href={getBlogDetailPath(slug)}>
      <ImageWrapperStyle>
        <img
          src={`${import.meta.env.HOST}${coverImage.url}`}
          height={100}
          width={100}
          alt={title}
        />
      </ImageWrapperStyle>
      <BodyStyle>
        <TitleStyle>{title}</TitleStyle>
        <DescriptionStyle>
          {content?.[0]?.['children']?.[0]?.['text'] ?? ''}
        </DescriptionStyle>
      </BodyStyle>
    </BlogCardStyle>
  )
}

export default BlogCard
