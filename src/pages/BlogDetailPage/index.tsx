import { useGetPokemonBlogDetailQuery } from 'app/apis/blog'
import { functionGenerator } from 'utils/EnvHelper'
import { BlogDetailPageStyle } from './styles'

const BlogDetailPage = () => {
  const route = useRoute()
  const { slug } = route.params
  const getPokemonBlogDetailPath = functionGenerator(
    import.meta.env.API_PATH_GET_POKEMON_BLOG_DETAIL_FUNCTION
  )
  const { data, isFetching } = useGetPokemonBlogDetailQuery(slug)
  const [blogDetailState, setBlogDetailState] = useState(
    getAPIStore(getPokemonBlogDetailPath(slug))?.data?.[0]
  )
  const [isFirstLoading, setIsFirstLoading] = useState(isFetching)
  const isShowLoading =
    RenderingInfo.loader ||
    (isFetching && (!isFirstLoading || !blogDetailState))

  useEffect(() => {
    if (data && !isFetching) {
      setBlogDetailState(data?.data?.[0] || null)
    }
  }, [data, isFetching])

  useEffect(() => {
    if (!isFetching) setIsFirstLoading(false)
  }, [isFetching])

  return (
    <BlogDetailPageStyle>{JSON.stringify(blogDetailState)}</BlogDetailPageStyle>
  )
}

export default BlogDetailPage
