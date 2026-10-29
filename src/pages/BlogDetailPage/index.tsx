import BattleMessage from 'components/common/BattleMessage'
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
  const {
    data = getAPIStore(getBlogDetailPath(slug)),
    isFetching,
    refetch,
  } = useGetPokemonBlogDetailQuery(slug)
  // The backend can answer with anything; only an article list is usable.
  const articles = Array.isArray(data?.data) ? data.data : null
  const [blogDetailState, setBlogDetailState] = useState(data?.data ?? {})
  const isShowLoading = RenderingInfo.loader || (isFetching && !data)
  const description = generateDescription(blogDetailState?.content || [])
  const imagePath = `${import.meta.env.HOST}${blogDetailState?.coverImage?.url ?? ''}`
  const shortDescription = generateShortDescription(
    blogDetailState?.content || []
  )

  useEffect(() => {
    if (data && !isFetching) {
      setBlogDetailState(articles?.[0] || null)
    }
  }, [articles, data, isFetching])

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
  }, [blogDetailState, imagePath, shortDescription])

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
      ) : !articles ? (
        <BattleMessage
          title="Máy chủ bài viết đã gục ngã!"
          action={{ label: 'Thử lại', onClick: () => refetch() }}
        >
          Không tải được bài viết này. Thử lại sau giây lát.
        </BattleMessage>
      ) : !blogDetailState ? (
        <BattleMessage
          title="Bài viết này đã bỏ chạy!"
          action={{
            label: 'Xem các bài viết',
            to: import.meta.env.ROUTER_BLOGS_GET_PATH,
          }}
        >
          Không tìm thấy bài viết với đường dẫn này. Có thể nó đã được đổi tên
          hoặc gỡ xuống.
        </BattleMessage>
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
