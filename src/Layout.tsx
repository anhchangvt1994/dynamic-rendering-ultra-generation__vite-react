import Header from 'components/common/Header'
import MenuBar from 'components/common/MenuBar'
import SearchBar from 'components/common/SearchBar'
import LoadingPageComponent from 'components/LoadingPageComponent'
import React from 'react'
import { BodyStyle, ContentStyle, MainContainerStyle } from 'styles'
import LoadingBoundary from 'utils/LoadingBoundary'

// Memoized Outlet wrapper that only re-renders when route location changes
const OutletWrapper = React.memo(() => {
  const route = useRoute()

  // This useMemo ensures the key changes on location, forcing remount on route change

  return (
    <React.Fragment key={route.id}>
      <LoadingBoundary delay={150} fallback={<LoadingPageComponent />}>
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

  return (
    <div className="layout">
      <MainContainerStyle
        className={`${RenderingInfo.loader ? 'lazy-load' : 'full-load'}`}
      >
        <Header onClickMenu={onShowMenu} onClickSearch={onShowSearch} />

        <BodyStyle>
          <ContentMemo />
        </BodyStyle>

        <MenuBar isOpen={isShowMenuBar} onClose={onHideMenu} />
        <SearchBar isOpen={isShowSearchBar} onClose={onHideSearch} />
      </MainContainerStyle>
    </div>
  )
}

export default Layout
