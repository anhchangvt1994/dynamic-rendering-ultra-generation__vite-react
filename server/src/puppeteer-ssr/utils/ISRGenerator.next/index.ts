import path from 'path'
import {
  BANDWIDTH_LEVEL,
  BANDWIDTH_LEVEL_LIST,
  SERVER_LESS,
} from '../../../constants'
import ServerConfig from '../../../server.config'
import Console from '../../../utils/ConsoleHandler'
import { PROCESS_ENV } from '../../../utils/InitEnv'
import { getPagesPath } from '../../../utils/PathHandler'
import { regexQueryStringSpecialInfoWithoutDeviceInfo } from '../../constants'
import { ISSRResult } from '../../types'
import {
  CRAWL_LIMIT,
  CRAWL_WAITING_LIMIT,
  hasCrawlCapacity,
  IS_FAST_CRAWL,
} from '../CrawlProfile'
import ISRHandler from '../ISRHandler.worker'
import {
  isAvailablePointsTo,
  isPointsToRoute,
} from '../SSRGenerator.next/utils'
import CacheManager from './CacheManager.worker/utils'

const pagesPath = getPagesPath()

interface IISRGeneratorParams {
  url: string
  forceToCrawl?: boolean
  isSkipWaiting?: boolean
}

const limitRequestToCrawl = CRAWL_LIMIT
let totalRequestsToCrawl = 0
const resetTotalToCrawlTimeout = (() => {
  let timeout: NodeJS.Timeout

  return () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      totalRequestsToCrawl = 0
      totalRequestsWaitingToCrawl = 0
    }, 20000)
  }
})()
const waitingToCrawlList = new Map<string, IISRGeneratorParams>()
const limitRequestWaitingToCrawl = CRAWL_WAITING_LIMIT
let totalRequestsWaitingToCrawl = 0

// NOTE - Urls being rendered right now. A waiting item of an url that is
// already rendering is dropped: forceToCrawl would remove its cache and
// restart the render from scratch
const crawlingUrls = new Set<string>()

const _crawl = (params: Parameters<typeof ISRHandler>[0]) => {
  crawlingUrls.add(params.url)

  return ISRHandler(params).finally(() => crawlingUrls.delete(params.url))
} // _crawl

const _getRunningCrawls = () =>
  totalRequestsToCrawl + totalRequestsWaitingToCrawl

// NOTE - Start crawls from the waiting list while the limit and the
// resources allow it
const _crawlNextWaiting = () => {
  while (
    waitingToCrawlList.size &&
    totalRequestsWaitingToCrawl < limitRequestWaitingToCrawl &&
    hasCrawlCapacity(_getRunningCrawls())
  ) {
    const nextCrawlItem = waitingToCrawlList.values().next().value
    waitingToCrawlList.delete(nextCrawlItem.url)

    if (crawlingUrls.has(nextCrawlItem.url)) continue

    resetTotalToCrawlTimeout()
    totalRequestsWaitingToCrawl++

    ISRGenerator({
      isSkipWaiting: true,
      forceToCrawl: true,
      ...nextCrawlItem,
    })

    // NOTE - Default profile keeps starting one waiting crawl at a time
    if (!IS_FAST_CRAWL) break
  }
} // _crawlNextWaiting

// NOTE - Fast profile: do not wait for a running crawl to finish before
// starting the waiting ones (ex: they were queued while memory was low)
if (IS_FAST_CRAWL) setInterval(_crawlNextWaiting, 500).unref()

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

const ISRGenerator = async ({
  isSkipWaiting = false,
  ...ISRHandlerParams
}: IISRGeneratorParams): Promise<ISSRResult> => {
  if (!ISRHandlerParams.url.includes('&renderingInfo')) {
    ISRHandlerParams.url =
      ISRHandlerParams.url + `&renderingInfo={"type":"ISR"}`
  }

  const cacheManager = CacheManager(ISRHandlerParams.url, pagesPath)
  if (!PROCESS_ENV.BASE_URL) {
    Console.error('Missing base url!')
    return
  }

  if (!ISRHandlerParams.url) {
    Console.error('Missing scraping url!')
    return
  }

  const isAvailableToCrawl =
    !isPointsToRoute(ISRHandlerParams.url) ||
    (await isAvailablePointsTo(ISRHandlerParams.url))

  const startGenerating = Date.now()

  if (SERVER_LESS && BANDWIDTH_LEVEL === BANDWIDTH_LEVEL_LIST.TWO)
    fetchData(`${PROCESS_ENV.BASE_URL}/cleaner-service`, {
      method: 'POST',
      headers: new Headers({
        Authorization: 'mtr-cleaner-service',
        Accept: 'application/json',
      }),
    })

  let result: ISSRResult
  result = await cacheManager.achieve()

  const certainLimitRequestToCrawl = getCertainLimitRequestToCrawl()

  // console.log(result)
  // console.log('certainLimitRequestToCrawl: ', certainLimitRequestToCrawl)
  // console.log('totalRequestsToCrawl: ', totalRequestsToCrawl)
  // console.log('totalRequestsWaitingToCrawl: ', totalRequestsWaitingToCrawl)

  if (result) {
    const NonNullableResult = result
    const pathname = new URL(ISRHandlerParams.url).pathname

    const cacheOption = (
      ServerConfig.crawl.custom?.(ISRHandlerParams.url) ??
      ServerConfig.crawl.routes[pathname] ??
      ServerConfig.crawl
    ).cache

    if (cacheOption.renewTime !== 'infinite') {
      const renewTime = cacheOption.renewTime * 1000

      if (
        Date.now() - new Date(NonNullableResult.updatedAt).getTime() >
          renewTime &&
        isAvailableToCrawl
      ) {
        await new Promise((res) => {
          cacheManager
            .renew()
            .then((hasRenew) => {
              if (
                !hasRenew &&
                // NOTE - A crawl from the waiting list was already admitted
                (ISRHandlerParams.forceToCrawl ||
                  (totalRequestsToCrawl < certainLimitRequestToCrawl &&
                    hasCrawlCapacity(_getRunningCrawls())))
              ) {
                if (!ISRHandlerParams.forceToCrawl) {
                  resetTotalToCrawlTimeout()
                  totalRequestsToCrawl++
                }

                if (waitingToCrawlList.has(ISRHandlerParams.url)) {
                  waitingToCrawlList.delete(ISRHandlerParams.url)
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
                            url: ISRHandlerParams.url,
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

                        if (ISRHandlerParams.forceToCrawl) {
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
                            totalRequestsToCrawl < 0 ? 0 : totalRequestsToCrawl
                        }

                        _crawlNextWaiting()
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
                        result = await _crawl({
                          startGenerating,
                          hasCache: NonNullableResult.available,
                          ...ISRHandlerParams,
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

                        if (ISRHandlerParams.forceToCrawl) {
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
                            totalRequestsToCrawl < 0 ? 0 : totalRequestsToCrawl
                        }

                        _crawlNextWaiting()
                      }
                    }
                  })()

                  renew()
                }
              } else if (
                !hasRenew &&
                (totalRequestsToCrawl >= certainLimitRequestToCrawl ||
                  !hasCrawlCapacity(_getRunningCrawls())) &&
                !waitingToCrawlList.has(ISRHandlerParams.url)
              ) {
                waitingToCrawlList.set(ISRHandlerParams.url, ISRHandlerParams)
              }
            })
            .finally(() => res('finish'))
        })

        // NOTE - update file name after page change to renew
        result = await cacheManager.achieve()
      }
    }
  } else if (
    // NOTE - A crawl from the waiting list was already admitted
    (ISRHandlerParams.forceToCrawl ||
      (totalRequestsToCrawl < certainLimitRequestToCrawl &&
        hasCrawlCapacity(_getRunningCrawls()))) &&
    isAvailableToCrawl
  ) {
    result = await cacheManager.get()

    Console.log('Check for condition to create new page.')
    Console.log('result.available', result?.available)

    if (result) {
      const NonNullableResult = result
      // NOTE - A crawl from the waiting list runs when the page has no
      // content yet: the empty file created while it was queued is not "init"
      // before 53s, which delayed it until then
      const isValidToScraping =
        NonNullableResult.isInit ||
        Boolean(
          ISRHandlerParams.forceToCrawl &&
          !NonNullableResult.available &&
          !crawlingUrls.has(ISRHandlerParams.url)
        )

      // NOTE - A crawl from the waiting list that does not run frees its slot
      if (ISRHandlerParams.forceToCrawl && !isValidToScraping)
        totalRequestsWaitingToCrawl =
          totalRequestsWaitingToCrawl > 0 ? totalRequestsWaitingToCrawl - 1 : 0

      if (isValidToScraping) {
        if (ISRHandlerParams.forceToCrawl) {
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

        if (waitingToCrawlList.has(ISRHandlerParams.url)) {
          waitingToCrawlList.delete(ISRHandlerParams.url)
        }

        const specialInfo =
          regexQueryStringSpecialInfoWithoutDeviceInfo.exec(
            ISRHandlerParams.url
          )?.groups ?? {}

        // const tmpResult: ISSRResult = await new Promise(async (res) => {
        const resultPromise = new Promise<ISSRResult>(async (res) => {
          const handle = (() => {
            if (SERVER_LESS)
              return fetchData(
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
                  url: ISRHandlerParams.url,
                }
              ).finally(() => {
                if (ISRHandlerParams.forceToCrawl) {
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

                _crawlNextWaiting()
              })
            else
              return _crawl({
                startGenerating,
                hasCache: NonNullableResult.available,
                ...ISRHandlerParams,
              }).finally(() => {
                if (ISRHandlerParams.forceToCrawl) {
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

                _crawlNextWaiting()
              })
          })()

          if (isSkipWaiting) return res(undefined)
          else
            setTimeout(
              res,
              SERVER_LESS
                ? 5000
                : BANDWIDTH_LEVEL > BANDWIDTH_LEVEL_LIST.ONE
                  ? 60000
                  : 60000
            )

          const result = await (async () => {
            return await handle
          })()

          res(result)
        })

        const botInfo = specialInfo.botInfo
          ? JSON.parse(specialInfo.botInfo)
          : {}

        if (botInfo['name'] === 'sitemap-crawler') {
          const tmpResult = await resultPromise
          if (tmpResult && tmpResult.status) result = tmpResult
          else {
            const tmpResult = await cacheManager.achieve()
            result = tmpResult || result
          }
        }
      }
      // NOTE - Uncomment this logic if you need the second bot waiting for the first bot result
      // else if (!isSkipWaiting) {
      // const restOfDuration = getRestOfDuration(startGenerating, 2000)
      // if (restOfDuration >= 500) {
      // 	let waitingDuration = 0
      // 	const followThisCache = (res) => {
      // 		const duration =
      // 			restOfDuration - waitingDuration < 200
      // 				? restOfDuration - waitingDuration
      // 				: 200
      // 		setTimeout(async () => {
      // 			const tmpResult = await cacheManager.get()
      // 			if (tmpResult) {
      // 				if (tmpResult.response && tmpResult.status === 200)
      // 					return res(tmpResult)
      // 				else if (tmpResult.isInit)
      // 					res(
      // 						ISRGenerator({
      // 							...ISRHandlerParams,
      // 							isSkipWaiting: false,
      // 							forceToCrawl: true,
      // 						})
      // 					)
      // 			}
      // 			waitingDuration += duration
      // 			if (waitingDuration === restOfDuration) res(undefined)
      // 			else followThisCache(res)
      // 		}, duration)
      // 	} // followThisCache
      // 	const tmpResult = await new Promise<ISSRResult>((res) => {
      // 		followThisCache(res)
      // 	})
      // 	if (tmpResult && tmpResult.response) result = tmpResult
      // 	if (!ISRHandlerParams.forceToCrawl) {
      // 		totalRequestsToCrawl =
      // 			totalRequestsToCrawl > certainLimitRequestToCrawl
      // 				? totalRequestsToCrawl - certainLimitRequestToCrawl - 1
      // 				: totalRequestsToCrawl - 1
      // 	}
      // }
      // }
    }
  } else if (
    !cacheManager.isExist() &&
    !waitingToCrawlList.has(ISRHandlerParams.url) &&
    isAvailableToCrawl
  ) {
    waitingToCrawlList.set(ISRHandlerParams.url, ISRHandlerParams)
  }

  if (!result) {
    result = await cacheManager.get()
  }

  if (!result.response && !result.html) {
    if (result.status === 503) {
      result.response = path.resolve(__dirname, '../../../../503-maintain.html')
    }
  }

  return result
}

export default ISRGenerator
