import {
	BANDWIDTH_LEVEL,
	BANDWIDTH_LEVEL_LIST,
	SERVER_LESS,
} from '../../constants'
import ServerConfig from '../../server.config'
import Console from '../../utils/ConsoleHandler'
import { PROCESS_ENV } from '../../utils/InitEnv'
import { DURATION_TIMEOUT } from '../constants'
import { ISSRResult } from '../types'
import CacheManager from './CacheManager.worker'
import ISRHandler from './ISRHandler.worker'

interface IISRGeneratorParams {
	url: string
	forceToCrawl?: boolean
	isSkipWaiting?: boolean
}

const limitRequestToCrawl = 3
let totalRequestsToCrawl = 0
const waitingToCrawlList = new Map<string, IISRGeneratorParams>()
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

const getRestOfDuration = (startGenerating, gapDuration = 0) => {
	if (!startGenerating) return 0

	return DURATION_TIMEOUT - gapDuration - (Date.now() - startGenerating)
} // getRestOfDuration

const SSRGenerator = async ({
	isSkipWaiting = false,
	...ISRHandlerParams
}: IISRGeneratorParams): Promise<ISSRResult> => {
	const cacheManager = CacheManager(ISRHandlerParams.url)
	if (!PROCESS_ENV.BASE_URL) {
		Console.error('Missing base url!')
		return
	}

	if (!ISRHandlerParams.url) {
		Console.error('Missing scraping url!')
		return
	}

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
		if (ServerConfig.crawl.routes[pathname]?.cache.renewTime !== 'infinite') {
			const renewTime =
				((ServerConfig.crawl.routes[pathname]?.cache.renewTime ||
					ServerConfig.crawl.custom?.(ISRHandlerParams.url)?.cache.renewTime ||
					ServerConfig.crawl.cache.renewTime) as number) * 1000

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
									ISRHandler({
										startGenerating,
										hasCache: NonNullableResult.available,
										...ISRHandlerParams,
									}).finally(() => {
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

		Console.log('Check for condition to create new page.')
		Console.log('result.available', result?.available)

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
							Console.error(err)
						}
						cacheManager.get()
					} else {
						totalRequestsToCrawl++
					}

					if (waitingToCrawlList.has(ISRHandlerParams.url)) {
						waitingToCrawlList.delete(ISRHandlerParams.url)
					}

					const tmpResult: ISSRResult = await new Promise(async (res) => {
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
								return ISRHandler({
									startGenerating,
									hasCache: NonNullableResult.available,
									...ISRHandlerParams,
								}).finally(() => {
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

					const tmpResult = await new Promise<ISSRResult>((res) => {
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

export default SSRGenerator
