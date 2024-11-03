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

var _utils = require('../api/utils/CacheManager/utils')
var _constants = require('../constants')
var _serverconfig = require('../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)

var _CleanerService = require('../utils/CleanerService')
var _CleanerService2 = _interopRequireDefault(_CleanerService)
var _ConsoleHandler = require('../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _CookieHandler = require('../utils/CookieHandler')
var _InitEnv = require('../utils/InitEnv')
var _StringHelper = require('../utils/StringHelper')
var _constants3 = require('./constants')
var _FormatUrl = require('./utils/FormatUrl')
var _ISRGeneratornext = require('./utils/ISRGenerator.next')
var _ISRGeneratornext2 = _interopRequireDefault(_ISRGeneratornext)
var _ISRHandlerworker = require('./utils/ISRHandler.worker')
var _ISRHandlerworker2 = _interopRequireDefault(_ISRHandlerworker)

const _resetCookie = (res) => {
	_CookieHandler.setCookie.call(void 0, res, `BotInfo=;Max-Age=0;Path=/`)
	_CookieHandler.setCookie.call(
		void 0,
		res,
		`EnvironmentInfo=;Max-Age=0;Path=/`
	)
	_CookieHandler.setCookie.call(void 0, res, `DeviceInfo=;Max-Age=0;Path=/`)
} // _resetCookie

const puppeteerSSRService = (async () => {
	let _app
	const webScrapingService = 'web-scraping-service'
	const cleanerService = 'cleaner-service'

	const _allRequestHandler = () => {
		if (_constants.SERVER_LESS) {
			_app
				.get('/web-scraping', async function (req, res) {
					if (req.headers.authorization !== webScrapingService)
						return res
							.status(200)
							.send(
								'Welcome to MTr Web Scraping Service, please provide authorization to use it.'
							)

					const startGenerating = Number(
						_optionalChain([
							req,
							'access',
							(_) => _.query,
							'optionalAccess',
							(_2) => _2['startGenerating'],
						])
					)
					const isFirstRequest = !!_optionalChain([
						req,
						'access',
						(_3) => _3.query,
						'optionalAccess',
						(_4) => _4['isFirstRequest'],
					])
					const url = _optionalChain([
						req,
						'access',
						(_5) => _5.query,
						'optionalAccess',
						(_6) => _6['url'],
					])
						? decodeURIComponent(
								_optionalChain([
									req,
									'access',
									(_7) => _7.query,
									'optionalAccess',
									(_8) => _8['url'],
								])
						  )
						: ''

					const result = await _ISRHandlerworker2.default.call(void 0, {
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
					else if (!_constants.SERVER_LESS)
						return res
							.status(200)
							.send(
								'MTr cleaner service can not run in none serverless environment'
							)

					await _CleanerService2.default.call(void 0, true)

					_ConsoleHandler2.default.log('Finish clean service!')

					res.status(200).send('Finish clean service!')
				})
		}
		_app.get(
			'*',
			async function (
				req,

				res
			) {
				const pathname = _optionalChain([
					req,
					'access',
					(_9) => _9.url,
					'optionalAccess',
					(_10) => _10.split,
					'call',
					(_11) => _11('?'),
					'access',
					(_12) => _12[0],
				])
				const cookies = _CookieHandler.getCookieFromResponse.call(void 0, res)
				const botInfo = _optionalChain([
					cookies,
					'optionalAccess',
					(_13) => _13['BotInfo'],
				])
				const { enableToCrawl, enableToCache } = (() => {
					const url = _FormatUrl.convertUrlHeaderToQueryString.call(
						void 0,
						_FormatUrl.getUrl.call(void 0, req),
						res,
						!botInfo.isBot
					)
					let enableToCrawl = _serverconfig2.default.crawl.enable
					let enableToCache =
						enableToCrawl && _serverconfig2.default.crawl.cache.enable

					const crawlOptionPerRoute =
						_serverconfig2.default.crawl.routes[pathname] ||
						_optionalChain([
							_serverconfig2.default,
							'access',
							(_14) => _14.crawl,
							'access',
							(_15) => _15.custom,
							'optionalCall',
							(_16) => _16(url),
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

				const headers = req.headers
				const enableContentEncoding = Boolean(headers['accept-encoding'])
				const contentEncoding = (() => {
					const tmpHeaderAcceptEncoding = headers['accept-encoding'] || ''
					if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
					else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
					return ''
				})()

				_ConsoleHandler2.default.log('<---puppeteer/index.fastify.ts--->')
				_ConsoleHandler2.default.log(
					'enableContentEncoding: ',
					enableContentEncoding
				)
				_ConsoleHandler2.default.log(
					`headers['accept-encoding']: `,
					headers['accept-encoding']
				)
				_ConsoleHandler2.default.log('contentEncoding: ', contentEncoding)
				_ConsoleHandler2.default.log('<---puppeteer/index.fastify.ts--->')

				res.raw.setHeader(
					'Content-Type',
					headers.accept === 'application/json'
						? 'application/json'
						: 'text/html; charset=utf-8'
				)

				if (
					_serverconfig2.default.isRemoteCrawler &&
					((_serverconfig2.default.crawlerSecretKey &&
						req.query.crawlerSecretKey !==
							_serverconfig2.default.crawlerSecretKey) ||
						(!botInfo.isBot && enableToCache))
				) {
					return res.status(403).send('403 Forbidden')
				}

				if (
					_InitEnv.ENV_MODE !== 'development' &&
					enableToCrawl &&
					headers.service !== 'puppeteer'
				) {
					const url = _FormatUrl.convertUrlHeaderToQueryString.call(
						void 0,
						_FormatUrl.getUrl.call(void 0, req),
						res,
						!botInfo.isBot
					)
					if (!req.headers['redirect'] && botInfo.isBot) {
						try {
							const result = await _ISRGeneratornext2.default.call(void 0, {
								url,
							})

							if (result) {
								/**
								 * NOTE
								 * calc by using:
								 * https://www.inchcalculator.com/convert/year-to-second/
								 */
								res.raw.setHeader(
									'Server-Timing',
									`Prerender;dur=50;desc="Headless render time (ms)"`
								)
								res.raw.setHeader('Cache-Control', 'no-store')
								res.raw.statusCode = result.status
								if (enableContentEncoding && result.status === 200) {
									res.raw.setHeader('Content-Encoding', contentEncoding)
								}

								if (result.status === 503) res.header('Retry-After', '120')
							} else {
								return res.status(504).send('504 Gateway Timeout')
							}

							if (
								(_constants3.CACHEABLE_STATUS_CODE[result.status] ||
									result.status === 503) &&
								result.response
							) {
								const body = (() => {
									let tmpBody = ''

									if (enableContentEncoding) {
										tmpBody = result.html
											? contentEncoding === 'br'
												? _zlib.brotliCompressSync.call(void 0, result.html)
												: contentEncoding === 'gzip'
												? _zlib.gzipSync.call(void 0, result.html)
												: result.html
											: (() => {
													let tmpContent = _fs2.default.readFileSync(
														result.response
													)

													if (contentEncoding === 'br') return tmpContent
													else if (tmpContent && Buffer.isBuffer(tmpContent))
														tmpContent = _zlib.brotliDecompressSync
															.call(void 0, tmpContent)
															.toString()

													if (result.status === 200) {
														if (contentEncoding === 'gzip')
															tmpContent = _zlib.gzipSync.call(
																void 0,
																tmpContent
															)
													}

													return tmpContent
											  })()
									} else if (result.response.indexOf('.br') !== -1) {
										const content = _fs2.default.readFileSync(result.response)

										if (content && Buffer.isBuffer(content))
											tmpBody = _zlib.brotliDecompressSync
												.call(void 0, content)
												.toString()
									} else {
										tmpBody = _fs2.default.readFileSync(result.response)
									}

									return tmpBody
								})()

								return res.send(body)
							}
							// Serve prerendered page as response.
							else {
								const body = (() => {
									let tmpBody = ''

									if (enableContentEncoding) {
										tmpBody = result.html
											? contentEncoding === 'br'
												? _zlib.brotliCompressSync.call(void 0, result.html)
												: contentEncoding === 'gzip'
												? _zlib.gzipSync.call(void 0, result.html)
												: result.html
											: _fs2.default.readFileSync(result.response)
									} else if (result.response.indexOf('.br') !== -1) {
										const content = _fs2.default.readFileSync(result.response)

										tmpBody = _zlib.brotliDecompressSync
											.call(void 0, content)
											.toString()
									} else {
										tmpBody = _fs2.default.readFileSync(result.response)
									}

									return tmpBody
								})()

								res.send(body)
							}
						} catch (err) {
							_ConsoleHandler2.default.error('url', url)
							_ConsoleHandler2.default.error(err)
						}

						return
					} else if (!botInfo.isBot) {
						try {
							if (_constants.SERVER_LESS) {
								await _ISRGeneratornext2.default.call(void 0, {
									url,
									isSkipWaiting: true,
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

				/**
				 * NOTE
				 * Cache-Control max-age is 1 year
				 * calc by using:
				 * https://www.inchcalculator.com/convert/year-to-second/
				 */
				if (headers.accept === 'application/json') {
					_resetCookie(res)
					res
						.header('Cache-Control', 'no-store')
						.send(
							req.headers['redirect']
								? JSON.parse(req.headers['redirect'])
								: { status: 200, originPath: pathname, path: pathname }
						)
				} else {
					const filePath =
						req.headers['static-html-path'] ||
						_path2.default.resolve(__dirname, '../../../dist/index.html')

					const apiStoreData = await (async () => {
						let tmpStoreKey
						let tmpAPIStore

						tmpStoreKey = _StringHelper.hashCode.call(void 0, req.url)

						tmpAPIStore = await _utils.getStore.call(void 0, tmpStoreKey)

						if (tmpAPIStore) return tmpAPIStore.data

						const cookies = _CookieHandler.getCookieFromResponse.call(
							void 0,
							res
						)
						const deviceType = _optionalChain([
							cookies,
							'optionalAccess',
							(_17) => _17['DeviceInfo'],
							'optionalAccess',
							(_18) => _18['type'],
						])

						tmpStoreKey = _StringHelper.hashCode.call(
							void 0,
							`${req.url}${
								req.url.includes('?') && deviceType
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
						`<script>window.API_STORE = ${JSON.stringify(
							WindowAPIStore
						)}</script></head>`
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

					if (enableContentEncoding) {
						res.raw.setHeader('Content-Encoding', contentEncoding)
					}

					res.raw.setHeader('Cache-Control', 'no-store')
					res.status(200).send(body)
				}
			}
		)
	}

	return {
		init(app) {
			if (!app)
				return _ConsoleHandler2.default.warn('You need provide fastify app!')
			_app = app
			_allRequestHandler()
		},
	}
})()

exports.default = puppeteerSSRService
