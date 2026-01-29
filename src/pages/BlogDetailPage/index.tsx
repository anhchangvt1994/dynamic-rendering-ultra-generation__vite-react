import { useGetPokemonBlogDetailQuery } from 'app/apis/blog'
import { getBlogDetailPath } from 'utils/ApiHelper'
import BlogDetailLoading from './loading'
import { BlogDetailPageStyle, ImageStyle, TitleStyle } from './styles'
import { generateDescription } from './utils'

const BlogDetailPage = () => {
  const route = useRoute()
  const { slug } = route.params
  const { data, isFetching } = useGetPokemonBlogDetailQuery(slug)
  const [blogDetailState, setBlogDetailState] = useState(
    getAPIStore(getBlogDetailPath(slug))?.data?.[0]
  )
  const [isFirstLoading, setIsFirstLoading] = useState(isFetching)
  const isShowLoading =
    RenderingInfo.loader ||
    (isFetching && (!isFirstLoading || !blogDetailState))
  const description = generateDescription(blogDetailState?.content || [])

  useEffect(() => {
    if (data && !isFetching) {
      setBlogDetailState(data?.data?.[0] || null)
    }
  }, [data, isFetching])

  useEffect(() => {
    if (!isFetching) setIsFirstLoading(false)
  }, [isFetching])

  return (
    <BlogDetailPageStyle>
      {isShowLoading ? (
        <BlogDetailLoading />
      ) : (
        <>
          {blogDetailState?.title && (
            <TitleStyle>{blogDetailState.title}</TitleStyle>
          )}

          {blogDetailState?.coverImage?.url && (
            <ImageStyle>
              <img
                src={`${import.meta.env.HOST}${blogDetailState.coverImage.url}`}
                alt={blogDetailState.title}
              />
            </ImageStyle>
          )}

          {description}
        </>
      )}
    </BlogDetailPageStyle>
  )
}

export default BlogDetailPage
