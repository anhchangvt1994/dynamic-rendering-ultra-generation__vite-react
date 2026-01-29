import {
  BlogDetailPageStyle,
  DesciptionLoadingStyle,
  ImageLoadingStyle,
  TitleLoadingStyle,
} from './styles'

const BlogDetailLoading = () => {
  return (
    <BlogDetailPageStyle>
      <TitleLoadingStyle />
      <ImageLoadingStyle />
      <>
        <DesciptionLoadingStyle />
        <DesciptionLoadingStyle />
        <DesciptionLoadingStyle />
        <DesciptionLoadingStyle />
        <DesciptionLoadingStyle />
      </>
    </BlogDetailPageStyle>
  )
}

export default BlogDetailLoading
