import { useGetPokemonBlogsQuery } from 'app/apis/blog'
import BlogCard from 'components/common/BlogCard'
import BlogCardLoading from 'components/common/BlogCard/loading'
import { BlogPageStyled } from './styles'

const BlogPage = () => {
  const [blogListState, setBlogListState] = useState(
    getAPIStore(import.meta.env.API_ENDPOINT_GET_POKEMON_BLOGS)
  )
  const { data, isFetching } = useGetPokemonBlogsQuery()
  const [isLoading, setIsLoading] = useState(isFetching)
  const isShowLoading = RenderingInfo.loader || isLoading

  const blogList = isShowLoading
    ? Array.from({ length: 8 }).map((_, index) => (
        <BlogCardLoading key={index} />
      ))
    : blogListState.map((blog) => <BlogCard key={blog.id} {...blog} />)

  useEffect(() => {
    if (data?.data) {
      setBlogListState(data.data)
    }
  }, [JSON.stringify(data)])

  useEffect(() => {
    setIsLoading(isFetching)
  }, [isFetching])

  return <BlogPageStyled>{blogList}</BlogPageStyled>
}

export default BlogPage
