"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var _path = require('path'); var _path2 = _interopRequireDefault(_path);




var _constants = require('../../../constants');
var _serverconfig = require('../../../server.config'); var _serverconfig2 = _interopRequireDefault(_serverconfig);
var _ConsoleHandler = require('../../../utils/ConsoleHandler'); var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler);
var _InitEnv = require('../../../utils/InitEnv');
var _PathHandler = require('../../../utils/PathHandler');
var _constants3 = require('../../constants');







var _CrawlProfile = require('../CrawlProfile');
var _ISRHandlerworker = require('../ISRHandler.worker'); var _ISRHandlerworker2 = _interopRequireDefault(_ISRHandlerworker);



var _utils = require('../SSRGenerator.next/utils');
var _utils3 = require('../Cache.worker/utils');
var _utils5 = require('./CacheManager.worker/utils'); var _utils6 = _interopRequireDefault(_utils5);

const pagesPath = _PathHandler.getPagesPath.call(void 0, )







const limitRequestToCrawl = _CrawlProfile.CRAWL_LIMIT
let totalRequestsToCrawl = 0
const resetTotalToCrawlTimeout = (() => {
  let timeout

  return () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      totalRequestsToCrawl = 0
      totalRequestsWaitingToCrawl = 0
    }, 20000)
  }
})()
const waitingToCrawlList = new Map()
const limitRequestWaitingToCrawl = _CrawlProfile.CRAWL_WAITING_LIMIT
let totalRequestsWaitingToCrawl = 0

// NOTE - Urls being rendered right now. A waiting item of an url that is
// already rendering is dropped: forceToCrawl would remove its cache and
// restart the render from scratch
// NOTE - Kept by page cache key: the urls of a page differ by their bot /
// locale / environment info (ex: the sitemap prerender and a bot request)
const crawlingUrls = new Set()
const _isCrawling = (url) => crawlingUrls.has(_utils3.getKey.call(void 0, url) )

const _crawl = (params) => {
  const key = _utils3.getKey.call(void 0, params.url) 
  crawlingUrls.add(key)

  return _ISRHandlerworker2.default.call(void 0, params).finally(() => crawlingUrls.delete(key))
} // _crawl

const _getRunningCrawls = () =>
  totalRequestsToCrawl + totalRequestsWaitingToCrawl

// NOTE - Running crawls (the sitemap prerender only runs while it is 0)
 const getRunningCrawlCount = () =>
  _getRunningCrawls() + waitingToCrawlList.size; exports.getRunningCrawlCount = getRunningCrawlCount

// NOTE - Start crawls from the waiting list while the limit and the
// resources allow it
const _crawlNextWaiting = () => {
  while (
    waitingToCrawlList.size &&
    totalRequestsWaitingToCrawl < limitRequestWaitingToCrawl &&
    _CrawlProfile.hasCrawlCapacity.call(void 0, _getRunningCrawls())
  ) {
    const nextCrawlItem = waitingToCrawlList.values().next().value
    waitingToCrawlList.delete(nextCrawlItem.url)

    if (_isCrawling(nextCrawlItem.url)) continue

    resetTotalToCrawlTimeout()
    totalRequestsWaitingToCrawl++

    ISRGenerator({
      isSkipWaiting: true,
      forceToCrawl: true,
      ...nextCrawlItem,
    })

    // NOTE - Default profile keeps starting one waiting crawl at a time
    if (!_CrawlProfile.IS_FAST_CRAWL) break
  }
} // _crawlNextWaiting

// NOTE - Fast profile: do not wait for a running crawl to finish before
// starting the waiting ones (ex: they were queued while memory was low)
if (_CrawlProfile.IS_FAST_CRAWL) setInterval(_crawlNextWaiting, 500).unref()

const getCertainLimitRequestToCrawl = (() => {
  const limitRequestToCrawlIfHasWaitingToCrawl =
    limitRequestToCrawl - limitRequestWaitingToCrawl

  return () => {
    if (waitingToCrawlList.size) return limitRequestToCrawlIfHasWaitingToCrawl

    return limitRequestToCrawl
  }
})() // getCertainLimitRequestToCrawl

const fetchData = async (
  input,
  init,
  reqData
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
    _ConsoleHandler2.default.error(error)
  }
} // fetchData

const ISRGenerator = async ({
  isSkipWaiting = false,
  ...ISRHandlerParams
}) => {
  if (!ISRHandlerParams.url.includes('&renderingInfo')) {
    ISRHandlerParams.url =
      ISRHandlerParams.url + `&renderingInfo={"type":"ISR"}`
  }

  const cacheManager = _utils6.default.call(void 0, ISRHandlerParams.url, pagesPath)
  if (!_InitEnv.PROCESS_ENV.BASE_URL) {
    _ConsoleHandler2.default.error('Missing base url!')
    return
  }

  if (!ISRHandlerParams.url) {
    _ConsoleHandler2.default.error('Missing scraping url!')
    return
  }

  const isAvailableToCrawl =
    !_utils.isPointsToRoute.call(void 0, ISRHandlerParams.url) ||
    (await _utils.isAvailablePointsTo.call(void 0, ISRHandlerParams.url))

  const startGenerating = Date.now()

  if (_constants.SERVER_LESS && _constants.BANDWIDTH_LEVEL === _constants.BANDWIDTH_LEVEL_LIST.TWO)
    fetchData(`${_InitEnv.PROCESS_ENV.BASE_URL}/cleaner-service`, {
      method: 'POST',
      headers: new Headers({
        Authorization: 'mtr-cleaner-service',
        Accept: 'application/json',
      }),
    })

  let result
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
      _nullishCoalesce(_nullishCoalesce(_optionalChain([_serverconfig2.default, 'access', _ => _.crawl, 'access', _2 => _2.custom, 'optionalCall', _3 => _3(ISRHandlerParams.url)]), () => (
      _serverconfig2.default.crawl.routes[pathname])), () => (
      _serverconfig2.default.crawl))
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
                    _CrawlProfile.hasCrawlCapacity.call(void 0, _getRunningCrawls())))
              ) {
                if (!ISRHandlerParams.forceToCrawl) {
                  resetTotalToCrawlTimeout()
                  totalRequestsToCrawl++
                }

                if (waitingToCrawlList.has(ISRHandlerParams.url)) {
                  waitingToCrawlList.delete(ISRHandlerParams.url)
                }

                if (_constants.SERVER_LESS) {
                  const renew = (() => {
                    let retryTimes = 0
                    return async () => {
                      let result
                      try {
                        result = await fetchData(
                          `${_InitEnv.PROCESS_ENV.BASE_URL}/web-scraping`,
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
                        _ConsoleHandler2.default.error(err)
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
                        _ConsoleHandler2.default.error(err)
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
                  !_CrawlProfile.hasCrawlCapacity.call(void 0, _getRunningCrawls())) &&
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
        _CrawlProfile.hasCrawlCapacity.call(void 0, _getRunningCrawls()))) &&
    isAvailableToCrawl
  ) {
    result = await cacheManager.get()

    _ConsoleHandler2.default.log('Check for condition to create new page.')
    _ConsoleHandler2.default.log('result.available', _optionalChain([result, 'optionalAccess', _4 => _4.available]))

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
            _ConsoleHandler2.default.error(err)
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
          _nullishCoalesce(_optionalChain([_constants3.regexQueryStringSpecialInfoWithoutDeviceInfo, 'access', _5 => _5.exec, 'call', _6 => _6(
            ISRHandlerParams.url
          ), 'optionalAccess', _7 => _7.groups]), () => ( {}))

        // const tmpResult: ISSRResult = await new Promise(async (res) => {
        const resultPromise = new Promise(async (res) => {
          const handle = (() => {
            if (_constants.SERVER_LESS)
              return fetchData(
                `${_InitEnv.PROCESS_ENV.BASE_URL}/web-scraping`,
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
              _constants.SERVER_LESS
                ? 5000
                : _constants.BANDWIDTH_LEVEL > _constants.BANDWIDTH_LEVEL_LIST.ONE
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
        } else if (_CrawlProfile.CRAWL_WAIT_OPTIONS.firstResponseWaitMs > 0) {
          // NOTE - A render usually ends within a few seconds, answer with the
          // page instead of a 503 when it does
          const tmpResult = await Promise.race([
            resultPromise,
            new Promise((res) =>
              setTimeout(res, _CrawlProfile.CRAWL_WAIT_OPTIONS.firstResponseWaitMs)
            ),
          ])
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
    waitingToCrawlList.set(ISRHandlerParams.url, ISRHandlerParams)
  }

  if (!result) {
    result = await cacheManager.get()
  }

  // NOTE - A page that is queued (or rendered by another request) can also be
  // ready within CRAWL_WAIT_OPTIONS.firstResponseWaitMs: wait for its cache
  // instead of answering 503 right away
  if (
    _optionalChain([result, 'optionalAccess', _8 => _8.status]) !== 200 &&
    !isSkipWaiting &&
    !ISRHandlerParams.forceToCrawl &&
    _CrawlProfile.CRAWL_WAIT_OPTIONS.firstResponseWaitMs > 0 &&
    (waitingToCrawlList.has(ISRHandlerParams.url) ||
      _isCrawling(ISRHandlerParams.url))
  ) {
    const deadline = startGenerating + _CrawlProfile.CRAWL_WAIT_OPTIONS.firstResponseWaitMs

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
      result.response = _path2.default.resolve(__dirname, '../../../../503-maintain.html')
    }
  }

  return result
}

exports. default = ISRGenerator
