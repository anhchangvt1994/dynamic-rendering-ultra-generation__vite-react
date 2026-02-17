import { useSearchArticlesByTitleQuery } from 'app/apis/blog'
import BlogList from './components/BlogList'
import {
  BlogIsland,
  BodyStyle,
  ContainerStyle,
  HeaderStyle,
  OverlayStyle,
} from './styles'

const RelatedBlogsSheet = (props) => {
  const { keyword = '' } = props
  const [isOpen, setIsOpen] = useState(false)

  const { data } = useSearchArticlesByTitleQuery(keyword)
  const isDataAvailable = !!data && !!data.data && !!data.data.length

  const open = () => {
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
  }

  const blogListBody = useMemo(() => {
    if (!isDataAvailable) return null

    return <BlogList keyword={keyword} searchResults={data.data || []} />
  }, [JSON.stringify(data)])

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
