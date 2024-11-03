'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
var _InitEnv = require('../InitEnv')
var _constants = require('./constants')

const defineServerConfig = (options) => {
	const serverConfig = { ...options }

	for (const key in _constants.defaultServerConfig) {
		if (key === 'locale') {
			if (serverConfig[key]) {
				const defaultOption = _constants.defaultServerConfig[key]

				serverConfig[key] = {
					...defaultOption,
					...serverConfig[key],
				}

				const serverLocaleConfigShorten = {
					enable: serverConfig[key].enable,
					defaultLang: serverConfig[key].defaultLang,
					defaultCountry: serverConfig[key].defaultCountry,
					hideDefaultLocale: serverConfig[key].hideDefaultLocale,
				}

				for (const localeRouteKey in serverConfig[key].routes) {
					if (serverConfig[key].routes[localeRouteKey]) {
						serverConfig[key].routes[localeRouteKey] = {
							...serverLocaleConfigShorten,
							...serverConfig[key].routes[localeRouteKey],
						}
					}
				}

				if (serverConfig[key].custom) {
					const customFunc = serverConfig[key].custom
					serverConfig[key].custom = (url) => {
						if (!url) return

						const tmpConfig = customFunc(url)

						const urlInfo = new URL(url)

						const defaultOptionOfCustom =
							serverConfig[key].routes[urlInfo.pathname] ||
							serverLocaleConfigShorten

						return {
							...defaultOptionOfCustom,
							...tmpConfig,
						}
					}
				}
			} else serverConfig[key] = _constants.defaultServerConfig[key]
		} // locale

		if (key === 'crawl') {
			if (options[key]) {
				const defaultOption = _constants.defaultServerConfig[key]

				serverConfig[key].cache = {
					...defaultOption.cache,
					...serverConfig[key].cache,
				}

				serverConfig[key] = {
					...defaultOption,
					...serverConfig[key],
				}

				const serverCrawlConfigShorten = {
					enable: serverConfig[key].enable,
					speed: serverConfig[key].speed,
					content: serverConfig[key].content,
					optimize: serverConfig[key].optimize,
					compress: serverConfig[key].compress,
					cache: serverConfig[key].cache,
				}

				for (const crawlRouteKey in serverConfig[key].routes) {
					if (serverConfig[key].routes[crawlRouteKey]) {
						serverConfig[key].routes[crawlRouteKey].cache = {
							...serverCrawlConfigShorten.cache,
							...serverConfig[key].routes[crawlRouteKey].cache,
						}
						serverConfig[key].routes[crawlRouteKey] = {
							...serverCrawlConfigShorten,
							...serverConfig[key].routes[crawlRouteKey],
						}
					}
				}

				if (serverConfig[key].custom) {
					const customFunc = serverConfig[key].custom
					serverConfig[key].custom = (url) => {
						if (!url) return

						const tmpConfig = customFunc(url) || {}

						const urlInfo = new URL(url)

						const defaultOptionOfCustom =
							serverConfig[key].routes[urlInfo.pathname] ||
							serverCrawlConfigShorten

						return {
							...defaultOptionOfCustom,
							...tmpConfig,
						}
					}
				}
			} else serverConfig[key] = _constants.defaultServerConfig[key]
		} // crawl

		if (key === 'api') {
			if (options[key]) {
				const defaultOption = _constants.defaultServerConfig[key]
				serverConfig[key].list = {
					...defaultOption.list,
					...serverConfig[key].list,
				}

				for (const apiListKey in serverConfig[key].list) {
					if (typeof serverConfig[key].list[apiListKey] === 'string') {
						serverConfig[key].list[apiListKey] = {
							secretKey: serverConfig[key].list[apiListKey],
							headerSecretKeyName: 'Authorization',
						}

						continue
					}

					if (!serverConfig[key].list[apiListKey].headerSecretKeyName) {
						serverConfig[key].list[apiListKey].headerSecretKeyName =
							'Authorization'
					}
				}
			} else serverConfig[key] = _constants.defaultServerConfig[key]
		} // api
	}

	serverConfig.isRemoteCrawler =
		_InitEnv.PROCESS_ENV.IS_REMOTE_CRAWLER === undefined
			? serverConfig.isRemoteCrawler === undefined
				? _constants.defaultServerConfig.isRemoteCrawler
				: serverConfig.isRemoteCrawler
			: _InitEnv.PROCESS_ENV.IS_REMOTE_CRAWLER

	serverConfig.crawler = serverConfig.isRemoteCrawler
		? ''
		: _InitEnv.ENV_MODE === 'development'
		? serverConfig.crawler
		: _InitEnv.PROCESS_ENV.CRAWLER || serverConfig.crawler

	serverConfig.crawlerSecretKey = serverConfig.isRemoteCrawler
		? ''
		: _InitEnv.ENV_MODE === 'development'
		? serverConfig.crawlerSecretKey
		: _InitEnv.PROCESS_ENV.CRAWLER_SECRET_KEY || undefined

	return serverConfig
}
exports.defineServerConfig = defineServerConfig
