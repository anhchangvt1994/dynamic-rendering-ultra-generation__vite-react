import BackToTop from 'components/common/BackToTop'
import BlogCardLoading from 'components/common/BlogCard/loading'
import Header from 'components/common/Header'
import MenuBar from 'components/common/MenuBar'
import SearchBlogBar from 'components/common/SearchBlogBar'
import SearchPokemonBar from 'components/common/SearchPokemonBar'
import PageSkeleton, { HeaderSkeleton } from 'components/PageSkeleton'
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
import { preloadPath, preloadWhenIdle } from 'app/router/routeModules'

// Memoized Outlet wrapper that only re-renders when route location changes
const OutletWrapper = React.memo(() => {
  const route = useRoute()
  const location = useLocation()

  // NOTE - The page is mounted again on every navigation, except a navigation
  // that only updates the url of the page (state.keepPage, ex: the pokemon
  // slides): it used to destroy the page and reset its state on every slide
  const pageKeyRef = useRef(location.key)
  if (!location.state?.keepPage) pageKeyRef.current = location.key

  // NOTE - The deepest match names the page: route.id stays the layout's
  // ("0") on the index route
  const matches = useMatches()
  const pageId = matches[matches.length - 1]?.id ?? route.id

  const loading = useMemo(() => {
    switch (true) {
      case pageId === import.meta.env.ROUTER_BLOG_DETAIL_ID:
        return (
          <BlogDetailPageStyle>
            <BlogDetailLoading />
          </BlogDetailPageStyle>
        )
      case pageId === import.meta.env.ROUTER_BLOGS_ID:
        return (
          <BlogPageStyled>
            {Array.from({ length: 8 }).map((_, index) => (
              <BlogCardLoading key={index} />
            ))}
          </BlogPageStyled>
        )
      default:
        return <PageSkeleton routeId={pageId} />
    }
  }, [pageId])

  // NOTE - The ISR loader snapshot (RenderingInfo.loader) is the page's
  // skeleton only: no page code, no data requests
  if (RenderingInfo.loader) return loading

  // NOTE - The skeleton shows at once, never after a delay: by the time the
  // next page suspends the previous one is already gone, so a delay only
  // shows a blank page (and on a busy phone its timer fires late)

  return (
    <React.Fragment key={route.id}>
      <LoadingBoundary
        delay={0}
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

  // NOTE - Fetch the next page's code before it is needed: the page behind a
  // link as soon as it is pointed at, touched or focused, and the main pages
  // once the browser is idle. Not for crawlers (bots, ISR snapshots,
  // automation): they never navigate.
  useEffect(() => {
    if (BotInfo.isBot || RenderingInfo.loader || navigator.webdriver) return
    const onIntent = (event: Event) => {
      const link = (event.target as Element | null)?.closest?.('a[href]')
      if (!(link instanceof HTMLAnchorElement)) return
      if (link.origin === location.origin) preloadPath(link.pathname)
    }
    const events = ['pointerover', 'touchstart', 'focusin'] as const
    events.forEach((name) =>
      document.addEventListener(name, onIntent, { passive: true })
    )
    preloadWhenIdle()
    return () =>
      events.forEach((name) => document.removeEventListener(name, onIntent))
  }, [])

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
          {RenderingInfo.loader ? (
            <HeaderSkeleton />
          ) : (
            <Header
              onClickMenu={onShowMenu}
              onClickSearch={onShowSearch}
              isMenuOpen={isShowMenuBar}
              isSearchOpen={isShowSearchBar}
            />
          )}
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
