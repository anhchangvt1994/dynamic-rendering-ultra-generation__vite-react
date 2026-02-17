import BlogCardLoading from 'components/common/BlogCard/loading'
import Header from 'components/common/Header'
import MenuBar from 'components/common/MenuBar'
import SearchBlogBar from 'components/common/SearchBlogBar'
import SearchPokemonBar from 'components/common/SearchPokemonBar'
import PokemonCardLoading from 'components/home-page/pokemon-card/loading'
import LoadingPageComponent from 'components/LoadingPageComponent'
import BlogDetailLoading from 'pages/BlogDetailPage/loading'
import { BlogDetailPageStyle } from 'pages/BlogDetailPage/styles'
import { BlogPageStyled } from 'pages/BlogPage/styles'
import { HomePageStyle, PokemonListStyle } from 'pages/HomePage/styles'
import React from 'react'
import {
  BodyStyle,
  BodyWrapperStyle,
  ContentStyle,
  MainContainerStyle,
} from 'styles'
import LoadingBoundary from 'utils/LoadingBoundary'

// Memoized Outlet wrapper that only re-renders when route location changes
const OutletWrapper = React.memo(() => {
  const route = useRoute()

  // This useMemo ensures the key changes on location, forcing remount on route change

  const loading = useMemo(() => {
    switch (true) {
      case route.id === import.meta.env.ROUTER_HOME_ID:
        return (
          <HomePageStyle>
            <PokemonListStyle>
              {Array.from({ length: 8 }).map((_, index) => (
                <PokemonCardLoading key={index} />
              ))}
            </PokemonListStyle>
          </HomePageStyle>
        )
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
  }, [route.fullPath])

  return (
    <React.Fragment key={route.id}>
      <LoadingBoundary delay={150} fallback={loading}>
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

  if (BotInfo.isBot) {
    setMetaViewportTag('width=device-width, initial-scale=1')
  } else {
    setMetaViewportTag(
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
    )
  }

  const [isShowMenuBar, setIsShowMenuBar] = useState(false)
  const [isShowSearchBar, setIsShowSearchBar] = useState(false)

  const handleClickMenu = (isShow) => {
    setIsShowMenuBar(isShow)
  }

  const handleClickSearch = (isShow) => {
    setIsShowSearchBar(isShow)
  }

  const onShowMenu = () => handleClickMenu(true)
  const onHideMenu = () => handleClickMenu(false)
  const onShowSearch = () => handleClickSearch(true)
  const onHideSearch = () => handleClickSearch(false)

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
        <Header onClickMenu={onShowMenu} onClickSearch={onShowSearch} />

        <BodyWrapperStyle>
          <BodyStyle>
            <ContentMemo />
          </BodyStyle>
        </BodyWrapperStyle>

        <MenuBar isOpen={isShowMenuBar} onClose={onHideMenu} />
        {searchBarOfPage}
      </MainContainerStyle>
    </div>
  )
}

export default Layout
