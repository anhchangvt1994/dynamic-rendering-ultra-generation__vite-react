"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _zlib = require('zlib');
var _serverconfig = require('../server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);
var _ConsoleHandler = require('../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _InitEnv = require('../utils/InitEnv');
var _FetchManager = require('./utils/FetchManager');
var _HostHealth = require('./utils/HostHealth');
var _StringHelper = require('./utils/StringHelper');
var _constants = require('../constants');
var _CrawlProfile = require('../puppeteer-ssr/utils/CrawlProfile');

const {
  compressData,
  getData: getDataCache,
  getStore: getStoreCache,
  removeData: removeDataCache,
  setData: setDataCache,
  setStore: setStoreCache,
} = _InitEnv.PROCESS_ENV.REDIS
  ? require('./utils/CacheManager/redis/utils')
  : require('./utils/CacheManager')

const { getDataCompression } = _InitEnv.PROCESS_ENV.REDIS
  ? require('./utils/CacheManager/redis/utils')
  : require('./utils/CacheManager/utils')


// NOTE - The compressed data must be there at once (the file cache polls a
// missing file for 7s): otherwise the render calls the upstream API
const CACHED_DATA_WAIT = 100

const _getFreshCachedResult = async (requestInfo) => {
  try {
    const apiCache = await getDataCache(requestInfo.cacheKey)
    const cache = _optionalChain([apiCache, 'optionalAccess', _2 => _2.cache])

    if (!cache || cache.status !== 200 || apiCache.status === 'fetch') return

    const aliveTime = Date.now() - new Date(apiCache.changedAt).getTime()
    if (
      requestInfo.renewTime !== 'infinite' &&
      !(aliveTime < requestInfo.renewTime)
    )
      return

    const data = await Promise.race([
      getDataCompression(requestInfo.cacheKey, 'br'),
      new Promise((res) => setTimeout(res, CACHED_DATA_WAIT)),
    ])

    if (!data) return

    return {
      cookies: cache.cookies,
      status: 200,
      statusMessage: cache.message,
      body: _zlib.brotliDecompressSync.call(void 0, data),
    }
  } catch (err) {
    _ConsoleHandler2.default.error(err)
  }
} // _getFreshCachedResult

const convertData = (
  result



,
  contentEncoding
) => {
  // NOTE - Every response is sent with the negotiated Content-Encoding header,
  // so error bodies (404…) must be compressed too: an uncompressed 404 under
  // "Content-Encoding: br" fails to decode in the browser (ERR_CONTENT_DECODING_FAILED)
  // and the client sees a network error instead of "not found".
  const payload =
    result.status === 200
      ? result.data
      : typeof result.data === 'string'
        ? result.data
        : JSON.stringify(result.data || {})

  return contentEncoding === 'br'
    ? _zlib.brotliCompressSync.call(void 0, payload, _constants.BROTLI_OPTIONS)
    : contentEncoding === 'gzip'
      ? _zlib.gzipSync.call(void 0, payload)
      : payload
} // convertData

const apiService = async (req) => {
  const apiInfo =
    _nullishCoalesce(_optionalChain([/requestInfo=(?<requestInfo>[^&]*)/, 'access', _3 => _3.exec, 'call', _4 => _4(req.url()), 'optionalAccess', _5 => _5.groups]), () => ( {}))

  if (!apiInfo)
    return {
      status: 500,
      body: 'Internal Server Error',
    }

  const requestInfo = (() => {
    let result
    try {
      result = _StringHelper.decodeRequestInfo.call(void 0, apiInfo.requestInfo || '')
    } catch (err) {
      _ConsoleHandler2.default.error(err)
    }

    return result
  })()

  if (!requestInfo || !requestInfo.baseUrl || !requestInfo.endpoint) {
    return {
      status: 500,
      body: 'Internal Server Error',
    }
  }

  // NOTE - Handle method
  const method = req.method()
  // NOTE - Handle header information
  const headers = new Headers()

  const objHeaders = {}

  Object.entries(req.headers()).forEach(([key, value]) => {
    if (value instanceof Array) {
      value.forEach((item) => {
        headers.append(key, item)
        objHeaders[key] = item
      })
    } else {
      headers.append(key, value )
      objHeaders[key] = value
    }
  })

  // NOTE - Setup secret key for API's header info
  const apiServerConfigInfo = _serverconfig2.default.api.list[requestInfo.baseUrl]

  if (apiServerConfigInfo && apiServerConfigInfo.headers) {
    for (const key in apiServerConfigInfo.headers) {
      headers.append(key, apiServerConfigInfo.headers[key])
      objHeaders[key] = apiServerConfigInfo.headers[key]
    }
  }

  // NOTE - Handle query string information
  const strQueryString = (() => {
    const thisAPIQueryString = _optionalChain([req
, 'access', _6 => _6.url, 'call', _7 => _7()
, 'access', _8 => _8.split, 'call', _9 => _9('?'), 'access', _10 => _10[1]
, 'optionalAccess', _11 => _11.replace, 'call', _12 => _12(/requestInfo=([^&]*)/g, '')])

    if (!thisAPIQueryString) return ''

    let targetAPIQueryString = requestInfo.endpoint.split('?')[1]

    if (!targetAPIQueryString) return `?${thisAPIQueryString}`

    const arrThisAPIQueryString = thisAPIQueryString.split('&')

    for (const item of arrThisAPIQueryString) {
      if (!item || targetAPIQueryString.includes(item)) continue
      targetAPIQueryString += `&${item}`
    }

    return `?${targetAPIQueryString}`
  })()

  // NOTE - Handle Post request Body
  let body = method.toUpperCase() !== 'GET' ? await req.postData() : undefined

  if (apiServerConfigInfo && apiServerConfigInfo.body && body) {
    body = JSON.stringify({
      ...apiServerConfigInfo.body,
      ...JSON.parse(body ),
    }) 
  }

  const enableCache =
    requestInfo.cacheKey &&
    (requestInfo.expiredTime > 0 || requestInfo.expiredTime === 'infinite')

  // NOTE - Handle API Store
  // NOTE - when enableStore, system will store it, but when the client set enableStore to false, system have to remove it. So we must recalculate in each
  if (requestInfo.enableStore) {
    const apiStore = await getStoreCache(requestInfo.storeKey, {
      autoCreateIfEmpty: { enable: true },
    })
    if (!apiStore || !apiStore.data) {
      setStoreCache(requestInfo.storeKey, [requestInfo.cacheKey])
    } else if (!apiStore.data.includes(requestInfo.cacheKey)) {
      apiStore.data.push(requestInfo.cacheKey)

      setStoreCache(requestInfo.storeKey, apiStore.data)
    }
  } else if (requestInfo.storeKey) {
    const apiStore = await getStoreCache(requestInfo.storeKey, {
      autoCreateIfEmpty: { enable: true },
    })
    // NOTE - undefined when the cache store is unavailable (redis down)
    const tmpAPIStoreData = _optionalChain([apiStore, 'optionalAccess', _13 => _13.data])

    if (tmpAPIStoreData) {
      const indexNext = tmpAPIStoreData.indexOf(requestInfo.cacheStore)

      tmpAPIStoreData.splice(indexNext, 1)

      setStoreCache(requestInfo.storeKey, tmpAPIStoreData)
    }
  }

  // NOTE - Handle API Cache
  // if (enableCache) {
  //   const apiCache = await getDataCache(requestInfo.cacheKey)

  //   if (apiCache) {
  //     const curTime = Date.now()
  //     if (
  //       apiCache.cache.status !== 200 ||
  //       (requestInfo.expiredTime !== 'infinite' &&
  //         curTime - new Date(apiCache.requestedAt).getTime() >=
  //           requestInfo.expiredTime)
  //     ) {
  //       removeDataCache(requestInfo.cacheKey)
  //     } else {
  //       const aliveTime = curTime - new Date(apiCache.changedAt).getTime()

  //       if (aliveTime > 5000 && apiCache.status !== 'ready') {
  //         updateDataCacheStatus(requestInfo.cacheKey, 'ready')
  //       }

  //       if (
  //         ((requestInfo.renewTime !== 'infinite' &&
  //           aliveTime >= requestInfo.renewTime) ||
  //           !apiCache.cache ||
  //           apiCache.cache.status !== 200) &&
  //         apiCache.status !== 'fetch'
  //       ) {
  //         const apiCache = await getDataCache(requestInfo.cacheKey)

  //         if (!apiCache || apiCache.status !== 'fetch') {
  //           updateDataCacheStatus(requestInfo.cacheKey, 'fetch')

  //           const fetchUrl = `${requestInfo.baseUrl}${requestInfo.endpoint}${strQueryString}`

  //           fetchData(fetchUrl, {
  //             method,
  //             headers: objHeaders,
  //             body,
  //           }).then(({ data, ...result }) => {
  //             const enableToSetCache =
  //               result.status === 200 ||
  //               !apiCache.cache ||
  //               apiCache.cache.status !== 200
  //             if (enableToSetCache) {
  //               setDataCache(
  //                 requestInfo.cacheKey,
  //                 {
  //                   url: fetchUrl,
  //                   method,
  //                   body,
  //                   headers: objHeaders,
  //                   cache: {
  //                     expiredTime: requestInfo.expiredTime,
  //                     ...result,
  //                   },
  //                 },
  //                 {
  //                   isCompress: false,
  //                 }
  //               )

  //               compressData(requestInfo.cacheKey, data)
  //             }
  //           })
  //         }
  //       }

  //       let cache = apiCache.cache

  //       if (!cache) cache = await fetchCache(requestInfo.cacheKey)

  //       const data = await getDataCompression(
  //         requestInfo.cacheKey,
  //         contentEncoding as any
  //       )

  //       return {
  //         status: cache.status,
  //         contentType: 'application/json',
  //         headers: Object.assign({}, req.headers(), {
  //           'Content-Encoding': contentEncoding,
  //         }),
  //         body: data,
  //       }
  //     } // IF expiredTime is valid
  //   } // IF has apiCache
  // } // IF enableCache

  // NOTE - Render with the cached API data while it is fresh (younger than
  // renewTime) instead of calling the upstream API on every render
  if (enableCache && method.toUpperCase() === 'GET') {
    const cachedResult = await _getFreshCachedResult(requestInfo)
    if (cachedResult) return cachedResult
  }

  // NOTE - Marked by the renders only: an upstream API still pending after
  // requestTimeoutMs (the render does not wait for it longer). The next renders
  // then skip it at once instead of waiting requestTimeoutMs each, until the
  // 10s fetch timeout marks the host down for the API proxy too
  const renderDownHost = `render:${requestInfo.baseUrl}`

  if (_HostHealth.isHostDown.call(void 0, requestInfo.baseUrl) || _HostHealth.isHostDown.call(void 0, renderDownHost))
    return {
      status: 503,
      body: '{}',
    }

  const fetchUrl = `${requestInfo.baseUrl}${requestInfo.endpoint}${strQueryString}`
  const fetchAPITarget = _FetchManager.fetchData.call(void 0, fetchUrl, {
    method,
    headers: objHeaders,
    body,
  })

  if (enableCache) {
    setDataCache(requestInfo.cacheKey, '', {
      isCompress: false,
      status: 'fetch',
    })
  } else removeDataCache(requestInfo.cacheKey)

  const slowFetchTimeout = setTimeout(
    () => _HostHealth.setHostDown.call(void 0, renderDownHost, true),
    _CrawlProfile.CRAWL_WAIT_OPTIONS.requestTimeoutMs
  )
  const result = await fetchAPITarget
  clearTimeout(slowFetchTimeout)

  _HostHealth.setHostDown.call(void 0, requestInfo.baseUrl, result.status === 408)
  if (result.status !== 408) _HostHealth.setHostDown.call(void 0, renderDownHost, false)

  const data = convertData(result, '')
  const { data: _, ...resultToSave } = result

  if (enableCache) {
    setDataCache(
      requestInfo.cacheKey,
      {
        url: fetchUrl,
        method,
        body,
        headers: objHeaders,
        cache: {
          expiredTime: requestInfo.expiredTime,
          ...resultToSave,
        },
      },
      {
        isCompress: false,
      }
    )

    compressData(requestInfo.cacheKey, result.data)
  }

  if (requestInfo.relativeCacheKey.length) {
    _FetchManager.refreshData.call(void 0, requestInfo.relativeCacheKey)
  }

  return {
    cookies: result.cookies,
    status: result.status,
    statusMessage: result.message,
    body: data,
  }
}

exports. default = apiService
