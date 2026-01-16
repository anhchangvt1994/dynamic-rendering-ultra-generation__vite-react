import Header from 'components/common/header'
import LoadingPageComponent from 'components/LoadingPageComponent'
import { BodyStyle, ContentStyle, MainContainerStyle } from 'styles'
import LoadingBoundary from 'utils/LoadingBoundary'

function Layout() {
  if (BotInfo.isBot) {
    setMetaViewportTag('width=device-width, initial-scale=1')
  } else {
    setMetaViewportTag(
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
    )
  }

  return (
    <div className="layout">
      <MainContainerStyle
        className={`${RenderingInfo.loader ? 'lazy-load' : 'full-load'}`}
      >
        <Header />

        <BodyStyle>
          <ContentStyle>
            <LoadingBoundary delay={150} fallback={<LoadingPageComponent />}>
              <Outlet />
            </LoadingBoundary>
          </ContentStyle>
        </BodyStyle>
      </MainContainerStyle>
    </div>
  )
} // App()

export default Layout
