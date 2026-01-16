import {
  BANDWIDTH_LEVEL,
  BANDWIDTH_LEVEL_LIST,
  SERVER_LESS,
} from '../../../constants'
import ServerConfig from '../../../server.config'
import Console from '../../../utils/ConsoleHandler'
import { PROCESS_ENV } from '../../../utils/InitEnv'
import { getViewsPath } from '../../../utils/PathHandler'
import { ISSRResult } from '../../types'
import SSRHandler from '../SSRHandler.worker'
import CacheManager from './CacheManager.worker/utils'
import { getOtherUrlsBaseOnDevice } from './utils'

const viewsPath = getViewsPath()

interface ISSRGeneratorParams {
  url: string
  forceToCrawl?: boolean
  isSkipWaiting?: boolean
}

const limitRequestToCrawl = 24
let totalRequestsToCrawl = 0
const resetTotalToCrawlTimeout = (() => {
  let timeout: NodeJS.Timeout

  return () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      totalRequestsToCrawl = 0
      totalRequestsWaitingToCrawl = 0
    }, 10000)
  }
})()
const waitingToCrawlList = new Map<string, ISSRGeneratorParams>()
const limitRequestWaitingToCrawl = 12
let totalRequestsWaitingToCrawl = 0

const getCertainLimitRequestToCrawl = (() => {
  const limitRequestToCrawlIfHasWaitingToCrawl =
    limitRequestToCrawl - limitRequestWaitingToCrawl

  return () => {
    if (waitingToCrawlList.size) return limitRequestToCrawlIfHasWaitingToCrawl

    return limitRequestToCrawl
  }
})() // getCertainLimitRequestToCrawl

const fetchData = async (
  input: RequestInfo | URL,
  init?: RequestInit | undefined,
  reqData?: { [key: string]: any }
) => {
  try {
    const params = new URLSearchParams()
    if (reqData) {
      for (const key in reqData) {
        params.append(key, reqData[key])
      }
    }

    const response = await fetch(
      input + (reqData ? `?${params.toString()}` : ''),
      init
    ).then((res) => res.text())

    const data = /^{(.|[\r\n])*?}$/.test(response) ? JSON.parse(response) : {}

    return data
  } catch (error) {
    Console.error(error)
  }
} // fetchData

const SSRGenerator = async ({
  isSkipWaiting = false,
  ...SSRHandlerParams
}: ISSRGeneratorParams): Promise<ISSRResult> => {
  if (!SSRHandlerParams.url.includes('&renderingInfo')) {
    SSRHandlerParams.url =
      SSRHandlerParams.url + `&renderingInfo={"type":"SSR"}`
  }

  const urlInfo = new URL(SSRHandlerParams.url)

  const routeInfo =
    ServerConfig.routes.list?.[urlInfo.pathname] ??
    ServerConfig.routes.custom?.(SSRHandlerParams.url) ??
    (ServerConfig.routes as any)

  if (!routeInfo) return

  const routePreviewInfo = routeInfo.pointsTo || routeInfo.preview

  let result: ISSRResult

  if (
    routePreviewInfo ||
    SSRHandlerParams.forceToCrawl ||
    SSRHandlerParams.url.includes('renderingInfo={"type":"SSR","loader": true}')
  ) {
    // NOTE - check if the BASE_URL is available
    if (!PROCESS_ENV.BASE_URL) {
      Console.error('Missing base url!')
      return
    }

    // NOTE - check if the url is available
    if (!SSRHandlerParams.url) {
      Console.error('Missing scraping url!')
      return
    }

    // NOTE - init cache manager for current url
    const cacheManager = CacheManager(SSRHandlerParams.url, viewsPath)

    // NOTE - get the true url to preview (for the point-to case)
    const urlToPreview = cacheManager.getCorrectUrl()

    const startGenerating = Date.now()

    // NOTE - check this feature is needed
    if (SERVER_LESS && BANDWIDTH_LEVEL === BANDWIDTH_LEVEL_LIST.TWO)
      fetchData(`${PROCESS_ENV.BASE_URL}/cleaner-service`, {
        method: 'POST',
        headers: new Headers({
          Authorization: 'mtr-cleaner-service',
          Accept: 'application/json',
        }),
      })

    // NOTE - quick get the cache
    result = await cacheManager.achieve()

    // NOTE - get the certain limit request to crawl, don't allow to crawl too many pages at the same time
    const certainLimitRequestToCrawl = getCertainLimitRequestToCrawl()

    // NOTE - if cache is available and not --loader
    if (result && routePreviewInfo) {
      const NonNullableResult = result

      // NOTE - check value of the renewTime
      if (routePreviewInfo.renewTime !== 'infinite') {
        const renewTime = routePreviewInfo.renewTime * 1000

        // NOTE - If renewTime is not infinite, next step check if the cache is expired
        if (
          Date.now() - new Date(NonNullableResult.updatedAt).getTime() >
          renewTime
        ) {
          // NOTE - if the cache is expired, do renew process
          await new Promise((res) => {
            cacheManager
              .renew()
              .then((hasRenew) => {
                // NOTE - does not have renew process, and valid to crawl -> renew
                if (
                  !hasRenew &&
                  (totalRequestsToCrawl < certainLimitRequestToCrawl ||
                    SSRHandlerParams.forceToCrawl)
                ) {
                  if (!SSRHandlerParams.forceToCrawl) {
                    resetTotalToCrawlTimeout()
                    totalRequestsToCrawl++
                  }

                  if (waitingToCrawlList.has(urlToPreview)) {
                    waitingToCrawlList.delete(urlToPreview)
                  }

                  if (SERVER_LESS) {
                    const renew = (() => {
                      let retryTimes = 0
                      return async () => {
                        let result
                        try {
                          result = await fetchData(
                            `${PROCESS_ENV.BASE_URL}/web-scraping`,
                            {
                              method: 'GET',
                              headers: new Headers({
                                Authorization: 'web-scraping-service',
                                Accept: 'application/json',
                                service: 'web-scraping-service',
                              }),
                            },
                            {
                              startGenerating,
                              hasCache: NonNullableResult.available,
                              url: urlToPreview,
                            }
                          )
                        } catch (err) {
                          Console.error(err)
                        }

                        if (
                          (!result || result.status !== 200) &&
                          retryTimes < 1
                        ) {
                          retryTimes++
                          renew()
                        } else {
                          cacheManager.rename()

                          if (SSRHandlerParams.forceToCrawl) {
                            totalRequestsWaitingToCrawl =
                              totalRequestsWaitingToCrawl > 0
                                ? totalRequestsWaitingToCrawl - 1
                                : 0
                          } else {
                            totalRequestsToCrawl =
                              totalRequestsToCrawl > certainLimitRequestToCrawl
                                ? totalRequestsToCrawl -
                                  certainLimitRequestToCrawl -
                                  1
                                : totalRequestsToCrawl - 1
                            totalRequestsToCrawl =
                              totalRequestsToCrawl < 0
                                ? 0
                                : totalRequestsToCrawl
                          }

                          if (
                            waitingToCrawlList.size &&
                            totalRequestsWaitingToCrawl <
                              limitRequestWaitingToCrawl
                          ) {
                            resetTotalToCrawlTimeout()
                            totalRequestsWaitingToCrawl++
                            const nextCrawlItem = waitingToCrawlList
                              .values()
                              .next().value
                            waitingToCrawlList.delete(nextCrawlItem.url)

                            SSRGenerator({
                              isSkipWaiting: true,
                              forceToCrawl: true,
                              ...nextCrawlItem,
                            })
                          }
                        }
                      }
                    })()

                    renew()
                  } else {
                    const renew = (() => {
                      let retryTimes = 0
                      return async () => {
                        let result
                        try {
                          result = await SSRHandler({
                            hasCache: NonNullableResult.available,
                            ...SSRHandlerParams,
                            url: cacheManager.getCorrectUrl(),
                          })
                        } catch (err) {
                          Console.error(err)
                        }

                        if (
                          (!result || result.status !== 200) &&
                          retryTimes < 2
                        ) {
                          retryTimes++
                          renew()
                        } else {
                          cacheManager.rename()

                          if (SSRHandlerParams.forceToCrawl) {
                            totalRequestsWaitingToCrawl =
                              totalRequestsWaitingToCrawl > 0
                                ? totalRequestsWaitingToCrawl - 1
                                : 0
                          } else {
                            totalRequestsToCrawl =
                              totalRequestsToCrawl > certainLimitRequestToCrawl
                                ? totalRequestsToCrawl -
                                  certainLimitRequestToCrawl -
                                  1
                                : totalRequestsToCrawl - 1
                            totalRequestsToCrawl =
                              totalRequestsToCrawl < 0
                                ? 0
                                : totalRequestsToCrawl
                          }

                          if (
                            waitingToCrawlList.size &&
                            totalRequestsWaitingToCrawl <
                              limitRequestWaitingToCrawl
                          ) {
                            resetTotalToCrawlTimeout()
                            totalRequestsWaitingToCrawl++
                            const nextCrawlItem = waitingToCrawlList
                              .values()
                              .next().value
                            waitingToCrawlList.delete(nextCrawlItem.url)

                            SSRGenerator({
                              isSkipWaiting: true,
                              forceToCrawl: true,
                              ...nextCrawlItem,
                            })
                          }
                        }
                      }
                    })()

                    renew()
                  }
                }
                // NOTE - does not have renew process, and invalid to crawl -> add to waiting list
                else if (
                  !hasRenew &&
                  totalRequestsToCrawl >= certainLimitRequestToCrawl &&
                  !waitingToCrawlList.has(urlToPreview)
                ) {
                  waitingToCrawlList.set(urlToPreview, SSRHandlerParams)
                }
              })
              .finally(() => res('finish'))
          })

          // NOTE - update file name after page change to renew
          result = await cacheManager.achieve()
        }
      }
    } else if (
      totalRequestsToCrawl < certainLimitRequestToCrawl ||
      SSRHandlerParams.forceToCrawl
    ) {
      result = await cacheManager.get()

      const otherUrlList = getOtherUrlsBaseOnDevice(SSRHandlerParams.url)

      if (otherUrlList && otherUrlList.length) {
        const ssrOtherUrls = otherUrlList.map((url) =>
          SSRGenerator({
            url,
            forceToCrawl: true,
          })
        )

        Promise.race(ssrOtherUrls)
      }

      Console.log('Check for condition to create new page.')
      Console.log('result.available', result?.available)

      if (result) {
        const NonNullableResult = result
        const isValidToScraping = NonNullableResult.isInit

        if (isValidToScraping) {
          if (SSRHandlerParams.forceToCrawl) {
            // NOTE - update create time
            try {
              await cacheManager.remove()
            } catch (err) {
              Console.error(err)
            }
            cacheManager.get()
          } else {
            resetTotalToCrawlTimeout()
            totalRequestsToCrawl++
          }

          if (waitingToCrawlList.has(urlToPreview)) {
            waitingToCrawlList.delete(urlToPreview)
          }

          if (SERVER_LESS)
            fetchData(
              `${PROCESS_ENV.BASE_URL}/web-scraping`,
              {
                method: 'GET',
                headers: new Headers({
                  Authorization: 'web-scraping-service',
                  Accept: 'application/json',
                  service: 'web-scraping-service',
                }),
              },
              {
                startGenerating,
                hasCache: NonNullableResult.available,
                url: urlToPreview,
              }
            ).finally(() => {
              if (SSRHandlerParams.forceToCrawl) {
                totalRequestsWaitingToCrawl =
                  totalRequestsWaitingToCrawl > 0
                    ? totalRequestsWaitingToCrawl - 1
                    : 0
              } else {
                totalRequestsToCrawl =
                  totalRequestsToCrawl > certainLimitRequestToCrawl
                    ? totalRequestsToCrawl - certainLimitRequestToCrawl - 1
                    : totalRequestsToCrawl - 1
                totalRequestsToCrawl =
                  totalRequestsToCrawl < 0 ? 0 : totalRequestsToCrawl
              }

              if (
                waitingToCrawlList.size &&
                totalRequestsWaitingToCrawl < limitRequestWaitingToCrawl
              ) {
                resetTotalToCrawlTimeout()
                resetTotalToCrawlTimeout()
                totalRequestsWaitingToCrawl++
                const nextCrawlItem = waitingToCrawlList.values().next().value
                waitingToCrawlList.delete(nextCrawlItem.url)

                SSRGenerator({
                  isSkipWaiting: true,
                  forceToCrawl: true,
                  ...nextCrawlItem,
                })
              }
            })
          else
            SSRHandler({
              hasCache: NonNullableResult.available,
              ...SSRHandlerParams,
              url: cacheManager.getCorrectUrl(),
            }).finally(() => {
              if (SSRHandlerParams.forceToCrawl) {
                totalRequestsWaitingToCrawl =
                  totalRequestsWaitingToCrawl > 0
                    ? totalRequestsWaitingToCrawl - 1
                    : 0
              } else {
                totalRequestsToCrawl =
                  totalRequestsToCrawl > certainLimitRequestToCrawl
                    ? totalRequestsToCrawl - certainLimitRequestToCrawl - 1
                    : totalRequestsToCrawl - 1
                totalRequestsToCrawl =
                  totalRequestsToCrawl < 0 ? 0 : totalRequestsToCrawl
              }

              if (
                waitingToCrawlList.size &&
                totalRequestsWaitingToCrawl < limitRequestWaitingToCrawl
              ) {
                resetTotalToCrawlTimeout()
                totalRequestsWaitingToCrawl++
                const nextCrawlItem = waitingToCrawlList.values().next().value
                waitingToCrawlList.delete(nextCrawlItem.url)

                SSRGenerator({
                  isSkipWaiting: true,
                  forceToCrawl: true,
                  ...nextCrawlItem,
                })
              }
            })
        }
      }
    } else if (
      !cacheManager.isExist() &&
      !waitingToCrawlList.has(urlToPreview)
    ) {
      waitingToCrawlList.set(urlToPreview, SSRHandlerParams)
    }
  }

  // console.log(routeInfo)

  if (
    (!result || result.status !== 200) &&
    !SSRHandlerParams.url.includes(
      'renderingInfo={"type":"SSR","loader": true}'
    ) &&
    routeInfo &&
    routeInfo.loader &&
    routeInfo.loader.enable
  ) {
    result = await SSRGenerator({
      url: SSRHandlerParams.url.replace(
        `renderingInfo={"type":"SSR"}`,
        `renderingInfo={"type":"SSR","loader": true}`
      ),
      forceToCrawl: true,
    })
  }

  return result
}

export default SSRGenerator
