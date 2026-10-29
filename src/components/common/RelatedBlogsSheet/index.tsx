import { useSearchArticlesByTitleQuery } from 'app/apis/blog'
import { getSearchArticlesByTitlePath } from 'utils/ApiHelper'
import BlogList from './components/BlogList'
import {
  BlogIsland,
  BodyStyle,
  ContainerStyle,
  HeaderStyle,
  OverlayStyle,
} from './styles'

const SEARCH_DELAY = 500

const RelatedBlogsSheet = (props) => {
  const { keyword = '' } = props
  const [isOpen, setIsOpen] = useState(false)

  // NOTE - Search when the keyword stays the same for SEARCH_DELAY (ex: the
  // pokemon slides are changed quickly), the first keyword at once: a search
  // per passed keyword used to hold the browser connections and delay the
  // pokemon API requests
  const [searchKeyword, setSearchKeyword] = useState(keyword)

  useEffect(() => {
    if (keyword === searchKeyword) return
    if (!searchKeyword) return setSearchKeyword(keyword)

    const timeout = setTimeout(() => setSearchKeyword(keyword), SEARCH_DELAY)

    return () => clearTimeout(timeout)
  }, [keyword, searchKeyword])

  const cacheKey = getSearchArticlesByTitlePath(searchKeyword)
  const { data = getAPIStore(cacheKey) } = useSearchArticlesByTitleQuery(
    searchKeyword,
    { skip: !searchKeyword }
  )
  const isDataAvailable = !!data && !!data.data && !!data.data.length

  const open = () => {
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
  }

  const blogListBody = useMemo(() => {
    if (!isDataAvailable) return null

    return <BlogList keyword={searchKeyword} searchResults={data?.data || []} />
  }, [isDataAvailable, searchKeyword, data?.data])

  return (
    isDataAvailable && (
      <>
        <BlogIsland onClick={open} className="blog-island">
          <span className="material-symbols-outlined menu-icon">
            {import.meta.env.ROUTER_BLOGS_ICON}
          </span>
        </BlogIsland>
        <OverlayStyle $isOpen={isOpen} onClick={close}>
          <ContainerStyle $isOpen={isOpen} onClick={(e) => e.stopPropagation()}>
            <HeaderStyle>
              <span className="material-symbols-outlined menu-icon">
                {import.meta.env.ROUTER_BLOGS_ICON}
              </span>
              <h2>Related blogs</h2>
            </HeaderStyle>
            <BodyStyle>{blogListBody}</BodyStyle>
          </ContainerStyle>
        </OverlayStyle>
      </>
    )
  )
}

export default RelatedBlogsSheet
