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

var _utils = require('./utils/CacheManager/utils')
var _ConsoleHandler = require('../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _StringHelper = require('../utils/StringHelper')
var _serverconfig = require('../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)
var _FetchManager = require('./utils/FetchManager')
var _indexuws = require('./routes/lighthouse/index.uws')
var _indexuws2 = _interopRequireDefault(_indexuws)

const handleArrayBuffer = (message) => {
	if (message instanceof ArrayBuffer) {
		const decoder = new TextDecoder()
		return decoder.decode(message)
	}
	return message
}

const fetchCache = (() => {
	return (cacheKey) =>
		new Promise((res) => {
			setTimeout(async () => {
				const apiCache = await _utils.getData.call(void 0, cacheKey)

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
		_app.all('/api', async function (res, req) {
			res.onAborted(() => {
				res.writableEnded = true
				_ConsoleHandler2.default.log('Request aborted')
			})

			// NOTE - Handle the Content-Encoding
			const contentEncoding = (() => {
				const tmpHeaderAcceptEncoding = req.getHeader('accept-encoding') || ''
				if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
				else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
				return ''
			})()

			// NOTE - Get the API information
			const apiInfo = _nullishCoalesce(
				_optionalChain([
					/requestInfo=(?<requestInfo>[^&]*)/,
					'access',
					(_) => _.exec,
					'call',
					(_2) => _2(req.getQuery()),
					'optionalAccess',
					(_3) => _3.groups,
				]),
				() => ({})
			)

			// NOTE - Response 500 Error if the apiInfo is empty
			if (!res.writableEnded && !apiInfo) {
				res.writableEnded = true
				res
					.writeStatus('500')
					.writeHeader('Content-Type', 'application/json')
					.writeHeader('Cache-Control', 'no-store')
					.end('Internal Server Error', true)
			}

			// NOTE - Get the Request information
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

			// NOTE - Response 500 Error if the requestInfo is empty
			if (
				!res.writableEnded &&
				(!requestInfo || !requestInfo.baseUrl || !requestInfo.endpoint)
			) {
				res.writableEnded = true
				res
					.writeStatus('500')
					.writeHeader('Content-Type', 'application/json')
					.writeHeader('Cache-Control', 'no-store')
					.end('Internal Server Error', true)
			}

			if (!res.writableEnded) {
				// NOTE - Handle method
				const method = req.getMethod()
				// NOTE - Handle header information
				const headers = new Headers()
				const objHeaders = {}
				req.forEach((key, value) => {
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
						(_4) => _4.getUrl,
						'call',
						(_5) => _5(),
						'access',
						(_6) => _6.split,
						'call',
						(_7) => _7('?'),
						'access',
						(_8) => _8[1],
						'optionalAccess',
						(_9) => _9.replace,
						'call',
						(_10) => _10(/requestInfo=([^&]*)/g, ''),
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
				const body = await new Promise((response) => {
					res.onData((data) => {
						response(handleArrayBuffer(data) || undefined)
					})
				})

				const enableCache =
					requestInfo.cacheKey &&
					(requestInfo.expiredTime > 0 ||
						requestInfo.expiredTime === 'infinite')

				// NOTE - Handle API Store
				// NOTE - when enableStore, system will store it, but when the client set enableStore to false, system have to remove it. So we must recalculate in each
				if (requestInfo.enableStore) {
					const apiStore = await _utils.getStore.call(
						void 0,
						requestInfo.storeKey,
						{
							autoCreateIfEmpty: { enable: true },
						}
					)
					if (!apiStore || !apiStore.data) {
						_utils.setStore.call(void 0, requestInfo.storeKey, [
							requestInfo.cacheKey,
						])
					} else if (!apiStore.data.includes(requestInfo.cacheKey)) {
						apiStore.data.push(requestInfo.cacheKey)

						_utils.setStore.call(void 0, requestInfo.storeKey, apiStore.data)
					}
				} else if (requestInfo.storeKey) {
					const apiStore = await _utils.getStore.call(
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

						_utils.setStore.call(void 0, requestInfo.storeKey, tmpAPIStoreData)
					}
				}

				// NOTE - Handle API Cache
				if (enableCache) {
					const apiCache = await _utils.getData.call(
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
							_utils.removeData.call(void 0, requestInfo.cacheKey)
						} else {
							if (
								((requestInfo.renewTime !== 'infinite' &&
									curTime - new Date(apiCache.updatedAt).getTime() >=
										requestInfo.renewTime) ||
									!apiCache.cache ||
									apiCache.cache.status !== 200) &&
								apiCache.status !== 'fetch'
							) {
								_utils.updateDataStatus.call(
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
											_utils.setData.call(void 0, requestInfo.cacheKey, {
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

							if (!res.writableEnded) {
								res.writableEnded = true
								res.cork(() => {
									res
										.writeStatus(
											`${cache.status}${
												cache.message ? ' ' + cache.message : ''
											}`
										)
										.writeHeader('Content-Type', 'application/json')
										.writeHeader('Cache-Control', 'no-store')
										.writeHeader('Content-Encoding', contentEncoding)
										.end(data, true)
								})
							}
						} // IF expiredTime is valid
					} // IF has apiCache
				} // IF requestInfo.expiredTime > 0

				if (!res.writableEnded) {
					const fetchUrl = `${requestInfo.baseUrl}${requestInfo.endpoint}${strQueryString}`

					const fetchAPITarget = _FetchManager.fetchData.call(
						void 0,
						fetchUrl,
						{
							method,
							headers,
							body,
						}
					)

					if (enableCache) {
						_utils.setData.call(void 0, requestInfo.cacheKey, '', {
							isCompress: true,
							status: 'fetch',
						})
					} else _utils.removeData.call(void 0, requestInfo.cacheKey)

					const result = await fetchAPITarget

					const data = convertData(result, contentEncoding)

					if (enableCache) {
						_utils.setData.call(void 0, requestInfo.cacheKey, {
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

					if (!res.writAbleEnded) {
						res.writAbleEnded = true
						try {
							res.cork(() => {
								if (result.cookies && result.cookies.length) {
									for (const cookie of result.cookies) {
										res.writeHeader('Set-Cookie', cookie)
									}
								}
								res
									.writeStatus(
										`${result.status}${
											result.message ? ' ' + result.message : ''
										}`
									)
									.writeHeader('Content-Type', 'application/json')
									.writeHeader('Cache-Control', 'no-store')
									.writeHeader('Content-Encoding', contentEncoding)
									.end(data, true)
							})
						} catch (err) {
							_ConsoleHandler2.default.error(err)
						}
					}
				}
			} // IF !res.writableEnded
		})
	}

	return {
		init(app) {
			if (!app)
				return _ConsoleHandler2.default.warn(
					'You need provide uWebsockets app!'
				)

			// NOTE - Handle API Lighthouse
			_indexuws2.default.init(app)

			_app = {
				all: (pattern, handler) => {
					app.get(pattern, handler)
					app.post(pattern, handler)
					app.put(pattern, handler)
					app.patch(pattern, handler)
					app.del(pattern, handler)
				},
			}
			_allRequestHandler()
		},
	}
})()

exports.default = apiService
