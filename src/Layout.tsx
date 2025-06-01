import LoadingPageComponent from 'components/LoadingPageComponent'
import { useUserInfo } from 'store/UserInfoContext'
import LoadingBoundary from 'utils/LoadingBoundary'

const MainContainer = styled.div`
  max-width: 1280px;
  min-width: 0;
  min-height: 100vh;
  overflow: hidden;
  padding: 16px;
  margin: 0 auto;
`

const Header = styled.header`
  padding: 16px;
  text-align: right;
`

function Layout() {
  const { userState, setUserState } = useUserInfo()

  if (BotInfo.isBot) {
    setMetaViewportTag('width=device-width, initial-scale=1')
  } else {
    setMetaViewportTag(
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
    )
  }

  const onClickLogout = () => {
    setUserState({ email: '' })
  }

  return (
    <div className="layout">
      <MainContainer>
        <Header>
          {userState && userState.email ? (
            <>
              {userState.email + ' | '}
              <span onClick={onClickLogout} style={{ cursor: 'pointer' }}>
                Logout
              </span>
            </>
          ) : (
            <LinkCustom
              style={{ cursor: 'pointer' }}
              to={import.meta.env.ROUTER_LOGIN_PATH}
            >
              Login
            </LinkCustom>
          )}
        </Header>
        <LoadingBoundary delay={150} fallback={<LoadingPageComponent />}>
          <Outlet />
        </LoadingBoundary>
      </MainContainer>
    </div>
  )
} // App()

export default Layout
