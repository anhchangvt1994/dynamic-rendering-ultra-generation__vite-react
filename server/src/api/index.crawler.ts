import { brotliCompressSync, brotliDecompressSync, gzipSync } from 'zlib'
import ServerConfig from '../server.config'
import Console from '../utils/ConsoleHandler'
import { PROCESS_ENV } from '../utils/InitEnv'
import { fetchData, refreshData } from './utils/FetchManager'
import { isHostDown, setHostDown } from './utils/HostHealth'
import { decodeRequestInfo } from './utils/StringHelper'
import { BROTLI_OPTIONS } from '../constants'
import { CRAWL_WAIT_OPTIONS } from '../puppeteer-ssr/utils/CrawlProfile'

const {
  compressData,
  getData: getDataCache,
  getStore: getStoreCache,
  removeData: removeDataCache,
  setData: setDataCache,
  setStore: setStoreCache,
} = PROCESS_ENV.REDIS
  ? require('./utils/CacheManager/redis/utils')
  : require('./utils/CacheManager')

const { getDataCompression } = PROCESS_ENV.REDIS
  ? require('./utils/CacheManager/redis/utils')
  : require('./utils/CacheManager/utils')


// NOTE - The compressed data must be there at once (the file cache polls a
// missing file for 7s): otherwise the render calls the upstream API
const CACHED_DATA_WAIT = 100

const _getFreshCachedResult = async (requestInfo) => {
  try {
    const apiCache = await getDataCache(requestInfo.cacheKey)
    const cache = apiCache?.cache

    if (!cache || cache.status !== 200 || apiCache.status === 'fetch') return

    const aliveTime = Date.now() - new Date(apiCache.changedAt).getTime()
    if (
      requestInfo.renewTime !== 'infinite' &&
      !(aliveTime < requestInfo.renewTime)
    )
      return

    const data = await Promise.race([
      getDataCompression(requestInfo.cacheKey, 'br'),
      new Promise<undefined>((res) => setTimeout(res, CACHED_DATA_WAIT)),
    ])

    if (!data) return

    return {
      cookies: cache.cookies,
      status: 200,
      statusMessage: cache.message,
      body: brotliDecompressSync(data),
    }
  } catch (err) {
    Console.error(err)
  }
} // _getFreshCachedResult

const convertData = (
  result: {
    status: number
    data: any
    message?: string
  },
  contentEncoding: 'br' | 'gzip' | string | undefined
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
    ? brotliCompressSync(payload, BROTLI_OPTIONS)
    : contentEncoding === 'gzip'
      ? gzipSync(payload)
      : payload
} // convertData

const apiService = async (req) => {
  const apiInfo =
    /requestInfo=(?<requestInfo>[^&]*)/.exec(req.url())?.groups ?? {}

  if (!apiInfo)
    return {
      status: 500,
      body: 'Internal Server Error',
    }

  const requestInfo = (() => {
    let result
    try {
      result = decodeRequestInfo(apiInfo.requestInfo || '')
    } catch (err) {
      Console.error(err)
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
      .url()
      .split('?')[1]
      ?.replace(/requestInfo=([^&]*)/g, '')

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
    // NOTE - undefined when the cache store is unavailable (redis down)
    const tmpAPIStoreData = apiStore?.data

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

  if (isHostDown(requestInfo.baseUrl) || isHostDown(renderDownHost))
    return {
      status: 503,
      body: '{}',
    }

  const fetchUrl = `${requestInfo.baseUrl}${requestInfo.endpoint}${strQueryString}`
  const fetchAPITarget = fetchData(fetchUrl, {
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
    () => setHostDown(renderDownHost, true),
    CRAWL_WAIT_OPTIONS.requestTimeoutMs
  )
  const result = await fetchAPITarget
  clearTimeout(slowFetchTimeout)

  setHostDown(requestInfo.baseUrl, result.status === 408)
  if (result.status !== 408) setHostDown(renderDownHost, false)

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
    refreshData(requestInfo.relativeCacheKey)
  }

  return {
    cookies: result.cookies,
    status: result.status,
    statusMessage: result.message,
    body: data,
  }
}

export default apiService
