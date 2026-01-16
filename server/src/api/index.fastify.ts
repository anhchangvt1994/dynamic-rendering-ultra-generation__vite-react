import { FastifyInstance } from 'fastify'
import { brotliCompressSync, gzipSync } from 'zlib'
import ServerConfig from '../server.config'
import Console from '../utils/ConsoleHandler'
import {
  getData as getDataCache,
  getStore as getStoreCache,
  removeData as removeDataCache,
  setData as setDataCache,
  setStore as setStoreCache,
  updateDataStatus as updateDataCacheStatus,
} from './utils/CacheManager'
import { fetchData, refreshData } from './utils/FetchManager'
import { decodeRequestInfo } from './utils/StringHelper'

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
    message?: string
  },
  contentEncoding: 'br' | 'gzip' | string | undefined
) => {
  switch (true) {
    case result.status === 200:
      return contentEncoding === 'br'
        ? brotliCompressSync(JSON.stringify(result.data))
        : contentEncoding === 'gzip'
          ? gzipSync(JSON.stringify(result.data))
          : JSON.stringify(result.data)
    default:
      return typeof result.data === 'string'
        ? result.data
        : JSON.stringify(result.data || {})
  }
} // convertData

const apiService = (async () => {
  let _app: FastifyInstance

  const _allRequestHandler = () => {
    _app.all('/api', async function (req, res) {
      const apiInfo =
        /requestInfo=(?<requestInfo>[^&]*)/.exec(req.url)?.groups ?? {}

      if (!apiInfo) return res.status(500).send('Internal Server Error')

      const requestInfo = (() => {
        let result
        try {
          result = decodeRequestInfo(apiInfo.requestInfo || '')
        } catch (err) {
          Console.error(err)
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
        return '' as 'br' | 'gzip' | ''
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
        const thisAPIQueryString = req.url
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
      let body = req.body as BodyInit | undefined | null

      if (apiServerConfigInfo && apiServerConfigInfo.body && body) {
        body = JSON.stringify({
          ...apiServerConfigInfo.body,
          ...JSON.parse(body as string),
        }) as BodyInit
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
                  }
                })
              }
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
      }

      if (requestInfo.relativeCacheKey.length) {
        refreshData(requestInfo.relativeCacheKey)
      }

      if (result.cookies && result.cookies.length) {
        res.raw.setHeader('Set-Cookie', result.cookies)
      }

      res.raw.statusMessage = result.message || res.raw.statusMessage

      res.status(result.status).send(data)
    })
  }

  return {
    init(app: FastifyInstance) {
      if (!app) return Console.warn('You need provide fastify app!')
      _app = app
      _allRequestHandler()
    },
  }
})()

export default apiService
