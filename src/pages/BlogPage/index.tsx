import { useGetPokemonBlogsQuery } from 'app/apis/blog'
import BlogCard from 'components/common/BlogCard'
import BlogCardLoading from 'components/common/BlogCard/loading'
import { BlogPageStyled } from './styles'

const BlogPage = () => {
  const [blogListState, setBlogListState] = useState(
    getAPIStore(import.meta.env.API_ENDPOINT_GET_POKEMON_BLOGS)?.data ?? []
  )
  const { data, isFetching } = useGetPokemonBlogsQuery()
  const [isFirstTimeLoading, setIsFirstTimeLoading] = useState(isFetching)
  const isShowLoading =
    RenderingInfo.loader ||
    (isFetching && (!isFirstTimeLoading || !blogListState))

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
    if (isFirstTimeLoading) setIsFirstTimeLoading(false)
  }, [isFetching])

  return <BlogPageStyled>{blogList}</BlogPageStyled>
}

export default BlogPage
