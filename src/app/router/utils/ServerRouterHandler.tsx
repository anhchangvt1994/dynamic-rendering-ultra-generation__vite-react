// import LoadingPageComponent from 'components/LoadingPageComponent'
import { ReactElement } from 'react'
import { ServerStore } from 'store/ServerStore'
import { resetSeoTag } from 'utils/SeoHelper'
// import {
// 	INIT_LOADING_INFO,
// 	useLoadingInfo,
// } from '../context/LoadingInfoContext'

interface IFetchOnRouteResponse {
	originPath: string
	path: string
	search: string | undefined
	status: number
}

const fetchOnRoute = (() => {
	let controller

	return async (
		path: string,
		init?: RequestInit | undefined
	): Promise<undefined | IFetchOnRouteResponse> => {
		if (!path) return

		// controller?.abort('reject')
		controller = new AbortController()

		const data = await new Promise(async (res) => {
			const response = await fetch(path, {
				...init,
				signal: controller.signal,
			})
				.then((res) => res.text())
				.catch((err) => {
					console.error(err)
					throw err
				})

			res(/^{(.|[\r\n])*?}$/.test(response) ? JSON.parse(response) : {})
		})

		return data as IFetchOnRouteResponse
	}
})() // fetchOnRoute

const SUCCESS_CODE_LIST = [200]
const REDIRECT_CODE_LIST = [301, 302]
const ERROR_CODE_LIST = [404, 500, 502, 504]

let prevPath = ''
const validPathListCached = new Map<
	string,
	{
		status: number
		path: string
	}
>()

export default function ServerRouterHandler({ children }) {
	const location = useLocation()
	const { locale } = useParams()
	// const { loadingState, setLoadingState } = useLoadingInfo()
	const { setLocaleState } = useLocaleInfo()
	const [element, setElement] = useState<ReactElement>()
	const enableLocale = useMemo(
		() => Boolean(LocaleInfo.langSelected || LocaleInfo.countrySelected),
		[]
	)

	useLayoutEffect(() => {
		// console.log('start router pre handle')
		const curLocale = getLocale(
			LocaleInfo.langSelected,
			LocaleInfo.countrySelected
		)

		const validPathInfo = (() => {
			let tmpValidPathInfo

			tmpValidPathInfo = validPathListCached.get(location.pathname)

			if (tmpValidPathInfo) return tmpValidPathInfo
			tmpValidPathInfo = validPathListCached.get(
				location.pathname.replace(new RegExp(`^(\/|)${locale}`), '') || '/'
			)

			return tmpValidPathInfo
		})()

		if (!BotInfo.isBot && !validPathInfo) {
			// setLoadingState({
			// 	isShow: true,
			// 	element: <LoadingPageComponent />,
			// })
			// console.log('fetch')
			const fullPath = `${location.pathname}${
				location.search
					? location.search + '&key=' + Date.now()
					: '?key=' + Date.now()
			}`

			fetchOnRoute(fullPath, {
				method: 'GET',
				headers: new Headers({
					Accept: 'application/json',
				}),
			}).then((res) => {
				// setLoadingState(INIT_LOADING_INFO)
				// NOTE - Handle pre-render for bot with locale options turned on

				if (enableLocale) {
					ServerStore.reInit.LocaleInfo()

					setLocaleState({
						lang: LocaleInfo.langSelected,
						country: LocaleInfo.countrySelected,
					})
				}

				if (res) {
					const curLocale = getLocale(
						LocaleInfo.langSelected,
						LocaleInfo.countrySelected
					)
					if (
						REDIRECT_CODE_LIST.includes(res.status) ||
						(SUCCESS_CODE_LIST.includes(res.status) && locale === curLocale)
					) {
						if (
							!(location.search && res.search) ||
							location.search === res.search
						) {
							validPathListCached.set(
								res.originPath?.replace(new RegExp(`^(\/|)${curLocale}`), '') ||
									'/',
								{
									status: SUCCESS_CODE_LIST.includes(res.status)
										? 301
										: res.status,
									path:
										res.path?.replace(new RegExp(`^(\/|)${curLocale}`), '') ||
										'/',
								}
							)
						}

						if (REDIRECT_CODE_LIST.includes(res.status))
							setElement(
								<Navigate to={(res.path + res.search) as string} replace />
							)
						else setElement(children)
					} else {
						const tmpPath =
							location.pathname.replace(`/${curLocale}`, '') || '/'
						validPathListCached.set(tmpPath, {
							status: res.status,
							path: tmpPath,
						})

						resetSeoTag()
						setElement(children)
					}
				} else {
					resetSeoTag()
					setElement(children)
				}

				// setLoadingState(INIT_LOADING_INFO)
			})
		} else if (
			enableLocale &&
			validPathInfo &&
			locale !== curLocale &&
			location.pathname.replace(
				new RegExp(`^(\/|)${locale}|\/{0,}$`, 'g'),
				''
			) === prevPath.replace(new RegExp(`^(\/|)${curLocale}|\/{0,}$`, 'g'), '')
		) {
			const arrLocale = location.pathname.split('/')[1]?.split('-')

			if (arrLocale?.length) {
				const cookies = getCookie('LocaleInfo')
				if (LocaleInfo.defaultLang) setCookie('lang', arrLocale[0])
				if (LocaleInfo.defaultCountry)
					setCookie(
						'country',
						LocaleInfo.defaultLang ? arrLocale[1] : arrLocale[0]
					)

				const objCookies = cookies ? JSON.parse(cookies) : LocaleInfo
				objCookies.langSelected = getCookie('lang')
				objCookies.countrySelected = getCookie('country')
				setCookie('LocaleInfo', JSON.stringify(objCookies))

				ServerStore.reInit.LocaleInfo()

				setLocaleState({
					lang: LocaleInfo.langSelected,
					country: LocaleInfo.countrySelected,
				})
			}

			setElement(children)
		} else if (
			enableLocale &&
			validPathInfo &&
			validPathInfo.status !== 200 &&
			(!location.pathname.startsWith(`/${curLocale}`) ||
				location.pathname.replace(`/${curLocale}`, '') === '/' ||
				(location.pathname.replace(`/${curLocale}`, '') || '/') !==
					validPathInfo.path)
		) {
			// console.log('change local with cache')

			setElement(
				<Navigate
					to={
						`/${curLocale}${
							validPathInfo.path === '/' ? '' : validPathInfo.path
						}${location.search}` as string
					}
					replace
				/>
			)
		} else {
			resetSeoTag()
			setElement(children)
		}

		prevPath = location.pathname
	}, [location.pathname])

	// return (loadingState.isShow && loadingState.element) || element
	return element
}
