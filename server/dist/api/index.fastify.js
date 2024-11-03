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
var _serverconfig = require('../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)
var _ConsoleHandler = require('../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _StringHelper = require('../utils/StringHelper')

var _CacheManager = require('./utils/CacheManager')
var _FetchManager = require('./utils/FetchManager')

const fetchCache = (() => {
	return (cacheKey) =>
		new Promise((res) => {
			setTimeout(async () => {
				const apiCache = await _CacheManager.getData.call(void 0, cacheKey)

				if (apiCache.cache) res(apiCache.cache)
				else {
					const tmpCache = await fetchCache(cacheKey)
					res(tmpCache)
				}
			}, 10)
		})
})() // fetchCache

const convertData = (
	result,

	contentEncoding
) => {
	switch (true) {
		case result.status === 200:
			return contentEncoding === 'br'
				? _zlib.brotliCompressSync.call(void 0, JSON.stringify(result.data))
				: contentEncoding === 'gzip'
				? _zlib.gzipSync.call(void 0, JSON.stringify(result.data))
				: JSON.stringify(result.data)
		default:
			return typeof result.data === 'string'
				? result.data
				: JSON.stringify(result.data || {})
	}
} // convertData

const apiService = (async () => {
	let _app

	const _allRequestHandler = () => {
		_app.all('/api', async function (req, res) {
			const apiInfo = _nullishCoalesce(
				_optionalChain([
					/requestInfo=(?<requestInfo>[^&]*)/,
					'access',
					(_) => _.exec,
					'call',
					(_2) => _2(req.url),
					'optionalAccess',
					(_3) => _3.groups,
				]),
				() => ({})
			)

			if (!apiInfo) return res.status(500).send('Internal Server Error')

			const requestInfo = (() => {
				let result
				try {
					result = JSON.parse(
						_StringHelper.decode.call(void 0, apiInfo.requestInfo || '')
					)
				} catch (err) {
					_ConsoleHandler2.default.error(err)
				}

				return result
			})()

			if (!requestInfo || !requestInfo.baseUrl || !requestInfo.endpoint)
				return res.status(500).send('Internal Server Error')

			// NOTE - Handle the Content-Encoding
			const contentEncoding = (() => {
				const tmpHeaderAcceptEncoding = req.headers['accept-encoding'] || ''
				if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
				else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
				return ''
			})()

			// NOTE - Write Response Header information
			res.raw.setHeader('Content-Type', 'application/json')
			res.raw.setHeader('Cache-Control', 'no-store')
			res.raw.setHeader('Content-Encoding', contentEncoding)

			// NOTE - Handle method
			const method = req.method
			// NOTE - Handle header information
			const headers = new Headers()
			const objHeaders = {}
			Object.entries(req.headers).forEach(([key, value]) => {
				if (value instanceof Array) {
					value.forEach((item) => {
						headers.append(key, item)
						objHeaders[key] = item
					})
				} else {
					headers.append(key, value)
					objHeaders[key] = value
				}
			})

			// NOTE - Setup secret key for API's header info
			const apiServerConfigInfo =
				_serverconfig2.default.api.list[requestInfo.baseUrl]

			if (apiServerConfigInfo) {
				headers.append(
					apiServerConfigInfo.headerSecretKeyName,
					apiServerConfigInfo.secretKey
				)
				objHeaders[apiServerConfigInfo.headerSecretKeyName] =
					apiServerConfigInfo.secretKey
			}

			// NOTE - Handle query string information
			const strQueryString = (() => {
				const thisAPIQueryString = _optionalChain([
					req,
					'access',
					(_4) => _4.url,
					'access',
					(_5) => _5.split,
					'call',
					(_6) => _6('?'),
					'access',
					(_7) => _7[1],
					'optionalAccess',
					(_8) => _8.replace,
					'call',
					(_9) => _9(/requestInfo=([^&]*)/g, ''),
				])

				if (!thisAPIQueryString) return ''

				let targetAPIQueryString = requestInfo.apiEndpoint.split('?')[1]

				if (!targetAPIQueryString) return `?${thisAPIQueryString}`

				const arrThisAPIQueryString = thisAPIQueryString.split('&')

				for (const item of arrThisAPIQueryString) {
					if (!item || targetAPIQueryString.includes(item)) continue
					targetAPIQueryString += `&${item}`
				}

				return `?${targetAPIQueryString}`
			})()
			// NOTE - Handle Post request Body
			const body = req.body

			const enableCache =
				requestInfo.cacheKey &&
				(requestInfo.expiredTime > 0 || requestInfo.expiredTime === 'infinite')

			// NOTE - Handle API Store
			// NOTE - when enableStore, system will store it, but when the client set enableStore to false, system have to remove it. So we must recalculate in each
			if (requestInfo.enableStore) {
				const apiStore = await _CacheManager.getStore.call(
					void 0,
					requestInfo.storeKey,
					{
						autoCreateIfEmpty: { enable: true },
					}
				)
				if (!apiStore || !apiStore.data) {
					_CacheManager.setStore.call(void 0, requestInfo.storeKey, [
						requestInfo.cacheKey,
					])
				} else if (!apiStore.data.includes(requestInfo.cacheKey)) {
					apiStore.data.push(requestInfo.cacheKey)

					_CacheManager.setStore.call(
						void 0,
						requestInfo.storeKey,
						apiStore.data
					)
				}
			} else if (requestInfo.storeKey) {
				const apiStore = await _CacheManager.getStore.call(
					void 0,
					requestInfo.storeKey,
					{
						autoCreateIfEmpty: { enable: true },
					}
				)
				const tmpAPIStoreData = apiStore.data

				if (tmpAPIStoreData) {
					const indexNext = tmpAPIStoreData.indexOf(requestInfo.cacheStore)

					tmpAPIStoreData.splice(indexNext, 1)

					_CacheManager.setStore.call(
						void 0,
						requestInfo.storeKey,
						tmpAPIStoreData
					)
				}
			}

			// NOTE - Handle API Cache
			if (enableCache) {
				const apiCache = await _CacheManager.getData.call(
					void 0,
					requestInfo.cacheKey
				)

				if (apiCache) {
					const curTime = Date.now()
					if (
						requestInfo.expiredTime !== 'infinite' &&
						curTime - new Date(apiCache.requestedAt).getTime() >=
							requestInfo.expiredTime
					) {
						_CacheManager.removeData.call(void 0, requestInfo.cacheKey)
					} else {
						if (
							((requestInfo.renewTime !== 'infinite' &&
								curTime - new Date(apiCache.updatedAt).getTime() >=
									requestInfo.renewTime) ||
								!apiCache.cache ||
								apiCache.cache.status !== 200) &&
							apiCache.status !== 'fetch'
						) {
							_CacheManager.updateDataStatus.call(
								void 0,
								requestInfo.cacheKey,
								'fetch'
							)

							const fetchUrl = `${requestInfo.baseUrl}${requestInfo.endpoint}${strQueryString}`

							_FetchManager.fetchData
								.call(void 0, fetchUrl, {
									method,
									headers,
									body,
								})
								.then((result) => {
									const enableToSetCache =
										result.status === 200 ||
										!apiCache.cache ||
										apiCache.cache.status !== 200
									if (enableToSetCache) {
										_CacheManager.setData.call(void 0, requestInfo.cacheKey, {
											url: fetchUrl,
											method,
											body,
											headers: objHeaders,
											cache: {
												expiredTime: requestInfo.expiredTime,
												...result,
											},
										})
									}
								})
						}

						let cache = apiCache.cache

						if (!cache) cache = await fetchCache(requestInfo.cacheKey)

						const data = convertData(cache, contentEncoding)

						res.raw.statusMessage = cache.message || res.raw.statusMessage

						return res.status(cache.status).send(data)
					} // IF expiredTime is valid
				} // IF has apiCache
			} // IF requestInfo.expiredTime > 0

			const fetchUrl = `${requestInfo.baseUrl}${requestInfo.endpoint}${strQueryString}`
			const fetchAPITarget = _FetchManager.fetchData.call(void 0, fetchUrl, {
				method,
				headers,
				body,
			})

			if (enableCache) {
				_CacheManager.setData.call(void 0, requestInfo.cacheKey, '', {
					isCompress: true,
					status: 'fetch',
				})
			} else _CacheManager.removeData.call(void 0, requestInfo.cacheKey)

			const result = await fetchAPITarget
			const data = convertData(result, contentEncoding)

			if (enableCache) {
				_CacheManager.setData.call(void 0, requestInfo.cacheKey, {
					url: fetchUrl,
					method,
					body,
					headers: objHeaders,
					cache: {
						expiredTime: requestInfo.expiredTime,
						...result,
					},
				})
			}

			if (requestInfo.relativeCacheKey.length) {
				_FetchManager.refreshData.call(void 0, requestInfo.relativeCacheKey)
			}

			if (result.cookies && result.cookies.length) {
				res.raw.setHeader('Set-Cookie', result.cookies)
			}

			res.raw.statusMessage = result.message || res.raw.statusMessage

			res.status(result.status).send(data)
		})
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

exports.default = apiService
