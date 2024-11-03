'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
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
var _constants3 = require('../constants')

var _CacheManagerworker = require('./CacheManager.worker')
var _CacheManagerworker2 = _interopRequireDefault(_CacheManagerworker)
var _ISRHandlerworker = require('./ISRHandler.worker')
var _ISRHandlerworker2 = _interopRequireDefault(_ISRHandlerworker)

const limitRequestToCrawl = 3
let totalRequestsToCrawl = 0
const waitingToCrawlList = new Map()
const limitRequestWaitingToCrawl = 1
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

const getRestOfDuration = (startGenerating, gapDuration = 0) => {
	if (!startGenerating) return 0

	return (
		_constants3.DURATION_TIMEOUT - gapDuration - (Date.now() - startGenerating)
	)
} // getRestOfDuration

const SSRGenerator = async ({ isSkipWaiting = false, ...ISRHandlerParams }) => {
	const cacheManager = _CacheManagerworker2.default.call(
		void 0,
		ISRHandlerParams.url
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
		if (
			_optionalChain([
				_serverconfig2.default,
				'access',
				(_) => _.crawl,
				'access',
				(_2) => _2.routes,
				'access',
				(_3) => _3[pathname],
				'optionalAccess',
				(_4) => _4.cache,
				'access',
				(_5) => _5.renewTime,
			]) !== 'infinite'
		) {
			const renewTime =
				(_optionalChain([
					_serverconfig2.default,
					'access',
					(_6) => _6.crawl,
					'access',
					(_7) => _7.routes,
					'access',
					(_8) => _8[pathname],
					'optionalAccess',
					(_9) => _9.cache,
					'access',
					(_10) => _10.renewTime,
				]) ||
					_optionalChain([
						_serverconfig2.default,
						'access',
						(_11) => _11.crawl,
						'access',
						(_12) => _12.custom,
						'optionalCall',
						(_13) => _13(ISRHandlerParams.url),
						'optionalAccess',
						(_14) => _14.cache,
						'access',
						(_15) => _15.renewTime,
					]) ||
					_serverconfig2.default.crawl.cache.renewTime) * 1000

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
									totalRequestsToCrawl++
								}

								if (waitingToCrawlList.has(ISRHandlerParams.url)) {
									waitingToCrawlList.delete(ISRHandlerParams.url)
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
											url: ISRHandlerParams.url,
										}
									).finally(() => {
										if (ISRHandlerParams.forceToCrawl) {
											totalRequestsWaitingToCrawl--
										} else {
											totalRequestsToCrawl =
												totalRequestsToCrawl > certainLimitRequestToCrawl
													? totalRequestsToCrawl -
													  certainLimitRequestToCrawl -
													  1
													: totalRequestsToCrawl - 1
										}

										if (
											waitingToCrawlList.size &&
											totalRequestsWaitingToCrawl < limitRequestWaitingToCrawl
										) {
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
									})
								else
									_ISRHandlerworker2.default
										.call(void 0, {
											startGenerating,
											hasCache: NonNullableResult.available,
											...ISRHandlerParams,
										})
										.finally(() => {
											if (ISRHandlerParams.forceToCrawl) {
												totalRequestsWaitingToCrawl--
											} else {
												totalRequestsToCrawl =
													totalRequestsToCrawl > certainLimitRequestToCrawl
														? totalRequestsToCrawl -
														  certainLimitRequestToCrawl -
														  1
														: totalRequestsToCrawl - 1
											}

											if (
												waitingToCrawlList.size &&
												totalRequestsWaitingToCrawl < limitRequestWaitingToCrawl
											) {
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
										})
							} else if (!waitingToCrawlList.has(ISRHandlerParams.url)) {
								waitingToCrawlList.set(ISRHandlerParams.url, ISRHandlerParams)
							}
						})
						.finally(() => res('finish'))
				})

				result = await cacheManager.achieve()
			}
		}
	} else {
		result = await cacheManager.get()

		_ConsoleHandler2.default.log('Check for condition to create new page.')
		_ConsoleHandler2.default.log(
			'result.available',
			_optionalChain([result, 'optionalAccess', (_16) => _16.available])
		)

		if (result) {
			const NonNullableResult = result
			const isValidToScraping = NonNullableResult.isInit

			if (isValidToScraping) {
				if (
					totalRequestsToCrawl < certainLimitRequestToCrawl ||
					ISRHandlerParams.forceToCrawl
				) {
					if (ISRHandlerParams.forceToCrawl) {
						// NOTE - update create time
						try {
							await cacheManager.remove(ISRHandlerParams.url)
						} catch (err) {
							_ConsoleHandler2.default.error(err)
						}
						cacheManager.get()
					} else {
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
										totalRequestsWaitingToCrawl--
									} else {
										totalRequestsToCrawl =
											totalRequestsToCrawl > certainLimitRequestToCrawl
												? totalRequestsToCrawl - certainLimitRequestToCrawl - 1
												: totalRequestsToCrawl - 1
									}

									if (
										waitingToCrawlList.size &&
										totalRequestsWaitingToCrawl < limitRequestWaitingToCrawl
									) {
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
											totalRequestsWaitingToCrawl--
										} else {
											totalRequestsToCrawl =
												totalRequestsToCrawl > certainLimitRequestToCrawl
													? totalRequestsToCrawl -
													  certainLimitRequestToCrawl -
													  1
													: totalRequestsToCrawl - 1
										}

										if (
											waitingToCrawlList.size &&
											totalRequestsWaitingToCrawl < limitRequestWaitingToCrawl
										) {
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
				} else if (!waitingToCrawlList.has(ISRHandlerParams.url)) {
					waitingToCrawlList.set(ISRHandlerParams.url, ISRHandlerParams)
				}
			} else if (!isSkipWaiting) {
				const restOfDuration = getRestOfDuration(startGenerating, 2000)

				if (restOfDuration >= 500) {
					let waitingDuration = 0
					const followThisCache = (res) => {
						const duration =
							restOfDuration - waitingDuration < 200
								? restOfDuration - waitingDuration
								: 200

						setTimeout(async () => {
							const tmpResult = await cacheManager.get()

							if (tmpResult) {
								if (tmpResult.response && tmpResult.status === 200)
									return res(tmpResult)
								else if (tmpResult.isInit)
									res(
										SSRGenerator({
											...ISRHandlerParams,
											isSkipWaiting: false,
											forceToCrawl: true,
										})
									)
							}

							waitingDuration += duration

							if (waitingDuration === restOfDuration) res(undefined)
							else followThisCache(res)
						}, duration)
					} // followThisCache

					const tmpResult = await new Promise((res) => {
						followThisCache(res)
					})

					if (tmpResult && tmpResult.response) result = tmpResult

					if (!ISRHandlerParams.forceToCrawl) {
						totalRequestsToCrawl =
							totalRequestsToCrawl > certainLimitRequestToCrawl
								? totalRequestsToCrawl - certainLimitRequestToCrawl - 1
								: totalRequestsToCrawl - 1
					}
				}
			}
		}
	}

	return result
}

exports.default = SSRGenerator
