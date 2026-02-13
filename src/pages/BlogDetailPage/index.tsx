import { useGetPokemonBlogDetailQuery } from 'app/apis/blog'
import Image from 'components/common/Image'
import { getBlogDetailPath } from 'utils/ApiHelper'
import BlogDetailLoading from './loading'
import { BlogDetailPageStyle, TitleStyle } from './styles'
import { generateDescription, generateShortDescription } from './utils'

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
  const imagePath = `${import.meta.env.HOST}${blogDetailState?.coverImage?.url ?? ''}`
  const shortDescription = generateShortDescription(
    blogDetailState?.content || []
  )

  useEffect(() => {
    if (data && !isFetching) {
      setBlogDetailState(data?.data?.[0] || null)
    }
  }, [data, isFetching])

  useEffect(() => {
    if (!isFetching) setIsFirstLoading(false)
  }, [isFetching])

  useEffect(() => {
    if (blogDetailState) {
      setSeoTag({
        title: blogDetailState.title || 'Pokemon',
        'og:type': 'website',
        'og:title': blogDetailState.title || 'Pokemon',
        'twitter:title': blogDetailState.title || 'Pokemon',
        'og:description': shortDescription,
        description: shortDescription,
        'twitter:description': shortDescription,
        'og:url': window.location.pathname,
        'og:site_name': `Pokemon ${blogDetailState.name || ''}`,
        'og:image': imagePath,
        'twitter:image': imagePath,
        'og:image:width': '1200',
        'og:image:height': '628',
        robots: 'index, follow',
      })
    }
  }, [JSON.stringify(blogDetailState), shortDescription])

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
            <Image
              hash={blogDetailState.coverImage.blurhash || ''}
              src={`${import.meta.env.HOST}${blogDetailState.coverImage.url}`}
              alt={blogDetailState.title}
            />
          )}

          {description}
        </>
      )}
    </BlogDetailPageStyle>
  )
}

export default BlogDetailPage
