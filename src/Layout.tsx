import LoadingPageComponent from 'components/LoadingPageComponent'
import { useUserInfo } from 'store/UserInfoContext'
import LoadingBoundary from 'utils/LoadingBoundary'
import { ProxyAPIExample_v1 } from 'utils/ProxyAPIHelper/EndpointGenerator'

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
  const route = useRoute()
  const { userState, setUserState } = useUserInfo()
  const { localeState } = useLocaleInfo()

  const curLocale = useMemo(
    () => getLocale(localeState.lang, localeState.country),
    [localeState.lang, localeState.country]
  )

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

  const [infoState, setInfoState] = useState<string>(
    JSON.stringify(getAPIStore('/products/2'))
  )
  // const [userInfoState, setUserInfoState] = useState<string>(
  //   JSON.stringify(getAPIStore('/products/1'))
  // )

  useEffect(() => {
    fetch(
      ProxyAPIExample_v1.get(
        `?user_content_key=AehSKLiLXgECdCUA37448tMdvrCVPdgY-cTdVoE9_ML-TNJrVqLLokle2z8kRfYhGqLj0Tqfzu04ovsCemAEuCFsg_cxK3D5PcKGPbgaG4xvfFkIZA791I_YTWW-ZqNOgU5JEDAWr1IMQGKYqn1PDX--1nevE0QdfVg2gCxHm2pfWn7izr61S91xsImRX42dxZi1g98Yz5yL4e-E4rXenuqwG1KhtYgahEA-w7H4AII0dF7MwakGAZ16DOKMCxnLea2nTyIGHx2lS5Z9DAvxBavUqGTfyj0xxg&lib=MG9_Wr3TbCamnAlPxYCpvQ5HJ0qIQSE5w`,
        {
          expiredTime: 5000,
          cacheKey: `/products/2`,
          enableStore: true,
          storeInDevice: DeviceInfo.type,
          relativeCacheKey: ['/products/2'],
        }
      ),
      {
        method: 'GET',
        headers: new Headers({
          Accept: 'application/json',
        }),
      }
    ).then(async (res) => {
      const text = await res.text()
      setInfoState(text)
    })

    // fetch(
    //   ProxyAPIExample_v1.get(`/products/2`, {
    //     expiredTime: 5000,
    //     cacheKey: `/products/2`,
    //     enableStore: true,
    //     storeInDevice: DeviceInfo.type,
    //     relativeCacheKey: ['/products/2'],
    //   }),
    //   {
    //     method: 'GET',
    //     headers: new Headers({
    //       Accept: 'application/json',
    //     }),
    //   }
    // ).then(async (res) => {
    //   const text = await res.text()
    //   setInfoState(text)
    // })

    // fetch(
    //   ProxyAPIExample_v1.get(`/products/1`, {
    //     expiredTime: 10000,
    //     renewTime: 10000,
    //     cacheKey: `/products/1`,
    //     enableStore: true,
    //     storeInDevice: DeviceInfo.type,
    //   }),
    //   {
    //     method: 'GET',
    //     headers: new Headers({
    //       Accept: 'application/json',
    //     }),
    //   }
    // ).then(async (res) => {
    //   const text = await res.text()
    //   setUserInfoState(text)
    // })
  }, [])

  return (
    <div className="layout">
      <p style={{ marginBottom: '16px' }}>
        <code>{infoState}</code>
      </p>
      {/* <p>
        <code>{userInfoState}</code>
      </p> */}
      <MainContainer>
        <Header>
          {/* <div>
            <Link
              replace
              style={{ cursor: 'pointer' }}
              to={route.fullPath?.replace(curLocale, 'vi-vn') ?? ''}
            >
              VI
            </Link>
            <span style={{ display: 'inline-block', margin: '0 8px' }}>|</span>
            <Link
              replace
              style={{ cursor: 'pointer' }}
              to={route.fullPath?.replace(curLocale, 'en-us') ?? ''}
            >
              EN
            </Link>
          </div> */}
          {userState && userState.email ? (
            <>
              {userState.email + ' | '}
              <span onClick={onClickLogout} style={{ cursor: 'pointer' }}>
                Logout
              </span>
            </>
          ) : (
            <Link
              style={{ cursor: 'pointer' }}
              to={import.meta.env.ROUTER_LOGIN_PATH}
            >
              Login
            </Link>
          )}
        </Header>
        <LoadingBoundary
          // key={location.pathname}
          delay={150}
          fallback={<LoadingPageComponent />}
        >
          <Outlet />
        </LoadingBoundary>
      </MainContainer>
    </div>
  )
} // App()

export default Layout
