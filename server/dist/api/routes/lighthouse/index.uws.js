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
var _ConsoleHandler = require('../../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _utils = require('../../utils/FetchManager/utils')

var _worker = require('./worker')
var _InitEnv = require('../../../utils/InitEnv')
var _constants = require('./constants')
var _serverconfig = require('../../../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)

const limitRequest = _serverconfig2.default.crawl.limit
let totalRequests = 0
const resetTotalRequestTimeout = (() => {
	let timeout

	return () => {
		if (timeout) clearTimeout(timeout)
		timeout = setTimeout(() => {
			totalRequests = 0
		}, 50000)
	}
})()

const apiLighthouse = (() => {
	let _app

	const _allRequestHandler = () => {
		_app.get('/api/lighthouse', async (res, req) => {
			if (totalRequests >= limitRequest) {
				res.writeStatus('429 Too many requests').end('Too many requests', true)
				return
			}

			resetTotalRequestTimeout()
			totalRequests++

			res.onAborted(() => {
				res.writableEnded = true
				totalRequests = totalRequests > 0 ? totalRequests - 1 : 0
				_ConsoleHandler2.default.log('Request aborted')
			})

			// NOTE - Check and create base url
			if (!_InitEnv.PROCESS_ENV.BASE_URL)
				_InitEnv.PROCESS_ENV.BASE_URL = `${
					req.getHeader('x-forwarded-proto')
						? req.getHeader('x-forwarded-proto')
						: _InitEnv.PROCESS_ENV.IS_SERVER
						? 'https'
						: 'http'
				}://${req.getHeader('host')}`

			const urlParam = req.getQuery('url')

			if (!urlParam) {
				res
					.writeHeader('Access-Control-Allow-Origin', '*')
					.writeStatus('400 `url` querystring params is required')
					.end('`url` querystring params is required') // end the request
				res.writableEnded = true // disable to write
			} else if (
				!/^(https?:\/\/)?(www.)?([a-zA-Z0-9_-]+\.[a-zA-Z]{2,6})(\.[a-zA-Z]{2,6})?(\/.*)?$/.test(
					urlParam
				)
			) {
				res
					.writeHeader('Access-Control-Allow-Origin', '*')
					.writeStatus(
						'400 `url` querystring params does not match the correct format'
					)
					.end(
						'`url` querystring params does not match the correct format',
						true
					)
				res.writableEnded = true // disable to write
			}

			if (!res.writableEnded) {
				const params = new URLSearchParams()
				params.append('urlTesting', urlParam)

				const requestUrl =
					(_InitEnv.PROCESS_ENV.BASE_URL.includes('localhost')
						? _constants.TARGET_OPTIMAL_URL
						: _InitEnv.PROCESS_ENV.BASE_URL) + `?${params.toString()}`

				const result = await _utils.fetchData.call(void 0, requestUrl, {
					method: 'GET',
					headers: {
						Accept: 'text/html; charset=utf-8',
						'User-Agent':
							'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/118.0.0.0 Safari/537.36',
					},
					timeout: 'infinite',
				})

				if (result.status !== 200) {
					if (!res.writableEnded) {
						totalRequests = totalRequests > 0 ? totalRequests - 1 : 0
						res.cork(() => {
							const statusMessage = result.message || 'Internal Server Error'
							res
								.writeHeader('Access-Control-Allow-Origin', '*') // Ensure header is sent in the final response
								.writeStatus(`${result.status} ${statusMessage}`)
								.end(statusMessage, true) // end the request
							res.writableEnded = true // disable to write
						})
					}
				}

				if (!res.writableEnded) {
					const lighthouseResult = await Promise.all([
						new Promise((res) => {
							_utils.fetchData
								.call(
									void 0,
									`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${urlParam}&strategy=mobile&category=ACCESSIBILITY&category=BEST_PRACTICES&category=PERFORMANCE&category=SEO`,
									{
										timeout: 'infinite',
									}
								)
								.then((response) => {
									if (response.status === 200) {
										res(response.data.lighthouseResult)
									} else {
										res(undefined)
									}
								})
								.catch(() => res(undefined))
						}),
						new Promise((res) => {
							_utils.fetchData
								.call(
									void 0,
									`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${requestUrl}&strategy=mobile&category=ACCESSIBILITY&category=BEST_PRACTICES&category=PERFORMANCE&category=SEO`,
									{
										timeout: 'infinite',
									}
								)
								.then((response) => {
									if (response.status === 200) {
										res(response.data.lighthouseResult)
									} else {
										res(undefined)
									}
								})
								.catch(() => res(undefined))
						}),
						// { pageSpeedUrl: '' },
						// { pageSpeedUrl: '' },
						_worker.getPageSpeedUrl.call(void 0, urlParam),
						_worker.getPageSpeedUrl.call(void 0, requestUrl),
					])

					const lighthouseResponse = await (async () => {
						if (!lighthouseResult) return {}
						const tmpLighthouseResponse = {
							image: '',
							original: {
								pageSpeedUrl: _nullishCoalesce(
									_optionalChain([
										lighthouseResult,
										'access',
										(_) => _[2],
										'optionalAccess',
										(_2) => _2.pageSpeedUrl,
									]),
									() => ''
								),
								info: [],
							},
							optimal: {
								pageSpeedUrl: _nullishCoalesce(
									_optionalChain([
										lighthouseResult,
										'access',
										(_3) => _3[3],
										'optionalAccess',
										(_4) => _4.pageSpeedUrl,
									]),
									() => ''
								),
								info: [],
							},
						}

						await Promise.all([
							new Promise((res) => {
								if (lighthouseResult[0] && lighthouseResult[0].categories) {
									const categories = Object.values(
										lighthouseResult[0].categories
									)

									for (const category of categories) {
										tmpLighthouseResponse.original.info.push({
											title: category.title,
											score: (category.score || 0) * 100,
										})
									}

									res(null)
								} else {
									res(null)
								}
							}),
							new Promise((res) => {
								if (lighthouseResult[1] && lighthouseResult[1].categories) {
									const categories = Object.values(
										lighthouseResult[1].categories
									)

									for (const category of categories) {
										tmpLighthouseResponse.optimal.info.push({
											title: category.title,
											score: (category.score || 0) * 100,
										})
									}

									res(null)
								} else {
									res(null)
								}
							}),
						])

						return tmpLighthouseResponse
					})()

					totalRequests = totalRequests > 0 ? totalRequests - 1 : 0

					if (!res.writableEnded) {
						res.cork(() => {
							res
								.writeHeader('Access-Control-Allow-Origin', '*') // Ensure header is sent in the final response
								.writeStatus('200 OK')
								.end(JSON.stringify(lighthouseResponse)) // end the request
						})
						res.writableEnded = true // disable to write
					}
				}
			}
		})
	} // _allRequestHandler

	return {
		init(app) {
			if (!app) return _ConsoleHandler2.default.warn('You need provide app!')
			_app = app
			_allRequestHandler()
		},
	}
})()

exports.default = apiLighthouse
