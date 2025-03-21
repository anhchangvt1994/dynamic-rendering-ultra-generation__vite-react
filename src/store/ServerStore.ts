export interface IEnvironment {
	ENV: 'development' | 'production'
	MODE: 'development' | 'preview' | 'production'
	ENV_MODE: 'development' | 'staging' | 'uat' | 'production'
}

export interface IBotInfo {
	isBot: boolean
	name: string
}

export interface IDeviceInfo {
	type: 'mobile' | 'tablet' | 'desktop'
	isMobile: string | boolean
	os: string
}

export interface ILocaleInfo {
	lang: string
	country: string
	clientLang: string
	clientCountry: string
	defaultLang: string
	defaultCountry: string
	langSelected: string
	countrySelected: string
	hideDefaultLocale: boolean
	range: [number, number]
	region: string
	eu: string
	timezone: string
	city: string
	ll: [number, number]
	metro: number
	area: number
}

export interface IRenderingInfo {
	type: 'CSR' | 'SSR' | 'ISR'
	loader: boolean
}

export let EnvironmentInfo: IEnvironment

export let BotInfo: IBotInfo

export let DeviceInfo: IDeviceInfo

export let LocaleInfo: ILocaleInfo

export let RenderingInfo: IRenderingInfo

export const ServerStore = (() => {
	const urlInfo = new URL(document.URL)
	const params = new URLSearchParams(urlInfo.searchParams)
	const html = document.documentElement

	return {
		init() {
			if (!EnvironmentInfo) {
				EnvironmentInfo = (() => {
					const strInfo =
						params.get('environmentInfo') || getCookie('EnvironmentInfo')

					return strInfo
						? JSON.parse(strInfo)
						: {
								ENV: 'production',
								MODE: 'production',
								ENV_MODE: 'production',
							}
				})()
				deleteCookie('EnvironmentInfo')
			}
			if (!BotInfo) {
				BotInfo = (() => {
					const strInfo = params.get('botInfo') || getCookie('BotInfo')

					return strInfo ? JSON.parse(strInfo) : { isBot: false }
				})()
				deleteCookie('BotInfo')
			}
			if (!DeviceInfo) {
				DeviceInfo = (() => {
					const strInfo = params.get('deviceInfo') || getCookie('DeviceInfo')

					return strInfo ? JSON.parse(strInfo) : {}
				})()
				deleteCookie('DeviceInfo')
			}
			if (!LocaleInfo) {
				LocaleInfo = (() => {
					const strInfo = params.get('localeInfo') || getCookie('LocaleInfo')

					const info = strInfo ? JSON.parse(strInfo) : LocaleInfo || {}

					return info
				})()
				deleteCookie('LocaleInfo')
			}
			if (!RenderingInfo) {
				RenderingInfo = (() => {
					const strInfo =
						params.get('renderingInfo') || getCookie('RenderingInfo')

					return strInfo
						? { loader: false, ...JSON.parse(strInfo) }
						: { type: 'CSR', loader: false }
				})()
				deleteCookie('RenderingInfo')
			}

			if (html) {
				html.setAttribute(
					'lang',
					LocaleInfo.langSelected || LocaleInfo.clientLang
				)
			}
		},
		reInit: {
			LocaleInfo: () => {
				LocaleInfo = (() => {
					const strInfo = params.get('localeInfo') || getCookie('LocaleInfo')

					const info = strInfo ? JSON.parse(strInfo) : LocaleInfo

					return info
				})()

				deleteCookie('LocaleInfo')

				if (html) {
					html.setAttribute(
						'lang',
						LocaleInfo.langSelected || LocaleInfo.clientLang
					)
				}
			},
		},
	}
})()
