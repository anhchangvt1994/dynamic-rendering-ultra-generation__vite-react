import fs from 'fs'
import path from 'path'
import { HttpResponse, TemplatedApp } from 'uWebSockets.js'
import { brotliCompressSync, gzipSync } from 'zlib'
import {
	getData as getDataCache,
	getStore as getStoreCache,
} from '../../api/utils/CacheManager/utils'
import { COOKIE_EXPIRED, SERVER_LESS } from '../../constants'
import DetectBotMiddle from '../../middlewares/uws/DetectBot'
import DetectDeviceMiddle from '../../middlewares/uws/DetectDevice'
import DetectLocaleMiddle from '../../middlewares/uws/DetectLocale'
import DetectRedirectMiddle from '../../middlewares/uws/DetectRedirect'
import DetectStaticMiddle from '../../middlewares/uws/DetectStatic'
import ServerConfig from '../../server.config'
import { IBotInfo } from '../../types'
import CleanerService from '../../utils/CleanerService'
import Console from '../../utils/ConsoleHandler'
import { ENV, ENV_MODE, MODE, PROCESS_ENV } from '../../utils/InitEnv'
import { hashCode } from '../../utils/StringHelper'
import {
	convertUrlHeaderToQueryString,
	getPathname,
	getUrl,
} from '../utils/FormatUrl.uws'
import ISRGenerator from '../utils/ISRGenerator.next'
import ISSRHandler from '../utils/ISRHandler.worker'
import { handleInvalidUrl, handleResultAfterISRGenerator } from './utils'

const COOKIE_EXPIRED_SECOND = COOKIE_EXPIRED / 1000

const puppeteerSSRService = (async () => {
	let _app: TemplatedApp
	const webScrapingService = 'web-scraping-service'
	const cleanerService = 'cleaner-service'

	const _setCookie = (res: HttpResponse) => {
		res
			.writeHeader(
				'set-cookie',
				`EnvironmentInfo=${JSON.stringify(
					res.cookies.environmentInfo
				)};Max-Age=${COOKIE_EXPIRED_SECOND};Path=/`
			)
			.writeHeader(
				'set-cookie',
				`BotInfo=${JSON.stringify(
					res.cookies.botInfo
				)};Max-Age=${COOKIE_EXPIRED_SECOND};Path=/`
			)
			.writeHeader(
				'set-cookie',
				`DeviceInfo=${JSON.stringify(
					res.cookies.deviceInfo
				)};Max-Age=${COOKIE_EXPIRED_SECOND};Path=/`
			)
			.writeHeader(
				'set-cookie',
				`LocaleInfo=${JSON.stringify(
					res.cookies.localeInfo
				)};Max-Age=${COOKIE_EXPIRED_SECOND};Path=/`
			)

		return res
	} // _setCookie

	const _resetCookie = (res: HttpResponse) => {
		res
			.writeHeader('set-cookie', `EnvironmentInfo=;Max-Age=0;Path=/`)
			.writeHeader('set-cookie', `BotInfo=;Max-Age=0;Path=/`)
			.writeHeader('set-cookie', `DeviceInfo=;Max-Age=0;Path=/`)

		return res
	} // _resetCookie

	const _allRequestHandler = () => {
		if (SERVER_LESS) {
			_app
				.get('/web-scraping', async function (res, req) {
					if (req.getHeader('authorization') !== webScrapingService)
						res
							.writeStatus('200')
							.end(
								'Welcome to MTr Web Scraping Service, please provide authorization to use it.',
								true
							)
					else {
						const startGenerating = Number(req.getQuery('startGenerating'))
						const isFirstRequest = !!req.getQuery('isFirstRequest')
						const url = req.getQuery('url') || ''

						res.onAborted(() => {
							res.writableEnded = true
							Console.log('Request aborted')
						})

						const result = await ISSRHandler({
							startGenerating,
							hasCache: isFirstRequest,
							url,
						})

						res.cork(() => {
							res
								.writeStatus('200')
								.end(result ? JSON.stringify(result) : '{}', true)
						})
					}
				})
				.post('/cleaner-service', async function (res, req) {
					if (req.getHeader('authorization') !== cleanerService)
						res
							.writeStatus('200')
							.end(
								'Welcome to MTr Cleaner Service, please provide authorization to use it.',
								true
							)
					else if (!SERVER_LESS)
						res
							.writeStatus('200')
							.end(
								'MTr cleaner service can not run in none serverless environment'
							)
					else {
						res.onAborted(() => {
							res.writableEnded = true
							Console.log('Request aborted')
						})

						await CleanerService(true)

						Console.log('Finish clean service!')

						res.cork(() => {
							res.writeStatus('200').end('Finish clean service!', true)
						})
					}
				})
		}
		_app.get('/*', async function (res, req) {
			// if (req.getUrl().startsWith('/api')) {
			// 	return res.writeStatus('404').end('Not Found!', true)
			// }
			handleInvalidUrl(res, req)

			// NOTE - Check if static will send static file
			if (res.writableEnded) return

			DetectStaticMiddle(res, req)

			// NOTE - Check if static will send static file
			if (res.writableEnded) return

			// NOTE - Check and create base url
			if (!PROCESS_ENV.BASE_URL)
				PROCESS_ENV.BASE_URL = `${
					req.getHeader('x-forwarded-proto')
						? req.getHeader('x-forwarded-proto')
						: PROCESS_ENV.IS_SERVER
						? 'https'
						: 'http'
				}://${req.getHeader('host')}`

			// NOTE - Detect, setup BotInfo and LocaleInfo
			DetectBotMiddle(res, req)
			DetectLocaleMiddle(res, req)

			const botInfo: IBotInfo = res.cookies?.botInfo

			// NOTE - Check redirect or not
			const isRedirect = DetectRedirectMiddle(res, req)

			/**
			 * NOTE
			 * - We need crawl page although this request is not a bot
			 * When we request by enter first request, redirect will checked and will redirect immediately in server. But when we change router in client side, the request will be a extra fetch from client to server to check redirect information, in this case redirect will run in client not server and won't any request call to server after client run redirect. So we need crawl page in server in the first fetch request that client call to server (if header.accept is 'application/json' then it's fetch request from client)
			 */
			if (
				(res.writableEnded && botInfo.isBot) ||
				(isRedirect && req.getHeader('accept') !== 'application/json')
			)
				return

			const { enableToCrawl, enableToCache } = (() => {
				const url = getUrl(res, req)
				let enableToCrawl = ServerConfig.crawl.enable
				let enableToCache = enableToCrawl && ServerConfig.crawl.cache.enable

				const crawlOptionPerRoute =
					ServerConfig.crawl.routes[req.getUrl()] ||
					ServerConfig.crawl.routes[res.urlForCrawler] ||
					ServerConfig.crawl.custom?.(url)

				if (crawlOptionPerRoute) {
					enableToCrawl = crawlOptionPerRoute.enable
					enableToCache = enableToCrawl && crawlOptionPerRoute.cache.enable
				}

				return {
					enableToCrawl,
					enableToCache,
				}
			})()

			if (
				ServerConfig.isRemoteCrawler &&
				((ServerConfig.crawlerSecretKey &&
					req.getQuery('crawlerSecretKey') !== ServerConfig.crawlerSecretKey) ||
					(!botInfo.isBot && !enableToCache))
			) {
				return res.writeStatus('403').end('403 Forbidden', true)
			}

			// NOTE - Detect DeviceInfo
			DetectDeviceMiddle(res, req)

			// NOTE - Set cookies for EnvironmentInfo
			res.cookies.environmentInfo = (() => {
				const tmpEnvironmentInfo =
					req.getHeader('environmentinfo') || req.getHeader('environmentInfo')

				if (tmpEnvironmentInfo) return JSON.parse(tmpEnvironmentInfo)

				return {
					ENV,
					MODE,
					ENV_MODE,
				}
			})()

			const enableContentEncoding = Boolean(req.getHeader('accept-encoding'))
			const contentEncoding = (() => {
				const tmpHeaderAcceptEncoding = req.getHeader('accept-encoding') || ''
				if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
				else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
				return '' as 'br' | 'gzip' | ''
			})()

			Console.log('<---puppeteer/index.uws.ts--->')
			Console.log('enableContentEncoding: ', enableContentEncoding)
			Console.log(
				`req.getHeader('accept-encoding'): `,
				req.getHeader('accept-encoding')
			)
			Console.log('contentEncoding: ', contentEncoding)
			Console.log('<---puppeteer/index.uws.ts--->')

			if (
				ENV_MODE !== 'development' &&
				enableToCrawl &&
				req.getHeader('service') !== 'puppeteer'
			) {
				const url = convertUrlHeaderToQueryString(
					getUrl(res, req),
					res,
					!botInfo.isBot
				)

				if (botInfo.isBot) {
					res.onAborted(() => {
						res.writableEnded = true
						Console.log('Request aborted')
					})

					try {
						const result = await ISRGenerator({
							url,
						})

						res.cork(() => {
							handleResultAfterISRGenerator(res, {
								result,
								enableContentEncoding,
								contentEncoding,
							})
						})
					} catch (err) {
						Console.error('url', url)
						Console.error(err)
						// NOTE - Error: uWS.HttpResponse must not be accessed after uWS.HttpResponse.onAborted callback, or after a successful response. See documentation for uWS.HttpResponse and consult the user manual.
						if (!res.writableEnded)
							res.writeStatus('500').end('Server Error!', true)
					}

					res.writableEnded = true
				} else {
					try {
						if (SERVER_LESS) {
							await ISRGenerator({
								url,
							})
						} else {
							ISRGenerator({
								url,
								isSkipWaiting: true,
							})
						}
					} catch (err) {
						Console.error('url', url)
						Console.error(err)
					}
				}
			}

			if (!res.writableEnded) {
				const correctPathname = getPathname(res, req)
				const pointsTo = ServerConfig.routes?.[correctPathname]?.pointsTo

				if (pointsTo) {
					const url = convertUrlHeaderToQueryString(pointsTo, res, false)

					if (url) {
						res.onAborted(() => {
							res.writableEnded = true
							Console.log('Request aborted')
						})

						try {
							const result = await ISRGenerator({
								url,
								forceToCrawl: true,
							})

							res.cork(() => {
								if (result) {
									res.cork(() => {
										handleResultAfterISRGenerator(res, {
											result,
											enableContentEncoding,
											contentEncoding,
										})
									})
								}
							})
						} catch (err) {
							Console.error(err.message)
							Console.error('url', url)
							// NOTE - Error: uWS.HttpResponse must not be accessed after uWS.HttpResponse.onAborted callback, or after a successful response. See documentation for uWS.HttpResponse and consult the user manual.
							if (!res.writableEnded)
								res.writeStatus('500').end('Server Error!', true)
						}

						res.writableEnded = true
					}
				}
			}

			if (!res.writableEnded) {
				/**
				 * NOTE
				 * Cache-Control max-age is 1 year
				 * calc by using:
				 * https://www.inchcalculator.com/convert/year-to-second/
				 */
				if (req.getHeader('accept') === 'application/json') {
					res.writeStatus('200')

					res = _setCookie(res)
					res = _resetCookie(res)
					res.end(
						JSON.stringify({
							status: 200,
							originPath: req.getUrl(),
							path: req.getUrl(),
						}),
						true
					)
				} else {
					const reqHeaderAccept = req.getHeader('accept')
					res.onAborted(() => {
						res.writableEnded = true
						Console.log('Request aborted')
					})
					try {
						const filePath =
							(req.getHeader('static-html-path') as string) ||
							path.resolve(__dirname, '../../../../dist/index.html')
						const url = (() => {
							const urlWithoutQuery = req.getUrl()
							const query = req.getQuery()
							const tmpUrl = `${urlWithoutQuery}${query ? '?' + query : ''}`

							return tmpUrl
						})()
						const apiStoreData = await (async () => {
							let tmpStoreKey
							let tmpAPIStore

							tmpStoreKey = hashCode(url)

							tmpAPIStore = await getStoreCache(tmpStoreKey)

							if (tmpAPIStore) return tmpAPIStore.data

							const deviceType = res.cookies?.deviceInfo?.type

							tmpStoreKey = hashCode(
								`${url}${
									url.includes('?') && deviceType
										? '&device=' + deviceType
										: '?device=' + deviceType
								}`
							)

							tmpAPIStore = await getStoreCache(tmpStoreKey)

							if (tmpAPIStore) return tmpAPIStore.data

							return
						})()

						const WindowAPIStore = {}

						if (apiStoreData) {
							if (apiStoreData.length) {
								for (const cacheKey of apiStoreData) {
									const apiCache = await getDataCache(cacheKey)
									if (
										!apiCache ||
										!apiCache.cache ||
										apiCache.cache.status !== 200
									)
										continue

									WindowAPIStore[cacheKey] = apiCache.cache.data
								}
							}
						}

						let html = fs.readFileSync(filePath, 'utf8') || ''

						html = html.replace(
							'</head>',
							`<script>window.API_STORE = ${JSON.stringify({
								WindowAPIStore,
							})}</script></head>`
						)

						const body = (() => {
							if (!enableContentEncoding) return html

							switch (true) {
								case contentEncoding === 'br':
									return brotliCompressSync(html)
								case contentEncoding === 'gzip':
									return gzipSync(html)
								default:
									return html
							}
						})()

						res.cork(() => {
							res.writeStatus('200')

							if (enableContentEncoding) {
								res.writeHeader('Content-Encoding', contentEncoding)
							}

							res.writeHeader(
								'Content-Type',
								reqHeaderAccept === 'application/json'
									? 'application/json'
									: 'text/html; charset=utf-8'
							)
							res = _setCookie(res)
							res
								.writeHeader('Cache-Control', 'no-store')
								.writeHeader('etag', 'false')
								.writeHeader('lastModified', 'false')

							// NOTE - Setup cookie information
							if (res.cookies.lang)
								res.writeHeader('set-cookie', `lang=${res.cookies.lang};Path=/`)
							if (res.cookies.country)
								res.writeHeader(
									'set-cookie',
									`country=${res.cookies.country};Path=/`
								)

							res.end(body, true)
						})
					} catch (err) {
						Console.log(err)
						if (!res.writableEnded) {
							res.cork(() => {
								res
									.writeStatus('404')
									.writeHeader(
										'Content-Type',
										reqHeaderAccept === 'application/json'
											? 'application/json'
											: 'text/html; charset=utf-8'
									)
									.end('File not found!', true)
							})
						}
					}
				}
			}
		})
	}

	return {
		init(app: TemplatedApp) {
			if (!app) return Console.warn('You need provide uWebSockets app!')
			_app = app
			_allRequestHandler()
		},
	}
})()

export default puppeteerSSRService
