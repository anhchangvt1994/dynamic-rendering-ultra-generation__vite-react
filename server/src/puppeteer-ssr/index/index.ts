import { Express } from 'express'
import fs from 'fs'
import path from 'path'
import { brotliCompressSync, gzipSync } from 'zlib'
import {
	getData as getDataCache,
	getStore as getStoreCache,
} from '../../api/utils/CacheManager/utils'
import { SERVER_LESS } from '../../constants'
import ServerConfig from '../../server.config'
import { IBotInfo } from '../../types'
import CleanerService from '../../utils/CleanerService'
import Console from '../../utils/ConsoleHandler'
import { getCookieFromResponse, setCookie } from '../../utils/CookieHandler'
import { ENV_MODE } from '../../utils/InitEnv'
import { hashCode } from '../../utils/StringHelper'
import {
	convertUrlHeaderToQueryString,
	getPathname,
	getUrl,
} from '../utils/FormatUrl'
import ISRGenerator from '../utils/ISRGenerator.next'
import SSRHandler from '../utils/ISRHandler.worker'
import { handleResultAfterISRGenerator } from './utils'

const _resetCookie = (res) => {
	setCookie(res, `BotInfo=;Max-Age=0;Path=/`)
	setCookie(res, `EnvironmentInfo=;Max-Age=0;Path=/`)
	setCookie(res, `DeviceInfo=;Max-Age=0;Path=/`)
} // _resetCookie

const puppeteerSSRService = (async () => {
	let _app: Express
	const webScrapingService = 'web-scraping-service'
	const cleanerService = 'cleaner-service'

	const _allRequestHandler = () => {
		if (SERVER_LESS) {
			_app
				.get('/web-scraping', async function (req, res) {
					if (req.headers.authorization !== webScrapingService)
						return res
							.status(200)
							.send(
								'Welcome to MTr Web Scraping Service, please provide authorization to use it.'
							)

					const startGenerating = Number(req.query.startGenerating)
					const isFirstRequest = !!req.query.isFirstRequest
					const url = req.query.url
						? (decodeURIComponent(req.query.url as string) as string)
						: ''

					const result = await SSRHandler({
						startGenerating,
						hasCache: isFirstRequest,
						url,
					})

					res.status(200).send(result || {})
				})
				.post('/cleaner-service', async function (req, res) {
					if (req.headers.authorization !== cleanerService)
						return res
							.status(200)
							.send(
								'Welcome to MTr Cleaner Service, please provide authorization to use it.'
							)
					else if (!SERVER_LESS)
						return res
							.status(200)
							.send(
								'MTr cleaner service can not run in none serverless environment'
							)

					await CleanerService(true)

					Console.log('Finish clean service!')

					res.status(200).send('Finish clean service!')
				})
		}
		_app.get('*', async function (req, res, next) {
			if (req.url.startsWith('/api')) {
				return res.status(404).send('Not Found!')
			}

			const pathname = req.url?.split('?')[0]
			const cookies = getCookieFromResponse(res)
			const botInfo: IBotInfo = cookies?.['BotInfo']
			const { enableToCrawl, enableToCache } = (() => {
				const url = convertUrlHeaderToQueryString(
					getUrl(req),
					res,
					!botInfo.isBot
				)
				let enableToCrawl = ServerConfig.crawl.enable
				let enableToCache = enableToCrawl && ServerConfig.crawl.cache.enable

				const crawlOptionPerRoute =
					ServerConfig.crawl.routes[pathname] ||
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

			const headers = req.headers
			const enableContentEncoding = Boolean(headers['accept-encoding'])
			const contentEncoding = (() => {
				const tmpHeaderAcceptEncoding = headers['accept-encoding'] || ''
				if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
				else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
				return '' as 'br' | 'gzip' | ''
			})()

			Console.log('<---puppeteer/index.ts--->')
			Console.log('enableContentEncoding: ', enableContentEncoding)
			Console.log(`headers['accept-encoding']: `, headers['accept-encoding'])
			Console.log('contentEncoding: ', contentEncoding)
			Console.log('<---puppeteer/index.ts--->')

			res.set({
				'Content-Type':
					headers.accept === 'application/json'
						? 'application/json'
						: 'text/html; charset=utf-8',
			})

			if (
				ServerConfig.isRemoteCrawler &&
				((ServerConfig.crawlerSecretKey &&
					req.query.crawlerSecretKey !== ServerConfig.crawlerSecretKey) ||
					(!botInfo.isBot && enableToCache))
			) {
				return res.status(403).send('403 Forbidden')
			}

			if (
				ENV_MODE !== 'development' &&
				enableToCrawl &&
				req.headers.service !== 'puppeteer'
			) {
				const url = convertUrlHeaderToQueryString(
					getUrl(req),
					res,
					!botInfo.isBot
				)

				if (!req.headers['redirect'] && botInfo.isBot) {
					try {
						const result = await ISRGenerator({
							url,
						})

						handleResultAfterISRGenerator(res, next, {
							result,
							enableContentEncoding,
							contentEncoding,
						})
					} catch (err) {
						Console.error('url', url)
						Console.error(err)
						next(err)
					}

					return
				} else if (!botInfo.isBot && enableToCache) {
					try {
						if (SERVER_LESS) {
							await ISRGenerator({
								url,
								isSkipWaiting: true,
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

			const correctPathname = getPathname(req)
			const pointsTo = ServerConfig.routes?.[correctPathname]?.pointsTo

			if (pointsTo) {
				const url = convertUrlHeaderToQueryString(pointsTo, res, false)

				if (url) {
					try {
						const result = await ISRGenerator({
							url,
						})

						handleResultAfterISRGenerator(res, next, {
							result,
							enableContentEncoding,
							contentEncoding,
						})
					} catch (err) {
						Console.error('url', url)
						Console.error(err)
						next(err)
					}

					return
				}
			}

			/**
			 * NOTE
			 * Cache-Control max-age is 1 year
			 * calc by using:
			 * https://www.inchcalculator.com/convert/year-to-second/
			 */
			if (headers.accept === 'application/json') {
				// NOTE - If header accept application/json (pre-ISR generate static file when user enter and navigate), system will reset cookies to ensure that cookie doesn't exist in these cases
				_resetCookie(res)
				res
					.set({
						'Cache-Control': 'no-store',
					})
					.send(
						req.headers['redirect']
							? JSON.parse(req.headers['redirect'] as string)
							: { status: 200, originPath: pathname, path: pathname }
					)
			} else {
				const filePath =
					(req.headers['static-html-path'] as string) ||
					path.resolve(__dirname, '../../../../dist/index.html')

				const apiStoreData = await (async () => {
					let tmpStoreKey
					let tmpAPIStore

					tmpStoreKey = hashCode(req.url)

					tmpAPIStore = await getStoreCache(tmpStoreKey)

					if (tmpAPIStore) return tmpAPIStore.data

					const cookies = getCookieFromResponse(res)
					const deviceType = cookies?.['DeviceInfo']?.['type']

					tmpStoreKey = hashCode(
						`${req.url}${
							req.url.includes('?') && deviceType
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
							if (!apiCache || !apiCache.cache || apiCache.cache.status !== 200)
								continue

							WindowAPIStore[cacheKey] = apiCache.cache.data
						}
					}
				}

				let html = ''

				try {
					html = fs.readFileSync(filePath, 'utf8')
				} catch (err) {
					Console.error(err)
				}

				html = html.replace(
					'</head>',
					`<script>window.API_STORE = ${JSON.stringify(
						WindowAPIStore
					)}</script></head>`
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

				if (enableContentEncoding) {
					res.set({
						'Content-Encoding': contentEncoding,
					})
				}

				res
					.set({
						// 'Cache-Control': 'public, max-age: 31556952',
						'Cache-Control': 'no-store',
					})
					.status(200)
					.send(body)
			}
		})

		// Hàm middleware xử lý lỗi cuối cùng
		_app.use(function (err, req, res, next) {
			Console.error(err.stack)
			res.status(504).send('504 Gateway Timeout')
		})
	}

	return {
		init(app: Express) {
			if (!app) return Console.warn('You need provide express app!')
			_app = app
			_allRequestHandler()
		},
	}
})()

export default puppeteerSSRService
