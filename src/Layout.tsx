import BackToTop from 'components/common/BackToTop'
import BlogCardLoading from 'components/common/BlogCard/loading'
import Header from 'components/common/Header'
import MenuBar from 'components/common/MenuBar'
import SearchBlogBar from 'components/common/SearchBlogBar'
import SearchPokemonBar from 'components/common/SearchPokemonBar'
import LoadingPageComponent from 'components/LoadingPageComponent'
import BlogDetailLoading from 'pages/BlogDetailPage/loading'
import { BlogDetailPageStyle } from 'pages/BlogDetailPage/styles'
import { BlogPageStyled } from 'pages/BlogPage/styles'
import React from 'react'
import {
  BodyStyle,
  BodyWrapperStyle,
  ContentStyle,
  MainContainerStyle,
} from 'styles'
import LoadingBoundary from 'utils/LoadingBoundary'
import useScrollRestoration from 'hooks/useScrollRestoration'

// Memoized Outlet wrapper that only re-renders when route location changes
const OutletWrapper = React.memo(() => {
  const route = useRoute()
  const location = useLocation()

  // NOTE - The page is mounted again on every navigation, except a navigation
  // that only updates the url of the page (state.keepPage, ex: the pokemon
  // slides): it used to destroy the page and reset its state on every slide
  const pageKeyRef = useRef(location.key)
  if (!location.state?.keepPage) pageKeyRef.current = location.key

  // This useMemo ensures the key changes on location, forcing remount on route change

  const loading = useMemo(() => {
    switch (true) {
      case route.id === import.meta.env.ROUTER_HOME_ID:
        return <LoadingPageComponent />
      case route.id === import.meta.env.ROUTER_BLOG_DETAIL_ID:
        return (
          <BlogDetailPageStyle>
            <BlogDetailLoading />
          </BlogDetailPageStyle>
        )
      case route.id === import.meta.env.ROUTER_BLOGS_ID:
        return (
          <BlogPageStyled>
            {Array.from({ length: 8 }).map((_, index) => (
              <BlogCardLoading key={index} />
            ))}
          </BlogPageStyled>
        )
      default:
        return <LoadingPageComponent />
    }
  }, [route.id])

  return (
    <React.Fragment key={route.id}>
      <LoadingBoundary
        delay={150}
        fallback={loading}
        resetKey={pageKeyRef.current}
      >
        <Outlet />
      </LoadingBoundary>
    </React.Fragment>
  )
})

// Wrapper component to prevent Outlet re-renders on state changes
function ContentWithOutlet() {
  return (
    <ContentStyle>
      <OutletWrapper />
    </ContentStyle>
  )
}

const ContentMemo = React.memo(ContentWithOutlet)

function Layout() {
  const route = useRoute()

  // Pinch-zoom stays available to everyone (WCAG 1.4.4); the carousel keeps
  // its own gestures through touch-action: pan-y.
  setMetaViewportTag('width=device-width, initial-scale=1')

  // the page scrolls inside BodyStyle, not the window
  const scrollerRef = useRef<HTMLDivElement>(null)
  useScrollRestoration(scrollerRef)

  const [isShowMenuBar, setIsShowMenuBar] = useState(false)
  const [isShowSearchBar, setIsShowSearchBar] = useState(false)

  const handleClickMenu = (isShow) => {
    setIsShowMenuBar(isShow)
  }

  const handleClickSearch = (isShow) => {
    setIsShowSearchBar(isShow)
  }

  const onShowMenu = () => handleClickMenu(true)
  const onHideMenu = useCallback(() => setIsShowMenuBar(false), [])
  const onShowSearch = () => handleClickSearch(true)
  const onHideSearch = useCallback(() => setIsShowSearchBar(false), [])

  const searchBarOfPage = (() => {
    switch (true) {
      case route.id === import.meta.env.ROUTER_HOME_ID:
        return (
          <SearchPokemonBar isOpen={isShowSearchBar} onClose={onHideSearch} />
        )
      case route.id === import.meta.env.ROUTER_POKEMON_ID:
        return (
          <SearchPokemonBar isOpen={isShowSearchBar} onClose={onHideSearch} />
        )
      case route.id === import.meta.env.ROUTER_BLOGS_ID:
        return <SearchBlogBar isOpen={isShowSearchBar} onClose={onHideSearch} />
      case route.id === import.meta.env.ROUTER_BLOG_DETAIL_ID:
        return <SearchBlogBar isOpen={isShowSearchBar} onClose={onHideSearch} />
      default:
        return (
          <SearchPokemonBar isOpen={isShowSearchBar} onClose={onHideSearch} />
        )
    }
  })()

  return (
    <div className="layout">
      <MainContainerStyle
        className={`${RenderingInfo.loader ? 'lazy-load' : 'full-load'}`}
      >
        <div inert={isShowMenuBar || isShowSearchBar}>
          <Header
            onClickMenu={onShowMenu}
            onClickSearch={onShowSearch}
            isMenuOpen={isShowMenuBar}
            isSearchOpen={isShowSearchBar}
          />
        </div>

        <BodyWrapperStyle inert={isShowMenuBar || isShowSearchBar}>
          <BodyStyle ref={scrollerRef}>
            <ContentMemo />
          </BodyStyle>
          <BackToTop scrollerRef={scrollerRef} />
        </BodyWrapperStyle>

        <MenuBar isOpen={isShowMenuBar} onClose={onHideMenu} />
        {searchBarOfPage}
        <div id="related-blogs-sheet" />
      </MainContainerStyle>
    </div>
  )
}

export default Layout
