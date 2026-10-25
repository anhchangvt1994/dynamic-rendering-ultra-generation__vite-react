import {
  HttpRequest,
  HttpResponse,
  RecognizedString,
  TemplatedApp,
} from 'uWebSockets.js'
import ServerConfig from '../server.config'
import MemoryCache from '../utils/MemoryCache'
import Console from '../utils/ConsoleHandler'
import { PROCESS_ENV } from '../utils/InitEnv'
import apiLighthouse from './routes/lighthouse/index.uws'
import { fetchData, refreshData } from './utils/FetchManager'
import { HOST_DOWN_RESULT, isHostDown, setHostDown } from './utils/HostHealth'
import { decodeRequestInfo } from './utils/StringHelper'

const {
  compressData,
  setData: setDataCache,
  setStore: setStoreCache,
} = PROCESS_ENV.REDIS
  ? require('./utils/CacheManager/redis/utils')
  : require('./utils/CacheManager')

const {
  getData: getDataCache,
  getDataCompression,
  getStore: getStoreCache,
  removeData: removeDataCache,
  updateDataStatus: updateDataCacheStatus,
} = PROCESS_ENV.REDIS
  ? require('./utils/CacheManager/redis/utils')
  : require('./utils/CacheManager/utils')

const API_RESPONSE_CACHE_TTL =
  Number(PROCESS_ENV.API_RESPONSE_CACHE_TTL_MS) || 2000
const apiResponseCache = MemoryCache<{ [key: string]: any }>({
  ttlMs: API_RESPONSE_CACHE_TTL,
  max: 2000,
})

const handleArrayBuffer = (message: ArrayBuffer | string) => {
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
  baseUrl: string,
  url: string,
  init: Parameters<typeof fetchData>[1]
): ReturnType<typeof fetchData> => {
  if (isHostDown(baseUrl)) return { ...HOST_DOWN_RESULT } as any

  const result = await fetchData(url, init)
  setHostDown(baseUrl, result.status === 408)

  return result
} // fetchUpstream

// NOTE - serverTiming: Server-Timing header (DevTools > Network > Timing), it
// tells where the time went (memory / store cache, upstream API, waiting for
// the fetch of another request)
const resEnd = (res: any, resInfo: any, serverTiming?: string) => {
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
      if (serverTiming) res.writeHeader('Server-Timing', serverTiming)
      // NOTE - uWS only accepts string / ArrayBuffer / TypedArray, a failed
      // upstream fetch (ex: 408 timeout) returns an object and would crash
      // the whole server
      res.end(
        typeof data === 'string' ||
          data instanceof ArrayBuffer ||
          ArrayBuffer.isView(data)
          ? data
          : JSON.stringify(data ?? '')
      )
    })
  }
}

const apiService = (async () => {
  let _app: {
    all: (
      pattern: RecognizedString,
      handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void>
    ) => void
  }

  const _allRequestHandler = () => {
    _app.all('/api', async function (res, req) {
      const startAt = Date.now()
      const getServerTiming = (timing: string) =>
        `${timing}, total;dur=${Date.now() - startAt}`
      res.onAborted(() => {
        res.writableEnded = true
        Console.log('Request aborted')
      })

      // NOTE - Handle the Content-Encoding
      let contentEncoding = (() => {
        const tmpHeaderAcceptEncoding = req.getHeader('accept-encoding') || ''
        if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
        else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
        return '' as 'br' | 'gzip' | ''
      })()

      // NOTE - A cached API response (GET, 200) is served from memory during
      // API_RESPONSE_CACHE_TTL: no decoding, no cache store reads / writes, no
      // parsing on every request
      const apiResponseKey =
        req.getMethod() === 'get'
          ? `${req.getUrl()}?${req.getQuery()}|${contentEncoding}`
          : undefined
      const apiResponse = apiResponseKey
        ? apiResponseCache.get(apiResponseKey)
        : undefined

      if (apiResponse)
        return resEnd(res, apiResponse, getServerTiming('cache;desc="memory"'))

      // NOTE - Get the API information
      const apiInfo =
        /requestInfo=(?<requestInfo>[^&]*)/.exec(req.getQuery())?.groups ?? {}

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
          result = decodeRequestInfo(apiInfo.requestInfo || '')
        } catch (err) {
          Console.error(err)
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
        req.forEach((key, value: any) => {
          if (value instanceof Array) {
            value.forEach((item) => {
              headers.append(key, item)
              objHeaders[key] = item
            })
          } else {
            headers.append(key, value as string)
            objHeaders[key] = value
          }
        })
        // NOTE - Setup secret key for API's header info
        const apiServerConfigInfo = ServerConfig.api.list[requestInfo.baseUrl]

        if (apiServerConfigInfo && apiServerConfigInfo.headers) {
          for (const key in apiServerConfigInfo.headers) {
            headers.append(key, apiServerConfigInfo.headers[key])
            objHeaders[key] = apiServerConfigInfo.headers[key]
          }
        }

        // NOTE - Handle query string information
        const strQueryString = (() => {
          const thisAPIQueryString = req
            .getUrl()
            .split('?')[1]
            ?.replace(/requestInfo=([^&]*)/g, '')

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
        let body = await new Promise<BodyInit | null | undefined>(
          (response) => {
            res.onData((data) => {
              response(handleArrayBuffer(data) || undefined)
            })
          }
        )

        if (apiServerConfigInfo && apiServerConfigInfo.body && body) {
          body = JSON.stringify({
            ...apiServerConfigInfo.body,
            ...JSON.parse(body as string),
          }) as BodyInit
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
          const tmpAPIStoreData = apiStore?.data

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
                      !apiCache?.cache ||
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
                contentEncoding as any
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
            result.message === HOST_DOWN_RESULT.message
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
            refreshData(requestInfo.relativeCacheKey)
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
    init(app: TemplatedApp) {
      if (!app) return Console.warn('You need provide uWebsockets app!')

      // NOTE - Handle API Lighthouse
      apiLighthouse.init(app)

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

export default apiService
