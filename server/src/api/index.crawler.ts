import { brotliCompressSync, gzipSync } from 'zlib'
import ServerConfig from '../server.config'
import Console from '../utils/ConsoleHandler'
import { PROCESS_ENV } from '../utils/InitEnv'
import { fetchData, refreshData } from './utils/FetchManager'
import { decodeRequestInfo } from './utils/StringHelper'

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

const fetchCache = (() => {
  return (cacheKey) =>
    new Promise((res) => {
      setTimeout(async () => {
        const apiCache = await getDataCache(cacheKey)

        if (!apiCache) return res(null)

        if (
          // apiCache.status === 'ready' ||
          apiCache.cache &&
          apiCache.cache.data &&
          apiCache.cache.data !== '{}'
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
        ? brotliCompressSync(result.data)
        : contentEncoding === 'gzip'
          ? gzipSync(result.data)
          : result.data
    default:
      return typeof result.data === 'string'
        ? result.data
        : JSON.stringify(result.data || {})
  }
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
    const tmpAPIStoreData = apiStore.data

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

  const result = await fetchAPITarget
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
