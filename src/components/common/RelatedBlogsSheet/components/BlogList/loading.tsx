import {
  BlogItemInnerLoadingStyle,
  BlogItemStyle,
  BlogListStyle,
  DescriptionLoadingStyle,
  ImageColStyle,
  ImageLoadingStyle,
  InfoColStyle,
  NameLoadingStyle,
} from './styles'

const BlogListLoading = () => {
  const loadingList = Array.from({ length: 4 }).map((_, index) => (
    <BlogItemStyle key={index}>
      <BlogItemInnerLoadingStyle>
        <ImageColStyle>
          <ImageLoadingStyle />
        </ImageColStyle>
        <InfoColStyle>
          <NameLoadingStyle />
          <DescriptionLoadingStyle />
          <DescriptionLoadingStyle style={{ width: '70%' }} />
        </InfoColStyle>
      </BlogItemInnerLoadingStyle>
    </BlogItemStyle>
  ))

  return <BlogListStyle>{loadingList}</BlogListStyle>
}

export default BlogListLoading
