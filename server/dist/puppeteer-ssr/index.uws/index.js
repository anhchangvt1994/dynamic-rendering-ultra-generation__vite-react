'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}
function _optionalChain(ops) {
	let lastAccessLHS = undefined
	let value = ops[0]
	let i = 1
	while (i < ops.length) {
		const op = ops[i]
		const fn = ops[i + 1]
		i += 2
		if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
			return undefined
		}
		if (op === 'access' || op === 'optionalAccess') {
			lastAccessLHS = value
			value = fn(value)
		} else if (op === 'call' || op === 'optionalCall') {
			value = fn((...args) => value.call(lastAccessLHS, ...args))
			lastAccessLHS = undefined
		}
	}
	return value
}
var _fs = require('fs')
var _fs2 = _interopRequireDefault(_fs)
var _path = require('path')
var _path2 = _interopRequireDefault(_path)

var _zlib = require('zlib')

var _utils = require('../../api/utils/CacheManager/utils')
var _constants = require('../../constants')
var _DetectBot = require('../../middlewares/uws/DetectBot')
var _DetectBot2 = _interopRequireDefault(_DetectBot)
var _DetectDevice = require('../../middlewares/uws/DetectDevice')
var _DetectDevice2 = _interopRequireDefault(_DetectDevice)
var _DetectLocale = require('../../middlewares/uws/DetectLocale')
var _DetectLocale2 = _interopRequireDefault(_DetectLocale)
var _DetectRedirect = require('../../middlewares/uws/DetectRedirect')
var _DetectRedirect2 = _interopRequireDefault(_DetectRedirect)
var _DetectStatic = require('../../middlewares/uws/DetectStatic')
var _DetectStatic2 = _interopRequireDefault(_DetectStatic)
var _serverconfig = require('../../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)

var _CleanerService = require('../../utils/CleanerService')
var _CleanerService2 = _interopRequireDefault(_CleanerService)
var _ConsoleHandler = require('../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _InitEnv = require('../../utils/InitEnv')
var _StringHelper = require('../../utils/StringHelper')

var _FormatUrluws = require('../utils/FormatUrl.uws')
var _ISRGeneratornext = require('../utils/ISRGenerator.next')
var _ISRGeneratornext2 = _interopRequireDefault(_ISRGeneratornext)
var _ISRHandlerworker = require('../utils/ISRHandler.worker')
var _ISRHandlerworker2 = _interopRequireDefault(_ISRHandlerworker)
var _utils3 = require('./utils')

const COOKIE_EXPIRED_SECOND = _constants.COOKIE_EXPIRED / 1000

const puppeteerSSRService = (async () => {
	let _app
	const webScrapingService = 'web-scraping-service'
	const cleanerService = 'cleaner-service'

	const _setCookie = (res) => {
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

	const _resetCookie = (res) => {
		res
			.writeHeader('set-cookie', `EnvironmentInfo=;Max-Age=0;Path=/`)
			.writeHeader('set-cookie', `BotInfo=;Max-Age=0;Path=/`)
			.writeHeader('set-cookie', `DeviceInfo=;Max-Age=0;Path=/`)

		return res
	} // _resetCookie

	const _allRequestHandler = () => {
		if (_constants.SERVER_LESS) {
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
							_ConsoleHandler2.default.log('Request aborted')
						})

						const result = await _ISRHandlerworker2.default.call(void 0, {
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
					else if (!_constants.SERVER_LESS)
						res
							.writeStatus('200')
							.end(
								'MTr cleaner service can not run in none serverless environment'
							)
					else {
						res.onAborted(() => {
							res.writableEnded = true
							_ConsoleHandler2.default.log('Request aborted')
						})

						await _CleanerService2.default.call(void 0, true)

						_ConsoleHandler2.default.log('Finish clean service!')

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
			_utils3.handleInvalidUrl.call(void 0, res, req)

			// NOTE - Check if static will send static file
			if (res.writableEnded) return

			_DetectStatic2.default.call(void 0, res, req)

			// NOTE - Check if static will send static file
			if (res.writableEnded) return

			// NOTE - Check and create base url
			if (!_InitEnv.PROCESS_ENV.BASE_URL)
				_InitEnv.PROCESS_ENV.BASE_URL = `${
					req.getHeader('x-forwarded-proto')
						? req.getHeader('x-forwarded-proto')
						: _InitEnv.PROCESS_ENV.IS_SERVER
						? 'https'
						: 'http'
				}://${req.getHeader('host')}`

			// NOTE - Detect, setup BotInfo and LocaleInfo
			_DetectBot2.default.call(void 0, res, req)
			_DetectLocale2.default.call(void 0, res, req)

			const botInfo = _optionalChain([
				res,
				'access',
				(_) => _.cookies,
				'optionalAccess',
				(_2) => _2.botInfo,
			])

			// NOTE - Check redirect or not
			const isRedirect = _DetectRedirect2.default.call(void 0, res, req)

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
				const url = _FormatUrluws.getUrl.call(void 0, res, req)
				let enableToCrawl = _serverconfig2.default.crawl.enable
				let enableToCache =
					enableToCrawl && _serverconfig2.default.crawl.cache.enable

				const crawlOptionPerRoute =
					_serverconfig2.default.crawl.routes[req.getUrl()] ||
					_serverconfig2.default.crawl.routes[res.urlForCrawler] ||
					_optionalChain([
						_serverconfig2.default,
						'access',
						(_3) => _3.crawl,
						'access',
						(_4) => _4.custom,
						'optionalCall',
						(_5) => _5(url),
					])

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
				_serverconfig2.default.isRemoteCrawler &&
				((_serverconfig2.default.crawlerSecretKey &&
					req.getQuery('crawlerSecretKey') !==
						_serverconfig2.default.crawlerSecretKey) ||
					(!botInfo.isBot && !enableToCache))
			) {
				return res.writeStatus('403').end('403 Forbidden', true)
			}

			// NOTE - Detect DeviceInfo
			_DetectDevice2.default.call(void 0, res, req)

			// NOTE - Set cookies for EnvironmentInfo
			res.cookies.environmentInfo = (() => {
				const tmpEnvironmentInfo =
					req.getHeader('environmentinfo') || req.getHeader('environmentInfo')

				if (tmpEnvironmentInfo) return JSON.parse(tmpEnvironmentInfo)

				return {
					ENV: _InitEnv.ENV,
					MODE: _InitEnv.MODE,
					ENV_MODE: _InitEnv.ENV_MODE,
				}
			})()

			const enableContentEncoding = Boolean(req.getHeader('accept-encoding'))
			const contentEncoding = (() => {
				const tmpHeaderAcceptEncoding = req.getHeader('accept-encoding') || ''
				if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
				else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
				return ''
			})()

			_ConsoleHandler2.default.log('<---puppeteer/index.uws.ts--->')
			_ConsoleHandler2.default.log(
				'enableContentEncoding: ',
				enableContentEncoding
			)
			_ConsoleHandler2.default.log(
				`req.getHeader('accept-encoding'): `,
				req.getHeader('accept-encoding')
			)
			_ConsoleHandler2.default.log('contentEncoding: ', contentEncoding)
			_ConsoleHandler2.default.log('<---puppeteer/index.uws.ts--->')

			if (
				_InitEnv.ENV_MODE !== 'development' &&
				enableToCrawl &&
				req.getHeader('service') !== 'puppeteer'
			) {
				const url = _FormatUrluws.convertUrlHeaderToQueryString.call(
					void 0,
					_FormatUrluws.getUrl.call(void 0, res, req),
					res,
					!botInfo.isBot
				)

				if (botInfo.isBot) {
					res.onAborted(() => {
						res.writableEnded = true
						_ConsoleHandler2.default.log('Request aborted')
					})

					try {
						const result = await _ISRGeneratornext2.default.call(void 0, {
							url,
						})

						res.cork(() => {
							_utils3.handleResultAfterISRGenerator.call(void 0, res, {
								result,
								enableContentEncoding,
								contentEncoding,
							})
						})
					} catch (err) {
						_ConsoleHandler2.default.error('url', url)
						_ConsoleHandler2.default.error(err)
						// NOTE - Error: uWS.HttpResponse must not be accessed after uWS.HttpResponse.onAborted callback, or after a successful response. See documentation for uWS.HttpResponse and consult the user manual.
						if (!res.writableEnded)
							res.writeStatus('500').end('Server Error!', true)
					}

					res.writableEnded = true
				} else {
					try {
						if (_constants.SERVER_LESS) {
							await _ISRGeneratornext2.default.call(void 0, {
								url,
							})
						} else {
							_ISRGeneratornext2.default.call(void 0, {
								url,
								isSkipWaiting: true,
							})
						}
					} catch (err) {
						_ConsoleHandler2.default.error('url', url)
						_ConsoleHandler2.default.error(err)
					}
				}
			}

			if (!res.writableEnded) {
				const correctPathname = _FormatUrluws.getPathname.call(void 0, res, req)
				const pointsTo = _optionalChain([
					_serverconfig2.default,
					'access',
					(_6) => _6.routes,
					'optionalAccess',
					(_7) => _7[correctPathname],
					'optionalAccess',
					(_8) => _8.pointsTo,
				])

				if (pointsTo) {
					const url = _FormatUrluws.convertUrlHeaderToQueryString.call(
						void 0,
						pointsTo,
						res,
						false
					)

					if (url) {
						res.onAborted(() => {
							res.writableEnded = true
							_ConsoleHandler2.default.log('Request aborted')
						})

						try {
							const result = await _ISRGeneratornext2.default.call(void 0, {
								url,
								forceToCrawl: true,
							})

							res.cork(() => {
								if (result) {
									res.cork(() => {
										_utils3.handleResultAfterISRGenerator.call(void 0, res, {
											result,
											enableContentEncoding,
											contentEncoding,
										})
									})
								}
							})
						} catch (err) {
							_ConsoleHandler2.default.error(err.message)
							_ConsoleHandler2.default.error('url', url)
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
						_ConsoleHandler2.default.log('Request aborted')
					})
					try {
						const filePath =
							req.getHeader('static-html-path') ||
							_path2.default.resolve(__dirname, '../../../../dist/index.html')
						const url = (() => {
							const urlWithoutQuery = req.getUrl()
							const query = req.getQuery()
							const tmpUrl = `${urlWithoutQuery}${query ? '?' + query : ''}`

							return tmpUrl
						})()
						const apiStoreData = await (async () => {
							let tmpStoreKey
							let tmpAPIStore

							tmpStoreKey = _StringHelper.hashCode.call(void 0, url)

							tmpAPIStore = await _utils.getStore.call(void 0, tmpStoreKey)

							if (tmpAPIStore) return tmpAPIStore.data

							const deviceType = _optionalChain([
								res,
								'access',
								(_9) => _9.cookies,
								'optionalAccess',
								(_10) => _10.deviceInfo,
								'optionalAccess',
								(_11) => _11.type,
							])

							tmpStoreKey = _StringHelper.hashCode.call(
								void 0,
								`${url}${
									url.includes('?') && deviceType
										? '&device=' + deviceType
										: '?device=' + deviceType
								}`
							)

							tmpAPIStore = await _utils.getStore.call(void 0, tmpStoreKey)

							if (tmpAPIStore) return tmpAPIStore.data

							return
						})()

						const WindowAPIStore = {}

						if (apiStoreData) {
							if (apiStoreData.length) {
								for (const cacheKey of apiStoreData) {
									const apiCache = await _utils.getData.call(void 0, cacheKey)
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

						let html = _fs2.default.readFileSync(filePath, 'utf8') || ''

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
									return _zlib.brotliCompressSync.call(void 0, html)
								case contentEncoding === 'gzip':
									return _zlib.gzipSync.call(void 0, html)
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
						_ConsoleHandler2.default.log(err)
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
		init(app) {
			if (!app)
				return _ConsoleHandler2.default.warn(
					'You need provide uWebSockets app!'
				)
			_app = app
			_allRequestHandler()
		},
	}
})()

exports.default = puppeteerSSRService
