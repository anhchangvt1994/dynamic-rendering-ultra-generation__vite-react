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
import CrawlQueue from '../../../utils/CrawlQueue'
import { regexQueryStringSpecialInfoWithoutDeviceInfo } from '../../constants'
import { ISSRResult } from '../../types'
import {
  CRAWL_LIMIT,
  CRAWL_WAITING_LIMIT,
  CRAWL_WAIT_OPTIONS,
  RESOURCE_BUDGET,
  hasCrawlCapacity,
  IS_FAST_CRAWL,
} from '../CrawlProfile'
import ISRHandler from '../ISRHandler.worker'
import {
  isAvailablePointsTo,
  isPointsToRoute,
} from '../SSRGenerator.next/utils'
import { getKey } from '../Cache.worker/utils'
import CacheManager from './CacheManager.worker/utils'

const pagesPath = getPagesPath()

interface IISRGeneratorParams {
  url: string
  forceToCrawl?: boolean
  isSkipWaiting?: boolean
  onCrawlStart?: () => void
  onCrawlFinish?: () => void
}

const limitRequestToCrawl = CRAWL_LIMIT
let totalRequestsToCrawl = 0
const waitingToCrawlList = new CrawlQueue<IISRGeneratorParams>({
  max: RESOURCE_BUDGET.queueLimit,
  ttlMs: RESOURCE_BUDGET.queueTimeoutMs,
})
const limitRequestWaitingToCrawl = CRAWL_WAITING_LIMIT
let totalRequestsWaitingToCrawl = 0

const queueCrawl = (params: IISRGeneratorParams) => {
  waitingToCrawlList.set(params.url, params)
}

// NOTE - Urls being rendered right now. A waiting item of an url that is
// already rendering is dropped: forceToCrawl would remove its cache and
// restart the render from scratch
// NOTE - Kept by page cache key: the urls of a page differ by their bot /
// locale / environment info (ex: the sitemap prerender and a bot request)
const crawlingUrls = new Set<string>()
const _isCrawling = (url: string) => crawlingUrls.has(getKey(url) as string)

const _crawl = (params: Parameters<typeof ISRHandler>[0]) => {
  const key = getKey(params.url) as string
  crawlingUrls.add(key)

  return ISRHandler(params)
    .catch((error) => {
      Console.error(error.message)
      return undefined
    })
    .finally(() => crawlingUrls.delete(key))
} // _crawl

const _getRunningCrawls = () =>
  totalRequestsToCrawl + totalRequestsWaitingToCrawl

// NOTE - Running crawls (the sitemap prerender only runs while it is 0)
export const getRunningCrawlCount = () =>
  _getRunningCrawls() + waitingToCrawlList.size

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

    if (_isCrawling(nextCrawlItem.url)) continue

    totalRequestsWaitingToCrawl++

    let started = false
    let released = false
    const release = () => {
      if (released) return
      released = true
      totalRequestsWaitingToCrawl = Math.max(0, totalRequestsWaitingToCrawl - 1)
    }
    ISRGenerator({
      isSkipWaiting: true,
      forceToCrawl: true,
      ...nextCrawlItem,
      onCrawlStart: () => {
        started = true
      },
      onCrawlFinish: release,
    })
      .finally(() => {
        // Another worker may have populated this queued page in the meantime.
        if (!started) release()
      })
      .catch((error) => Console.error(error))

    // NOTE - Default profile keeps starting one waiting crawl at a time
    if (!IS_FAST_CRAWL) break
  }
} // _crawlNextWaiting

// NOTE - Fast profile: do not wait for a running crawl to finish before
// starting the waiting ones (ex: they were queued while memory was low)
setInterval(_crawlNextWaiting, 500).unref()

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
  onCrawlStart,
  onCrawlFinish,
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
                onCrawlStart?.()
                if (!ISRHandlerParams.forceToCrawl) {
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
                          onCrawlFinish?.()
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
                          onCrawlFinish?.()
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
                queueCrawl(ISRHandlerParams)
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
          !_isCrawling(ISRHandlerParams.url)
        )

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
          totalRequestsToCrawl++
        }

        if (waitingToCrawlList.has(ISRHandlerParams.url)) {
          waitingToCrawlList.delete(ISRHandlerParams.url)
        }

        const specialInfo =
          regexQueryStringSpecialInfoWithoutDeviceInfo.exec(
            ISRHandlerParams.url
          )?.groups ?? {}

        onCrawlStart?.()

        // const tmpResult: ISSRResult = await new Promise(async (res) => {
        const resultPromise = new Promise<ISSRResult>(async (res) => {
          let responseTimeout: NodeJS.Timeout | undefined
          const settle = (value: ISSRResult | undefined) => {
            if (responseTimeout) clearTimeout(responseTimeout)
            responseTimeout = undefined
            res(value)
          }
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
                  onCrawlFinish?.()
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
                  onCrawlFinish?.()
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

          if (isSkipWaiting) return settle(undefined)
          else
            responseTimeout = setTimeout(
              () => settle(undefined),
              SERVER_LESS
                ? 5000
                : BANDWIDTH_LEVEL > BANDWIDTH_LEVEL_LIST.ONE
                  ? 60000
                  : 60000
            )

          const result = await (async () => {
            return await handle
          })()

          settle(result)
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
        } else if (CRAWL_WAIT_OPTIONS.firstResponseWaitMs > 0) {
          // NOTE - A render usually ends within a few seconds, answer with the
          // page instead of a 503 when it does
          const tmpResult = await new Promise<ISSRResult | undefined>(
            (resolve, reject) => {
              const timeout = setTimeout(
                () => resolve(undefined),
                CRAWL_WAIT_OPTIONS.firstResponseWaitMs
              )
              resultPromise.then(
                (value) => {
                  clearTimeout(timeout)
                  resolve(value)
                },
                (error) => {
                  clearTimeout(timeout)
                  reject(error)
                }
              )
            }
          )
          if (tmpResult && tmpResult.status === 200) result = tmpResult
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
    queueCrawl(ISRHandlerParams)
  }

  if (!result) {
    result = await cacheManager.achieve()
    if (!result) {
      // Queued/rejected work must not create a raw placeholder. Otherwise an
      // expired queue item locks the next retry out until the 53s file lease
      // expires, even though no renderer owns that URL.
      const now = new Date()
      const maintenance = path.resolve(
        __dirname,
        '../../../../503-maintain.html'
      )
      result = {
        status: 503,
        response: maintenance,
        file: maintenance,
        createdAt: now,
        updatedAt: now,
        requestedAt: now,
        available: false,
        isInit: false,
        isRaw: true,
        ttRenderMs: 0,
      }
    }
  }

  // NOTE - A page that is queued (or rendered by another request) can also be
  // ready within CRAWL_WAIT_OPTIONS.firstResponseWaitMs: wait for its cache
  // instead of answering 503 right away
  if (
    result?.status !== 200 &&
    !isSkipWaiting &&
    !ISRHandlerParams.forceToCrawl &&
    CRAWL_WAIT_OPTIONS.firstResponseWaitMs > 0 &&
    (waitingToCrawlList.has(ISRHandlerParams.url) ||
      _isCrawling(ISRHandlerParams.url))
  ) {
    const deadline = startGenerating + CRAWL_WAIT_OPTIONS.firstResponseWaitMs

    while (Date.now() < deadline) {
      await new Promise((res) => setTimeout(res, 100))
      const tmpResult = await cacheManager.achieve()
      if (tmpResult && !tmpResult.isRaw) {
        result = tmpResult
        break
      }
    }
  }

  if (!result.response && !result.html) {
    if (result.status === 503) {
      result.response = path.resolve(__dirname, '../../../../503-maintain.html')
    }
  }

  return result
}

export default ISRGenerator
