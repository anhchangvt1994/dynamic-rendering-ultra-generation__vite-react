import { useGetPokemonBlogsQuery } from 'app/apis/blog'
import BlogCard from 'components/common/BlogCard'
import BlogCardLoading from 'components/common/BlogCard/loading'
import { BlogPageStyled } from './styles'

const BlogPage = () => {
  const {
    data = getAPIStore(import.meta.env.API_ENDPOINT_GET_POKEMON_BLOGS),
    isFetching,
  } = useGetPokemonBlogsQuery()
  const isShowLoading = RenderingInfo.loader || (isFetching && !data)

  const blogList = isShowLoading
    ? Array.from({ length: 8 }).map((_, index) => (
        <BlogCardLoading key={index} />
      ))
    : data.data.map((blog) => <BlogCard key={blog.id} {...blog} />)

  return <BlogPageStyled>{blogList}</BlogPageStyled>
}

export default BlogPage
