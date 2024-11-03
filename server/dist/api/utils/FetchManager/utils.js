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
var _zlib = require('zlib')
var _ConsoleHandler = require('../../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _PathHandler = require('../../../utils/PathHandler')

var _utils = require('../CacheManager/utils')

const dataPath = _PathHandler.getDataPath.call(void 0)

const fetchData = async (input, init) => {
	if (!input) {
		_ConsoleHandler2.default.error('URL is required!')
		return { status: 500, data: {}, message: 'URL is required' }
	}

	const response = await new Promise(async (rootResolve) => {
		const timeout = _nullishCoalesce(
			_optionalChain([init, 'optionalAccess', (_) => _.timeout]),
			() => 10000
		)
		if (timeout !== 'infinite') {
			var responseTimeout = setTimeout(() => {
				rootResolve({
					status: 408,
					message: 'Request Timeout',
					data: {},
				})
			}, timeout)
		}

		try {
			const response = await fetch(input, {
				...(init || {}),
			})
				.then(async (res) => {
					if (responseTimeout) clearTimeout(responseTimeout)
					const data = await new Promise(async (resolve) => {
						let tmpData
						const buffer = await res.clone().arrayBuffer()

						try {
							tmpData = _optionalChain([
								_zlib.brotliDecompressSync.call(void 0, buffer),
								'optionalAccess',
								(_2) => _2.toString,
								'call',
								(_3) => _3(),
							])
						} catch (e) {}

						if (!tmpData)
							try {
								tmpData = _optionalChain([
									_zlib.gunzipSync.call(void 0, buffer),
									'optionalAccess',
									(_4) => _4.toString,
									'call',
									(_5) => _5(),
								])
							} catch (e2) {}

						if (!tmpData) {
							const text = await res.clone().text()

							try {
								tmpData = JSON.parse(text)
							} catch (error) {
								tmpData = {}
							}
						} else JSON.parse(tmpData)

						resolve(tmpData)
					})

					return {
						status: res.status,
						message: res.statusText,
						cookies: res.headers.getSetCookie(),
						data,
					}
				})
				.catch((err) => {
					if (responseTimeout) clearTimeout(responseTimeout)
					if (err.name !== 'AbortError') _ConsoleHandler2.default.error(err)
					return {
						status: 500,
						data: {},
						message: 'Server Error',
					}
				})

			rootResolve(response)
		} catch (error) {
			_ConsoleHandler2.default.error(error)
			rootResolve({ status: 500, data: {}, message: 'Server Error' })
		}
	})

	return response
}
exports.fetchData = fetchData // fetchData

const refreshData = async (cacheKeyList) => {
	if (!cacheKeyList || !cacheKeyList.length) return

	const arrRefreshData = []

	for (const cacheKeyItem of cacheKeyList) {
		const apiCache = await _utils.get.call(void 0, dataPath, cacheKeyItem, 'br')

		if (!apiCache || !apiCache.cache || !apiCache.url) continue

		_utils.updateStatus.call(void 0, dataPath, cacheKeyItem, 'br', 'fetch')

		arrRefreshData.push(
			new Promise(async (res) => {
				const headers = new Headers()
				for (const key in apiCache.headers) {
					headers.append(key, apiCache.headers[key])
				}

				await exports.fetchData
					.call(void 0, apiCache.url, {
						method: apiCache.method,
						headers: apiCache.headers,
						body: apiCache.body,
					})
					.then((result) => {
						const cacheResult = apiCache.cache

						const enableToSetCache =
							result.status === 200 ||
							!cacheResult ||
							cacheResult.status !== 200
						if (enableToSetCache) {
							_utils.set.call(void 0, dataPath, cacheKeyItem, 'br', {
								url: apiCache.url,
								method: apiCache.method,
								body: apiCache.body,
								headers: apiCache.headers,
								cache: {
									expiredTime: cacheResult.expiredTime,
									...result,
								},
							})

							res('finish')
						}
					})
			})
		)
	}

	if (arrRefreshData.length) await Promise.all(arrRefreshData)

	return 'finish'
}
exports.refreshData = refreshData // refreshData
