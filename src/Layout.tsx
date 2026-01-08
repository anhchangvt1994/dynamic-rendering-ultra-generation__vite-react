import LoadingPageComponent from 'components/LoadingPageComponent'
import { Outlet } from 'react-router'
import { Header, MainContainer } from 'styles'
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
      <MainContainer>
        <Header></Header>

        <LoadingBoundary delay={150} fallback={<LoadingPageComponent />}>
          <Outlet />
        </LoadingBoundary>
      </MainContainer>
    </div>
  )
} // App()

export default Layout
