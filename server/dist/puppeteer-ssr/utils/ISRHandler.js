'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}
function _nullishCoalesce(lhs, rhsFn) {
	if (lhs != null) {
		return lhs
	} else {
		return rhsFn()
	}
}
async function _asyncNullishCoalesce(lhs, rhsFn) {
	if (lhs != null) {
		return lhs
	} else {
		return await rhsFn()
	}
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
var _constants = require('../../constants')
var _serverconfig = require('../../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)
var _ConsoleHandler = require('../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _InitEnv = require('../../utils/InitEnv')

var _constants3 = require('../constants')

var _BrowserManager = require('./BrowserManager')
var _BrowserManager2 = _interopRequireDefault(_BrowserManager)
var _utils = require('./CacheManager.worker/utils')
var _utils2 = _interopRequireDefault(_utils)

var _OptimizeHtmlworker = require('./OptimizeHtml.worker')
var _utils3 = require('./OptimizeHtml.worker/utils')
const { parentPort, isMainThread } = require('worker_threads')

const browserManager = (() => {
	if (_InitEnv.ENV_MODE === 'development') return undefined
	return _BrowserManager2.default.call(void 0)
})()

const _getRestOfDuration = (startGenerating, gapDuration = 0) => {
	if (!startGenerating) return 0

	return (
		_constants3.DURATION_TIMEOUT - gapDuration - (Date.now() - startGenerating)
	)
} // _getRestOfDuration

const _getSafePage = (page) => {
	const SafePage = page

	return () => {
		if (SafePage && SafePage.isClosed()) return
		return SafePage
	}
} // _getSafePage

const fetchData = async (input, init, reqData) => {
	try {
		const params = new URLSearchParams()
		if (reqData) {
			for (const key in reqData) {
				params.append(key, reqData[key])
			}
		}

		const response = await fetch(
			input + (reqData ? `?${params.toString()}` : ''),
			init
		).then(async (res) => ({
			status: res.status,
			data: await res.text(),
		}))

		const data = /^{(.|[\r\n])*?}$/.test(response.data)
			? JSON.parse(response.data)
			: response.data

		return {
			...response,
			data,
		}
	} catch (error) {
		_ConsoleHandler2.default.error(error)
		return {
			status: 500,
			data: '',
		}
	}
} // fetchData

const waitResponse = (() => {
	const firstWaitingDuration =
		_constants.BANDWIDTH_LEVEL > _constants.BANDWIDTH_LEVEL_LIST.ONE ? 500 : 500
	const defaultRequestWaitingDuration =
		_constants.BANDWIDTH_LEVEL > _constants.BANDWIDTH_LEVEL_LIST.ONE ? 500 : 500
	const requestServedFromCacheDuration =
		_constants.BANDWIDTH_LEVEL > _constants.BANDWIDTH_LEVEL_LIST.ONE ? 500 : 500
	const requestFailDuration =
		_constants.BANDWIDTH_LEVEL > _constants.BANDWIDTH_LEVEL_LIST.ONE ? 500 : 500
	const maximumTimeout =
		_constants.BANDWIDTH_LEVEL > _constants.BANDWIDTH_LEVEL_LIST.ONE
			? 10000
			: 10000

	return async (page, url, duration) => {
		let hasRedirected = false
		const safePage = _getSafePage(page)
		_optionalChain([
			safePage,
			'call',
			(_) => _(),
			'optionalAccess',
			(_2) => _2.on,
			'call',
			(_3) =>
				_3('response', (response) => {
					const status = response.status()
					//[301, 302, 303, 307, 308]
					if (status >= 300 && status <= 399) {
						hasRedirected = true
					}
				}),
		])

		let response
		try {
			response = await new Promise(async (resolve, reject) => {
				// WorkerPool.workerEmit('waitResponse_00')
				const result = await new Promise((resolveAfterPageLoad) => {
					_optionalChain([
						safePage,
						'call',
						(_4) => _4(),
						'optionalAccess',
						(_5) => _5.goto,
						'call',
						(_6) =>
							_6(url.split('?')[0], {
								// waitUntil: 'networkidle2',
								waitUntil: 'load',
								timeout: 12000,
							}),
						'access',
						(_7) => _7.then,
						'call',
						(_8) =>
							_8((res) => {
								setTimeout(
									() => resolveAfterPageLoad(res),
									firstWaitingDuration
								)
							}),
						'access',
						(_9) => _9.catch,
						'call',
						(_10) =>
							_10((err) => {
								reject(err)
							}),
					])
				})

				// console.log(`finish page load: `, url.split('?')[0])

				// WorkerPool.workerEmit('waitResponse_01')
				const waitForNavigate = (() => {
					let counter = 0
					return async () => {
						if (hasRedirected) {
							if (counter < 3) {
								counter++
								hasRedirected = false
								return new Promise(async (resolveAfterNavigate) => {
									try {
										await _optionalChain([
											safePage,
											'call',
											(_11) => _11(),
											'optionalAccess',
											(_12) => _12.waitForSelector,
											'call',
											(_13) => _13('body'),
										])
										// await new Promise((resWaitForNavigate) =>
										// 	setTimeout(resWaitForNavigate, 2000)
										// )
										const navigateResult = await waitForNavigate()

										resolveAfterNavigate(navigateResult)
									} catch (err) {
										_ConsoleHandler2.default.error(err.message)
										resolveAfterNavigate('fail')
									}
								})
							} else {
								return 'fail'
							}
						} else return 'finish'
					}
				})()

				const navigateResult = await waitForNavigate()

				// console.log(`finish page navigate: `, url.split('?')[0])

				// WorkerPool.workerEmit('waitResponse_02')

				if (navigateResult === 'fail') return resolve(result)

				_optionalChain([
					safePage,
					'call',
					(_14) => _14(),
					'optionalAccess',
					(_15) => _15.removeAllListeners,
					'call',
					(_16) => _16('response'),
				])

				const html = await _asyncNullishCoalesce(
					await _optionalChain([
						safePage,
						'call',
						(_17) => _17(),
						'optionalAccess',
						(_18) => _18.content,
						'call',
						(_19) => _19(),
					]),
					async () => ''
				)

				if (_constants3.regexNotFoundPageID.test(html)) return resolve(result)

				await new Promise((resolveAfterPageLoadInFewSecond) => {
					const startTimeout = (() => {
						let timeout
						return (duration = defaultRequestWaitingDuration) => {
							if (timeout) clearTimeout(timeout)
							timeout = setTimeout(resolveAfterPageLoadInFewSecond, duration)
						}
					})()

					startTimeout()

					_optionalChain([
						safePage,
						'call',
						(_20) => _20(),
						'optionalAccess',
						(_21) => _21.on,
						'call',
						(_22) =>
							_22('requestfinished', () => {
								startTimeout()
							}),
					])
					_optionalChain([
						safePage,
						'call',
						(_23) => _23(),
						'optionalAccess',
						(_24) => _24.on,
						'call',
						(_25) =>
							_25('requestservedfromcache', () => {
								startTimeout(requestServedFromCacheDuration)
							}),
					])
					_optionalChain([
						safePage,
						'call',
						(_26) => _26(),
						'optionalAccess',
						(_27) => _27.on,
						'call',
						(_28) =>
							_28('requestfailed', () => {
								startTimeout(requestFailDuration)
							}),
					])

					setTimeout(resolveAfterPageLoadInFewSecond, maximumTimeout)
				})

				// console.log(`finish all page: `, url.split('?')[0])

				setTimeout(() => {
					resolve(result)
				}, 500)
			})
		} catch (err) {
			// console.log(err.message)
			// console.log('-------')
			throw err
		}

		return response
	}
})() // waitResponse

const gapDurationDefault = 1500

const ISRHandler = async (params) => {
	if (!params) return

	const { hasCache, url } = params

	const startGenerating = Date.now()
	if (_getRestOfDuration(startGenerating, gapDurationDefault) <= 0) return

	const cacheManager = _utils2.default.call(void 0, url)

	let restOfDuration = _getRestOfDuration(startGenerating, gapDurationDefault)

	if (restOfDuration <= 0) {
		if (hasCache) {
			const tmpResult = await cacheManager.achieve()

			return tmpResult
		}
		return
	}

	let html = ''
	let status = 200
	let enableOptimizeAndCompressIfRemoteCrawlerFail =
		!_serverconfig2.default.crawler

	const specialInfo = _nullishCoalesce(
		_optionalChain([
			_constants3.regexQueryStringSpecialInfo,
			'access',
			(_29) => _29.exec,
			'call',
			(_30) => _30(url),
			'optionalAccess',
			(_31) => _31.groups,
		]),
		() => ({})
	)

	if (_serverconfig2.default.crawler) {
		const requestParams = {
			startGenerating,
			hasCache,
			url: url.split('?')[0],
		}

		if (_serverconfig2.default.crawlerSecretKey) {
			requestParams['crawlerSecretKey'] =
				_serverconfig2.default.crawlerSecretKey
		}

		const headers = { ...specialInfo }

		const botInfo = JSON.parse(headers['botInfo'])

		if (!botInfo.isBot) {
			headers['botInfo'] = JSON.stringify({
				name: 'unknown',
				isBot: true,
			})
		}

		try {
			const result = await fetchData(
				_serverconfig2.default.crawler,
				{
					method: 'GET',
					headers: new Headers({
						Accept: 'text/html; charset=utf-8',
						...headers,
					}),
				},
				requestParams
			)

			if (result) {
				status = result.status
				html = result.data
			}
			_ConsoleHandler2.default.log('External crawler status: ', status)
		} catch (err) {
			enableOptimizeAndCompressIfRemoteCrawlerFail = true
			_ConsoleHandler2.default.log('ISRHandler line 230:')
			_ConsoleHandler2.default.log('Crawler is fail!')
			_ConsoleHandler2.default.error(err)
		}
	}

	if (
		browserManager &&
		(!_serverconfig2.default.crawler || [404, 500].includes(status))
	) {
		const browser = await browserManager.get()

		if (browser && browser.connected) {
			enableOptimizeAndCompressIfRemoteCrawlerFail = true
			_ConsoleHandler2.default.log('Create new page')
			const page = await browser.newPage()
			const safePage = _getSafePage(page)

			_ConsoleHandler2.default.log('Create new page success!')

			if (!page) {
				if (!page && hasCache) {
					const tmpResult = await cacheManager.achieve()

					return tmpResult
				}
				return
			}

			try {
				await _optionalChain([
					safePage,
					'call',
					(_32) => _32(),
					'optionalAccess',
					(_33) => _33.waitForNetworkIdle,
					'call',
					(_34) => _34({ idleTime: 150 }),
				])
				await _optionalChain([
					safePage,
					'call',
					(_35) => _35(),
					'optionalAccess',
					(_36) => _36.setViewport,
					'call',
					(_37) =>
						_37({
							width: _constants3.WINDOW_VIEWPORT_WIDTH,
							height: _constants3.WINDOW_VIEWPORT_HEIGHT,
						}),
				])
				await _optionalChain([
					safePage,
					'call',
					(_38) => _38(),
					'optionalAccess',
					(_39) => _39.setRequestInterception,
					'call',
					(_40) => _40(true),
				])
				_optionalChain([
					safePage,
					'call',
					(_41) => _41(),
					'optionalAccess',
					(_42) => _42.on,
					'call',
					(_43) =>
						_43('request', (req) => {
							const resourceType = req.resourceType()

							if (resourceType === 'stylesheet') {
								req.respond({ status: 200, body: 'aborted' })
							} else if (
								/(socket.io.min.js)+(?:$)|data:image\/[a-z]*.?\;base64/.test(
									url
								) ||
								/googletagmanager.com|connect.facebook.net|asia.creativecdn.com|static.hotjar.com|deqik.com|contineljs.com|googleads.g.doubleclick.net|analytics.tiktok.com|google.com|gstatic.com|static.airbridge.io|googleadservices.com|google-analytics.com|sg.mmstat.com|t.contentsquare.net|accounts.google.com|browser.sentry-cdn.com|bat.bing.com|tr.snapchat.com|ct.pinterest.com|criteo.com|webchat.caresoft.vn|tags.creativecdn.com|script.crazyegg.com|tags.tiqcdn.com|trc.taboola.com|securepubads.g.doubleclick.net|partytown/.test(
									req.url()
								) ||
								['font', 'image', 'media', 'imageset'].includes(resourceType)
							) {
								req.abort()
							} else {
								req.continue()
							}
						}),
				])

				await _optionalChain([
					safePage,
					'call',
					(_44) => _44(),
					'optionalAccess',
					(_45) => _45.setExtraHTTPHeaders,
					'call',
					(_46) =>
						_46({
							...specialInfo,
							service: 'puppeteer',
						}),
				])

				_ConsoleHandler2.default.log(`Start to crawl: ${url}`)

				let response

				try {
					response = await waitResponse(page, url, restOfDuration)
				} catch (err) {
					_ConsoleHandler2.default.log('ISRHandler line 341:')
					_ConsoleHandler2.default.error('err name: ', err.name)
					_ConsoleHandler2.default.error('err message: ', err.message)
					throw new Error('Internal Error')
				} finally {
					status = _nullishCoalesce(
						_optionalChain([
							response,
							'optionalAccess',
							(_47) => _47.status,
							'optionalCall',
							(_48) => _48(),
						]),
						() => status
					)
					_ConsoleHandler2.default.log(`Internal crawler status: ${status}`)
				}
			} catch (err) {
				_ConsoleHandler2.default.log('ISRHandler line 297:')
				_ConsoleHandler2.default.log('Crawler is fail!')
				_ConsoleHandler2.default.error(err)
				cacheManager.remove(url, { force: true }).catch((err) => {
					_ConsoleHandler2.default.error(err)
				})
				_optionalChain([
					safePage,
					'call',
					(_49) => _49(),
					'optionalAccess',
					(_50) => _50.close,
					'call',
					(_51) => _51(),
				])
				browser.emit('closePage', url)
				if (!isMainThread) {
					parentPort.postMessage({
						name: 'closePage',
						wsEndpoint: browser.wsEndpoint(),
						url,
					})
				}
				if (params.hasCache) {
					cacheManager.rename({
						url,
					})
				}

				return {
					status: 500,
				}
			}

			try {
				html = await _asyncNullishCoalesce(
					await _optionalChain([
						safePage,
						'call',
						(_52) => _52(),
						'optionalAccess',
						(_53) => _53.content,
						'call',
						(_54) => _54(),
					]),
					async () => ''
				) // serialized HTML of page DOM.
				_optionalChain([
					safePage,
					'call',
					(_55) => _55(),
					'optionalAccess',
					(_56) => _56.close,
					'call',
					(_57) => _57(),
				])
				browser.emit('closePage', url)
				if (!isMainThread) {
					parentPort.postMessage({
						name: 'closePage',
						wsEndpoint: browser.wsEndpoint(),
						url,
					})
				}
			} catch (err) {
				_ConsoleHandler2.default.log('ISRHandler line 315:')
				_ConsoleHandler2.default.error(err)
				_optionalChain([
					safePage,
					'call',
					(_58) => _58(),
					'optionalAccess',
					(_59) => _59.close,
					'call',
					(_60) => _60(),
				])
				browser.emit('closePage', url)
				if (!isMainThread) {
					parentPort.postMessage({
						name: 'closePage',
						wsEndpoint: browser.wsEndpoint(),
						url,
					})
				}
				if (params.hasCache) {
					cacheManager.rename({
						url,
					})
				}

				return
			}

			status = html && _constants3.regexNotFoundPageID.test(html) ? 404 : 200
		}
	}

	restOfDuration = _getRestOfDuration(startGenerating)

	let result
	if (_constants3.CACHEABLE_STATUS_CODE[status]) {
		const pathname = new URL(url).pathname
		const crawlCustomOption = _optionalChain([
			_serverconfig2.default,
			'access',
			(_61) => _61.crawl,
			'access',
			(_62) => _62.custom,
			'optionalCall',
			(_63) => _63(url),
		])

		const optimizeOption = _nullishCoalesce(
			_nullishCoalesce(
				crawlCustomOption,
				() => _serverconfig2.default.crawl.routes[pathname]
			),
			() => _serverconfig2.default.crawl
		).optimize

		const enableShallowOptimize =
			optimizeOption === 'shallow' &&
			enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableDeepOptimize =
			optimizeOption === 'deep' && enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableLowOptimize =
			optimizeOption === 'low' && enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableScriptOptimize =
			typeof optimizeOption !== 'string' &&
			optimizeOption.includes('script') &&
			enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableStyleOptimize =
			typeof optimizeOption !== 'string' &&
			optimizeOption.includes('style') &&
			enableOptimizeAndCompressIfRemoteCrawlerFail

		const enableToCompress = (() => {
			const options = _nullishCoalesce(
				_nullishCoalesce(
					crawlCustomOption,
					() => _serverconfig2.default.crawl.routes[pathname]
				),
				() => _serverconfig2.default.crawl
			)

			return options.compress && enableOptimizeAndCompressIfRemoteCrawlerFail
		})()

		let isRaw = false
		try {
			if (enableScriptOptimize)
				html = await _OptimizeHtmlworker.scriptOptimizeContent.call(
					void 0,
					html
				)

			if (enableStyleOptimize)
				html = await _OptimizeHtmlworker.styleOptimizeContent.call(void 0, html)

			if (enableShallowOptimize)
				html = await _OptimizeHtmlworker.shallowOptimizeContent.call(
					void 0,
					html
				)

			if (enableToCompress)
				html = await _utils3.compressContent.call(void 0, html)

			if (enableDeepOptimize)
				html = await _OptimizeHtmlworker.deepOptimizeContent.call(void 0, html)
			// console.log('finish optimize and compress: ', url.split('?')[0])
			// console.log('-------')
		} catch (err) {
			isRaw = true
			_ConsoleHandler2.default.log('--------------------')
			_ConsoleHandler2.default.log('ISRHandler line 368:')
			_ConsoleHandler2.default.log('error url', url.split('?')[0])
			_ConsoleHandler2.default.error(err)
			// console.log('fail optimize and compress: ', url.split('?')[0])
			// console.log('-------')
		}

		result = await cacheManager.set({
			html,
			url,
			isRaw,
		})
	} else {
		cacheManager.remove(url, { force: true }).catch((err) => {
			_ConsoleHandler2.default.error(err)
		})
		return {
			status,
			html: status === 404 ? 'Page not found!' : html,
		}
	}

	return result
}

exports.default = ISRHandler
