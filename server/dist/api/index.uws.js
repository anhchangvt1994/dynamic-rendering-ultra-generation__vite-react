"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }





var _serverconfig = require('../server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);
var _MemoryCache = require('../utils/MemoryCache'); var _MemoryCache2 = _interopRequireDefault(_MemoryCache);
var _ConsoleHandler = require('../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _InitEnv = require('../utils/InitEnv');
var _ResourceBudget = require('../utils/ResourceBudget');
var _crypto = require('crypto');
var _indexuws = require('./routes/lighthouse/index.uws'); var _indexuws2 = _interopRequireDefault(_indexuws);
var _FetchManager = require('./utils/FetchManager');
var _HostHealth = require('./utils/HostHealth');
var _StringHelper = require('./utils/StringHelper');

const {
  compressData,
  setData: setDataCache,
  setStore: setStoreCache,
} = _InitEnv.PROCESS_ENV.REDIS
  ? require('./utils/CacheManager/redis/utils')
  : require('./utils/CacheManager')

const {
  getData: getDataCache,
  getDataCompression,
  getStore: getStoreCache,
  removeData: removeDataCache,
  updateDataStatus: updateDataCacheStatus,
} = _InitEnv.PROCESS_ENV.REDIS
  ? require('./utils/CacheManager/redis/utils')
  : require('./utils/CacheManager/utils')

const API_RESPONSE_CACHE_TTL =
  Number(_InitEnv.PROCESS_ENV.API_RESPONSE_CACHE_TTL_MS) || 2000
const apiResponseCache = _MemoryCache2.default({
  ttlMs: API_RESPONSE_CACHE_TTL,
  max: 2000,
  maxBytes: _ResourceBudget.getResourceBudget.call(void 0, _InitEnv.PROCESS_ENV).hotCacheBytes / 4,
  sizeOf: (value) =>
    typeof value.data === 'string'
      ? Buffer.byteLength(value.data)
      : (_nullishCoalesce(_optionalChain([value, 'access', _ => _.data, 'optionalAccess', _2 => _2.byteLength]), () => (
        Buffer.byteLength(JSON.stringify(_nullishCoalesce(value.data, () => ( ''))))))),
})

const handleArrayBuffer = (message) => {
  if (message instanceof ArrayBuffer) {
    const decoder = new TextDecoder()
    return decoder.decode(message)
  }
  return message
}

// NOTE - Wait for the cache of a request that another request is fetching.
// It polls until the fetch timeout: a fetch that never stores its result
// (failed request, cache store down) must not keep the request waiting (each
// recursive wait used to keep its promise chain alive -> heap out of memory)
const FETCH_CACHE_POLL_INTERVAL = 50
const FETCH_CACHE_MAX_WAIT = 10000
// (the wait counts from startedAt: the fetch start of the cache entry)
const fetchCache = async (cacheKey, startedAt = Date.now()) => {
  const deadline = startedAt + FETCH_CACHE_MAX_WAIT

  while (Date.now() < deadline) {
    await new Promise((res) => setTimeout(res, FETCH_CACHE_POLL_INTERVAL))

    const apiCache = await getDataCache(cacheKey)

    if (!apiCache) return null
    if (apiCache.cache) return apiCache.cache
  }

  return null
} // fetchCache

// NOTE - A down upstream host (it just timed out) answers 503 at once: the
// requests waiting for it would hold the browser connections (6 per host) and
// delay the other API requests of the page
const fetchUpstream = async (
  baseUrl,
  url,
  init
) => {
  if (_HostHealth.isHostDown.call(void 0, baseUrl)) return { ..._HostHealth.HOST_DOWN_RESULT } 

  const result = await _FetchManager.fetchData.call(void 0, url, init)
  _HostHealth.setHostDown.call(void 0, baseUrl, result.status === 408)

  return result
} // fetchUpstream

// NOTE - serverTiming: Server-Timing header (DevTools > Network > Timing), it
// tells where the time went (memory / store cache, upstream API, waiting for
// the fetch of another request)
const resEnd = (res, resInfo, serverTiming) => {
  if (!res || !resInfo) return

  const {
    status = '200',
    message = 'OK',
    contentEncoding = '',
    cookies = [],
    data = '',
  } = resInfo

  if (!res.writableEnded) {
    res.writableEnded = true

    res.cork(() => {
      if (cookies && cookies.length) {
        for (const cookie of cookies) {
          res.writeHeader('Set-Cookie', cookie)
        }
      }

      res
        .writeStatus(`${status}${message ? ' ' + message : ''}`)
        .writeHeader('Content-Type', 'application/json')
        .writeHeader('Cache-Control', 'no-store')
      if (contentEncoding) {
        res.writeHeader('Content-Encoding', contentEncoding)
      }
      res.writeHeader('Vary', 'Accept-Encoding')
      if (Number(status) === 503) res.writeHeader('Retry-After', '2')
      if (serverTiming) res.writeHeader('Server-Timing', serverTiming)
      // NOTE - uWS only accepts string / ArrayBuffer / TypedArray, a failed
      // upstream fetch (ex: 408 timeout) returns an object and would crash
      // the whole server
      res.end(
        typeof data === 'string' ||
          data instanceof ArrayBuffer ||
          ArrayBuffer.isView(data)
          ? data
          : JSON.stringify(_nullishCoalesce(data, () => ( '')))
      )
    })
  }
}

const apiService = (async () => {
  let _app






  const _allRequestHandler = () => {
    _app.all('/api', async function (res, req) {
      const startAt = Date.now()
      const getServerTiming = (timing) =>
        `${timing}, total;dur=${Date.now() - startAt}`
      res.onAborted(() => {
        res.writableEnded = true
        _ConsoleHandler2.default.log('Request aborted')
      })

      // NOTE - Handle the Content-Encoding
      let contentEncoding = (() => {
        const tmpHeaderAcceptEncoding = req.getHeader('accept-encoding') || ''
        if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
        else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
        return '' 
      })()

      // NOTE - A cached API response (GET, 200) is served from memory during
      // API_RESPONSE_CACHE_TTL: no decoding, no cache store reads / writes, no
      // parsing on every request
      const apiResponseKey =
        req.getMethod() === 'get'
          ? `${req.getUrl()}?${req.getQuery()}|${contentEncoding}|${_crypto.createHash.call(void 0, 
              'sha256'
            )
              .update(
                JSON.stringify([
                  req.getHeader('authorization'),
                  req.getHeader('cookie'),
                  req.getHeader('accept-language'),
                  req.getHeader('lang'),
                ])
              )
              .digest('hex')}`
          : undefined
      const apiResponse = apiResponseKey
        ? apiResponseCache.get(apiResponseKey)
        : undefined

      if (apiResponse)
        return resEnd(res, apiResponse, getServerTiming('cache;desc="memory"'))

      // NOTE - Get the API information
      const apiInfo =
        _nullishCoalesce(_optionalChain([/requestInfo=(?<requestInfo>[^&]*)/, 'access', _3 => _3.exec, 'call', _4 => _4(req.getQuery()), 'optionalAccess', _5 => _5.groups]), () => ( {}))

      // NOTE - Response 500 Error if the apiInfo is empty
      if (!res.writableEnded && !apiInfo) {
        res.writableEnded = true
        res
          .writeStatus('500')
          .writeHeader('Content-Type', 'application/json')
          .writeHeader('Cache-Control', 'no-store')
          .end('Internal Server Error')
      }

      // NOTE - Get the Request information
      const requestInfo = (() => {
        let result
        try {
          result = _StringHelper.decodeRequestInfo.call(void 0, apiInfo.requestInfo || '')
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
          .end('Internal Server Error')
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
, 'access', _6 => _6.getUrl, 'call', _7 => _7()
, 'access', _8 => _8.split, 'call', _9 => _9('?'), 'access', _10 => _10[1]
, 'optionalAccess', _11 => _11.replace, 'call', _12 => _12(/requestInfo=([^&]*)/g, '')])

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
        let body = await new Promise(
          (response) => {
            res.onData((data) => {
              response(handleArrayBuffer(data) || undefined)
            })
          }
        )

        if (apiServerConfigInfo && apiServerConfigInfo.body && body) {
          body = JSON.stringify({
            ...apiServerConfigInfo.body,
            ...JSON.parse(body ),
          }) 
        }

        const enableCache =
          requestInfo.cacheKey &&
          (requestInfo.expiredTime > 0 ||
            requestInfo.expiredTime === 'infinite')

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
        if (enableCache) {
          const apiCache = await getDataCache(requestInfo.cacheKey)

          if (apiCache) {
            const curTime = Date.now()
            if (
              requestInfo.expiredTime !== 'infinite' &&
              curTime - new Date(apiCache.requestedAt).getTime() >=
                requestInfo.expiredTime
            ) {
              removeDataCache(requestInfo.cacheKey)
            } else {
              const aliveTime = curTime - new Date(apiCache.changedAt).getTime()

              if (aliveTime > 5000 && apiCache.status !== 'ready') {
                updateDataCacheStatus(requestInfo.cacheKey, 'ready')
              }

              if (
                ((requestInfo.renewTime !== 'infinite' &&
                  aliveTime >= requestInfo.renewTime) ||
                  !apiCache.cache ||
                  apiCache.cache.status !== 200) &&
                apiCache.status !== 'fetch'
              ) {
                const apiCache = await getDataCache(requestInfo.cacheKey)

                if (!apiCache || apiCache.status !== 'fetch') {
                  updateDataCacheStatus(requestInfo.cacheKey, 'fetch')

                  const fetchUrl = `${requestInfo.baseUrl}${requestInfo.endpoint}${strQueryString}`

                  fetchUpstream(requestInfo.baseUrl, fetchUrl, {
                    method,
                    headers: objHeaders,
                    body,
                  }).then(({ data, ...result }) => {
                    const enableToSetCache =
                      result.status === 200 ||
                      !_optionalChain([apiCache, 'optionalAccess', _14 => _14.cache]) ||
                      apiCache.cache.status !== 200
                    if (enableToSetCache) {
                      setDataCache(
                        requestInfo.cacheKey,
                        {
                          url: fetchUrl,
                          method,
                          body,
                          headers: objHeaders,
                          cache: {
                            expiredTime: requestInfo.expiredTime,
                            ...result,
                          },
                        },
                        {
                          isCompress: false,
                          expiredTime: requestInfo.renewTime,
                        }
                      )

                      compressData(requestInfo.cacheKey, data)
                    }
                  })
                }
              }

              let cache = apiCache.cache

              // NOTE - A placeholder older than the fetch timeout is never filled (ex:
              // the server stopped during the fetch): no wait, fetch below
              const waitStartAt = Date.now()
              if (!cache)
                cache = await fetchCache(
                  requestInfo.cacheKey,
                  new Date(apiCache.changedAt).getTime() || Date.now()
                )
              const waitDuration = Date.now() - waitStartAt

              const data = await getDataCompression(
                requestInfo.cacheKey,
                contentEncoding 
              )

              // if (!data) {
              // data = convertData(cache, contentEncoding)
              // data = JSON.stringify(cache.data)
              //   data = cache.data
              // }

              // NOTE - No cache (ex: redis down): fetch the API below
              if (cache) {
                const resInfo = {
                  status: cache.status,
                  message: cache.message,
                  contentEncoding,
                  cookies: cache.cookies,
                  data,
                }

                if (apiResponseKey && Number(cache.status) === 200 && data)
                  apiResponseCache.set(apiResponseKey, resInfo)

                resEnd(
                  res,
                  resInfo,
                  getServerTiming(
                    waitDuration
                      ? `wait;desc="fetch of another request";dur=${waitDuration}`
                      : 'cache;desc="store"'
                  )
                )
              }
            } // IF expiredTime is valid
          } // IF has apiCache
        } // IF requestInfo.expiredTime > 0

        if (!res.writableEnded) {
          const fetchUrl = `${requestInfo.baseUrl}${requestInfo.endpoint}${strQueryString}`

          const fetchAPITarget = fetchUpstream(requestInfo.baseUrl, fetchUrl, {
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

          const upstreamStartAt = Date.now()
          const { data, ...result } = await fetchAPITarget
          const upstreamTiming =
            result.message === _HostHealth.HOST_DOWN_RESULT.message
              ? 'upstream;desc="host down"'
              : `upstream;dur=${Date.now() - upstreamStartAt}`

          if (enableCache) {
            Promise.all([
              setDataCache(
                requestInfo.cacheKey,
                {
                  url: fetchUrl,
                  method,
                  body,
                  headers: objHeaders,
                  cache: {
                    expiredTime: requestInfo.expiredTime,
                    ...result,
                  },
                },
                {
                  isCompress: false,
                }
              ),

              compressData(requestInfo.cacheKey, data),
            ])
          }

          if (requestInfo.relativeCacheKey.length) {
            _FetchManager.refreshData.call(void 0, requestInfo.relativeCacheKey)
          }

          resEnd(
            res,
            {
              status: result.status,
              message: result.message,
              contentEncoding: '',
              cookies: result.cookies,
              data,
            },
            getServerTiming(upstreamTiming)
          )
        }
      } // IF !res.writableEnded
    })
  }

  return {
    init(app) {
      if (!app) return _ConsoleHandler2.default.warn('You need provide uWebsockets app!')

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

exports. default = apiService
