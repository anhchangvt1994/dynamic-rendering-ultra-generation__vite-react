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
var _ISRHandlerworker = require('./ISRHandler.worker')
var _ISRHandlerworker2 = _interopRequireDefault(_ISRHandlerworker)

const pagesPath = _PathHandler.getPagesPath.call(void 0)

const limitRequestToCrawl = _serverconfig2.default.crawl.limit
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
const limitRequestWaitingToCrawl =
	_serverconfig2.default.crawl.limit === 4 ? 2 : 1
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

const ISRGenerator = async ({ isSkipWaiting = false, ...ISRHandlerParams }) => {
	const cacheManager = _utils2.default.call(
		void 0,
		ISRHandlerParams.url,
		pagesPath
	)
	if (!_InitEnv.PROCESS_ENV.BASE_URL) {
		_ConsoleHandler2.default.error('Missing base url!')
		return
	}

	if (!ISRHandlerParams.url) {
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

		const cacheOption = _nullishCoalesce(
			_nullishCoalesce(
				_optionalChain([
					_serverconfig2.default,
					'access',
					(_) => _.crawl,
					'access',
					(_2) => _2.custom,
					'optionalCall',
					(_3) => _3(ISRHandlerParams.url),
				]),
				() => _serverconfig2.default.crawl.routes[pathname]
			),
			() => _serverconfig2.default.crawl
		).cache

		if (cacheOption.renewTime !== 'infinite') {
			const renewTime = cacheOption.renewTime * 1000

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
									ISRHandlerParams.forceToCrawl)
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
												cacheManager.rename(ISRHandlerParams.url)

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

													ISRGenerator({
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
												result = await _ISRHandlerworker2.default.call(void 0, {
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
												cacheManager.rename(ISRHandlerParams.url)

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

													ISRGenerator({
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
		totalRequestsToCrawl < certainLimitRequestToCrawl ||
		ISRHandlerParams.forceToCrawl
	) {
		result = await cacheManager.get()

		_ConsoleHandler2.default.log('Check for condition to create new page.')
		_ConsoleHandler2.default.log(
			'result.available',
			_optionalChain([result, 'optionalAccess', (_4) => _4.available])
		)

		if (result) {
			const NonNullableResult = result
			const isValidToScraping = NonNullableResult.isInit

			if (isValidToScraping) {
				if (ISRHandlerParams.forceToCrawl) {
					// NOTE - update create time
					try {
						await cacheManager.remove(ISRHandlerParams.url)
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

				const tmpResult = await new Promise(async (res) => {
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

								if (
									waitingToCrawlList.size &&
									totalRequestsWaitingToCrawl < limitRequestWaitingToCrawl
								) {
									resetTotalToCrawlTimeout()
									resetTotalToCrawlTimeout()
									totalRequestsWaitingToCrawl++
									const nextCrawlItem = waitingToCrawlList.values().next().value
									waitingToCrawlList.delete(nextCrawlItem.url)

									ISRGenerator({
										isSkipWaiting: true,
										forceToCrawl: true,
										...nextCrawlItem,
									})
								}
							})
						else
							return _ISRHandlerworker2.default
								.call(void 0, {
									startGenerating,
									hasCache: NonNullableResult.available,
									...ISRHandlerParams,
								})
								.finally(() => {
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

									if (
										waitingToCrawlList.size &&
										totalRequestsWaitingToCrawl < limitRequestWaitingToCrawl
									) {
										resetTotalToCrawlTimeout()
										totalRequestsWaitingToCrawl++
										const nextCrawlItem = waitingToCrawlList
											.values()
											.next().value
										waitingToCrawlList.delete(nextCrawlItem.url)

										ISRGenerator({
											isSkipWaiting: true,
											forceToCrawl: true,
											...nextCrawlItem,
										})
									}
								})
					})()

					if (isSkipWaiting) return res(undefined)
					else
						setTimeout(
							res,
							_constants.SERVER_LESS
								? 5000
								: _constants.BANDWIDTH_LEVEL >
								  _constants.BANDWIDTH_LEVEL_LIST.ONE
								? 60000
								: 60000
						)

					const result = await (async () => {
						return await handle
					})()

					res(result)
				})

				if (tmpResult && tmpResult.status) result = tmpResult
				else {
					const tmpResult = await cacheManager.achieve()
					result = tmpResult || result
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
		!waitingToCrawlList.has(ISRHandlerParams.url)
	) {
		waitingToCrawlList.set(ISRHandlerParams.url, ISRHandlerParams)
	}

	return result
}

exports.default = ISRGenerator
