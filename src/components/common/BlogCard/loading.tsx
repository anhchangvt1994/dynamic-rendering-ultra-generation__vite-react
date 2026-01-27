import {
  BlogCardStyle,
  BodyStyle,
  DescriptionLoadingStyle,
  ImageWrapperLoadingStyle,
  TitleLoadingStyle,
} from './styles'

const BlogCardLoading = () => {
  return (
    <BlogCardStyle>
      <ImageWrapperLoadingStyle />
      <BodyStyle>
        <TitleLoadingStyle />
        <DescriptionLoadingStyle />
        <DescriptionLoadingStyle />
        <DescriptionLoadingStyle />
      </BodyStyle>
    </BlogCardStyle>
  )
}

export default BlogCardLoading
