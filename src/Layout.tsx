import ErrorLoadingPageComponent from 'components/ErrorPageComponent'
import LoadingPageComponent from 'components/LoadingPageComponent'
import { useUserInfo } from 'store/UserInfoContext'
import ErrorBoundary from 'utils/ErrorBoundary'
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
		JSON.stringify(getAPIStore('/users'))
	)
	const [userInfoState, setUserInfoState] = useState<string>(
		JSON.stringify(getAPIStore('/users/1'))
	)

	useEffect(() => {
		fetch(
			ProxyAPIExample_v1.get(`/users?test=1&user=2`, {
				expiredTime: 10000,
				cacheKey: `/users`,
				enableStore: true,
				storeInDevice: DeviceInfo.type,
				relativeCacheKey: ['/users/1'],
			}),
			{
				method: 'GET',
				headers: new Headers({
					Accept: 'application/json',
					Author: 'admin',
				}),
				// body: JSON.stringify({ test: 1, user: 2 }),
			}
		).then(async (res) => {
			const text = await res.text()
			setInfoState(text)
		})

		fetch(
			ProxyAPIExample_v1.get(`/users/1`, {
				expiredTime: 10000,
				renewTime: 10000,
				cacheKey: `/users/1`,
				enableStore: true,
				storeInDevice: DeviceInfo.type,
			}),
			{
				method: 'GET',
				headers: new Headers({
					Accept: 'application/json',
					Author: 'admin',
				}),
				// body: JSON.stringify({ test: 1, user: 2 }),
			}
		).then(async (res) => {
			const text = await res.text()
			setUserInfoState(text)
		})
	}, [])

	return (
		<div className="layout">
			<p style={{ marginBottom: '16px' }}>
				<code>{infoState}</code>
			</p>
			<p>
				<code>{userInfoState}</code>
			</p>
			<MainContainer>
				<Header>
					<div>
						<Link
							style={{ cursor: 'pointer' }}
							to={route.fullPath?.replace(curLocale, 'vi-vn') ?? ''}
							replace
						>
							VI
						</Link>
						<span style={{ display: 'inline-block', margin: '0 8px' }}>|</span>
						<Link
							style={{ cursor: 'pointer' }}
							to={route.fullPath?.replace(curLocale, 'en-us') ?? ''}
							replace
						>
							EN
						</Link>
					</div>
					{userState && userState.email ? (
						<>
							{userState.email + ' | '}
							<span style={{ cursor: 'pointer' }} onClick={onClickLogout}>
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
				<ErrorBoundary fallback={<ErrorLoadingPageComponent />}>
					<LoadingBoundary
						// key={location.pathname}
						delay={150}
						fallback={<LoadingPageComponent />}
					>
						<Outlet />
					</LoadingBoundary>
				</ErrorBoundary>
			</MainContainer>
		</div>
	)
} // App()

export default Layout
