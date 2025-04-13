'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}
function _nullishCoalesce(lhs, rhsFn) {
  if (lhs != null) {
    return lhs
  } else {
    return rhsFn()
  }
}
function _optionalChain(ops) {
  let lastAccessLHS = undefined
  let value = ops[0]
  let i = 1
  while (i < ops.length) {
    const op = ops[i]
    const fn = ops[i + 1]
    i += 2
    if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
      return undefined
    }
    if (op === 'access' || op === 'optionalAccess') {
      lastAccessLHS = value
      value = fn(value)
    } else if (op === 'call' || op === 'optionalCall') {
      value = fn((...args) => value.call(lastAccessLHS, ...args))
      lastAccessLHS = undefined
    }
  }
  return value
}

var _constants = require('../../constants')
var _serverconfig = require('../../server.config')
var _serverconfig2 = _interopRequireDefault(_serverconfig)
var _ConsoleHandler = require('../../utils/ConsoleHandler')
var _ConsoleHandler2 = _interopRequireDefault(_ConsoleHandler)
var _InitEnv = require('../../utils/InitEnv')
var _PathHandler = require('../../utils/PathHandler')

var _utils = require('./CacheManager.worker/utils')
var _utils2 = _interopRequireDefault(_utils)
var _SSRHandlerworker = require('./SSRHandler.worker')
var _SSRHandlerworker2 = _interopRequireDefault(_SSRHandlerworker)

const viewsPath = _PathHandler.getViewsPath.call(void 0)

const limitRequestToCrawl = 24
let totalRequestsToCrawl = 0
const resetTotalToCrawlTimeout = (() => {
  let timeout

  return () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      totalRequestsToCrawl = 0
      totalRequestsWaitingToCrawl = 0
    }, 10000)
  }
})()
const waitingToCrawlList = new Map()
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

const fetchData = async (input, init, reqData) => {
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

const SSRGenerator = async ({ isSkipWaiting = false, ...SSRHandlerParams }) => {
  if (!SSRHandlerParams.url.includes('&renderingInfo')) {
    SSRHandlerParams.url =
      SSRHandlerParams.url + `&renderingInfo={"type":"SSR"}`
  }

  const urlInfo = new URL(SSRHandlerParams.url)

  const routeInfo = _nullishCoalesce(
    _nullishCoalesce(
      _optionalChain([
        _serverconfig2.default,
        'access',
        (_) => _.routes,
        'access',
        (_2) => _2.list,
        'optionalAccess',
        (_3) => _3[urlInfo.pathname],
      ]),
      () =>
        _optionalChain([
          _serverconfig2.default,
          'access',
          (_4) => _4.routes,
          'access',
          (_5) => _5.custom,
          'optionalCall',
          (_6) => _6(SSRHandlerParams.url),
        ])
    ),
    () => _serverconfig2.default.routes
  )

  if (!routeInfo) return

  const routePreviewInfo = routeInfo.pointsTo || routeInfo.preview

  const urlToPreview =
    routePreviewInfo && routePreviewInfo.url
      ? `${routePreviewInfo.url}${urlInfo.search ? decodeURI(urlInfo.search) : ''}`
      : SSRHandlerParams.url

  let result

  if (
    routePreviewInfo ||
    urlToPreview.includes('renderingInfo={"type":"SSR","loader": true}')
  ) {
    const cacheManager = _utils2.default.call(void 0, urlToPreview, viewsPath)
    if (!_InitEnv.PROCESS_ENV.BASE_URL) {
      _ConsoleHandler2.default.error('Missing base url!')
      return
    }

    if (!urlToPreview) {
      _ConsoleHandler2.default.error('Missing scraping url!')
      return
    }

    const startGenerating = Date.now()

    if (
      _constants.SERVER_LESS &&
      _constants.BANDWIDTH_LEVEL === _constants.BANDWIDTH_LEVEL_LIST.TWO
    )
      fetchData(`${_InitEnv.PROCESS_ENV.BASE_URL}/cleaner-service`, {
        method: 'POST',
        headers: new Headers({
          Authorization: 'mtr-cleaner-service',
          Accept: 'application/json',
        }),
      })

    result = await cacheManager.achieve()

    const certainLimitRequestToCrawl = getCertainLimitRequestToCrawl()

    // console.log(result)
    // console.log('certainLimitRequestToCrawl: ', certainLimitRequestToCrawl)
    // console.log('totalRequestsToCrawl: ', totalRequestsToCrawl)
    // console.log('totalRequestsWaitingToCrawl: ', totalRequestsWaitingToCrawl)

    if (result && routePreviewInfo) {
      const NonNullableResult = result

      if (routePreviewInfo.renewTime !== 'infinite') {
        const renewTime = routePreviewInfo.renewTime * 1000

        if (
          Date.now() - new Date(NonNullableResult.updatedAt).getTime() >
          renewTime
        ) {
          await new Promise((res) => {
            cacheManager
              .renew()
              .then((hasRenew) => {
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
                              url: urlToPreview,
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
                          cacheManager.rename(urlToPreview)

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
                          result = await _SSRHandlerworker2.default.call(
                            void 0,
                            {
                              hasCache: NonNullableResult.available,
                              ...SSRHandlerParams,
                              url: urlToPreview,
                            }
                          )
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
                          cacheManager.rename(urlToPreview)

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
                } else if (
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

      _ConsoleHandler2.default.log('Check for condition to create new page.')
      _ConsoleHandler2.default.log(
        'result.available',
        _optionalChain([result, 'optionalAccess', (_7) => _7.available])
      )

      if (result) {
        const NonNullableResult = result
        const isValidToScraping = NonNullableResult.isInit

        if (isValidToScraping) {
          if (SSRHandlerParams.forceToCrawl) {
            // NOTE - update create time
            try {
              await cacheManager.remove(urlToPreview)
            } catch (err) {
              _ConsoleHandler2.default.error(err)
            }
            cacheManager.get()
          } else {
            resetTotalToCrawlTimeout()
            totalRequestsToCrawl++
          }

          if (waitingToCrawlList.has(urlToPreview)) {
            waitingToCrawlList.delete(urlToPreview)
          }

          if (_constants.SERVER_LESS)
            fetchData(
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
            _SSRHandlerworker2.default
              .call(void 0, {
                hasCache: NonNullableResult.available,
                ...SSRHandlerParams,
                url: urlToPreview,
              })
              .finally(() => {
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

  if (
    (!result || result.status !== 200) &&
    !urlToPreview.includes('renderingInfo={"type":"SSR","loader": true}') &&
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

exports.default = SSRGenerator
