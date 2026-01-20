import {
  HttpRequest,
  HttpResponse,
  RecognizedString,
  TemplatedApp,
} from 'uWebSockets.js'
import { brotliCompressSync, gzipSync } from 'zlib'
import ServerConfig from '../server.config'
import Console from '../utils/ConsoleHandler'
import apiLighthouse from './routes/lighthouse/index.uws'
import { compressData } from './utils/CacheManager'
import {
  getData as getDataCache,
  getStore as getStoreCache,
  removeData as removeDataCache,
  setData as setDataCache,
  setDataCompression,
  setStore as setStoreCache,
  updateDataStatus as updateDataCacheStatus,
} from './utils/CacheManager/utils'
import { fetchData, refreshData } from './utils/FetchManager'
import { decodeRequestInfo } from './utils/StringHelper'

const handleArrayBuffer = (message: ArrayBuffer | string) => {
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
        const apiCache = await getDataCache(cacheKey)

        if (!apiCache) return res(null)

        if (
          apiCache.status === 'ready' ||
          (apiCache.cache &&
            apiCache.cache.data &&
            JSON.stringify(apiCache.cache.data) !== '{}')
        )
          res(apiCache.cache)
        else {
          const tmpCache = await fetchCache(cacheKey)
          res(tmpCache)
        }
      }, 10)
    })
})() // fetchCache

const convertData = (
  result: {
    status: number
    data: any
    compressData: any
    cookies?: string[]
    message?: string
  },
  contentEncoding: 'br' | 'gzip' | string | undefined
) => {
  switch (true) {
    case result.status === 200:
      return contentEncoding === 'br'
        ? (result.compressData?.br ??
            brotliCompressSync(JSON.stringify(result.data)))
        : contentEncoding === 'gzip'
          ? (result.compressData?.gzip ?? gzipSync(JSON.stringify(result.data)))
          : JSON.stringify(result.data)
    default:
      return typeof result.data === 'string'
        ? result.data
        : JSON.stringify(result.data || {})
  }
} // convertData

const apiService = (async () => {
  let _app: {
    all: (
      pattern: RecognizedString,
      handler: (res: HttpResponse, req: HttpRequest) => void | Promise<void>
    ) => void
  }

  const _allRequestHandler = () => {
    _app.all('/api', async function (res, req) {
      res.onAborted(() => {
        res.writableEnded = true
        Console.log('Request aborted')
      })

      // NOTE - Handle the Content-Encoding
      const contentEncoding = (() => {
        const tmpHeaderAcceptEncoding = req.getHeader('accept-encoding') || ''
        if (tmpHeaderAcceptEncoding.indexOf('br') !== -1) return 'br'
        else if (tmpHeaderAcceptEncoding.indexOf('gzip') !== -1) return 'gzip'
        return '' as 'br' | 'gzip' | ''
      })()

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
          .end('Internal Server Error', true)
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
          .end('Internal Server Error', true)
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
          const tmpAPIStoreData = apiStore.data

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
              if (
                ((requestInfo.renewTime !== 'infinite' &&
                  curTime - new Date(apiCache.modifiedAt).getTime() >=
                    requestInfo.renewTime) ||
                  !apiCache.cache ||
                  apiCache.cache.status !== 200) &&
                apiCache.status !== 'fetch'
              ) {
                const apiCache = await getDataCache(requestInfo.cacheKey)

                if (!apiCache || apiCache.status !== 'fetch') {
                  updateDataCacheStatus(requestInfo.cacheKey, 'fetch')

                  const fetchUrl = `${requestInfo.baseUrl}${requestInfo.endpoint}${strQueryString}`

                  fetchData(fetchUrl, {
                    method,
                    headers: objHeaders,
                    body,
                  }).then((result) => {
                    const enableToSetCache =
                      result.status === 200 ||
                      !apiCache.cache ||
                      apiCache.cache.status !== 200
                    if (enableToSetCache) {
                      setDataCache(requestInfo.cacheKey, {
                        url: fetchUrl,
                        method,
                        body,
                        headers: objHeaders,
                        cache: {
                          expiredTime: requestInfo.expiredTime,
                          ...result,
                        },
                      })

                      compressData(result.data)
                        .then((data) => {
                          for (const compression in data) {
                            if (data[compression]) {
                              setDataCompression(
                                requestInfo.cacheKey,
                                data[compression],
                                compression as any
                              )
                            }
                          }
                        })
                        .catch((err) => Console.error(err))
                    }
                  })
                }
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

          const fetchAPITarget = fetchData(fetchUrl, {
            method,
            headers: objHeaders,
            body,
          })

          if (enableCache) {
            setDataCache(requestInfo.cacheKey, '', {
              isCompress: true,
              status: 'fetch',
            })
          } else removeDataCache(requestInfo.cacheKey)

          const result = await fetchAPITarget

          const data = convertData(result, contentEncoding)

          if (enableCache) {
            setDataCache(requestInfo.cacheKey, {
              url: fetchUrl,
              method,
              body,
              headers: objHeaders,
              cache: {
                expiredTime: requestInfo.expiredTime,
                ...result,
              },
            })

            compressData(result.data)
              .then((data) => {
                for (const compression in data) {
                  if (data[compression]) {
                    setDataCompression(
                      requestInfo.cacheKey,
                      data[compression],
                      compression as any
                    )
                  }
                }
              })
              .catch((err) => Console.error(err))
          }

          if (requestInfo.relativeCacheKey.length) {
            refreshData(requestInfo.relativeCacheKey)
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
              Console.error(err)
            }
          }
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
