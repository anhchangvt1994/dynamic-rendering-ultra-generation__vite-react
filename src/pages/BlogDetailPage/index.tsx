import { useGetPokemonBlogDetailQuery } from 'app/apis/blog'
import { useNavigateInfo } from 'app/router/context/InfoContext'
import Image from 'components/common/Image'
import { getBlogDetailPath } from 'utils/ApiHelper'
import BlogDetailLoading from './loading'
import {
  BackButtonStyle,
  BackIconStyle,
  BlogDetailPageStyle,
  HeaderStyle,
  TitleStyle,
} from './styles'
import { generateDescription, generateShortDescription } from './utils'

const BlogDetailPage = () => {
  const route = useRoute()
  const navigateInfo = useNavigateInfo()
  const navigate = useNavigate()

  const { slug } = route.params
  const { data = getAPIStore(getBlogDetailPath(slug)), isFetching } =
    useGetPokemonBlogDetailQuery(slug)
  const [blogDetailState, setBlogDetailState] = useState(data?.data ?? {})
  const isShowLoading = RenderingInfo.loader || (isFetching && !data)
  const description = generateDescription(blogDetailState.content || [])
  const imagePath = `${import.meta.env.HOST}${blogDetailState.coverImage?.url ?? ''}`
  const shortDescription = generateShortDescription(
    blogDetailState.content || []
  )

  useEffect(() => {
    if (data && !isFetching) {
      setBlogDetailState(data?.data?.[0] || null)
    }
  }, [data, isFetching])

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

  const handleBack = () => {
    if (!navigateInfo.from)
      return navigate(import.meta.env.ROUTER_BLOGS_GET_PATH)

    navigate(-1)
  } // handleBack

  return (
    <BlogDetailPageStyle>
      <HeaderStyle>
        <BackButtonStyle onClick={handleBack}>
          <BackIconStyle />
        </BackButtonStyle>
      </HeaderStyle>
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
